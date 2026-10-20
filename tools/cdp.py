"""A small headless-Chrome driver over the DevTools protocol, shared by tools/test.py and tools/walk.py.

Needs Chrome (Chrome for Testing by default, or whatever CHROME points to) and the Python
websocket-client package.
"""
import json, os, shutil, subprocess, tempfile, threading, time, urllib.request
from base64 import b64decode
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import websocket

CHROME = os.environ.get("CHROME", str(Path.home() / ".local/opt/google/chrome-linux64/chrome"))


def serve(root):
    """Serve a folder on a free local port in a background thread; returns the base URL."""
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(root)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{httpd.server_address[1]}"


class Page:
    def __init__(self, w=1440, h=900, mobile=False, dark=False):
        self.prof = tempfile.mkdtemp(prefix="translit-cdp-")
        self.chrome = subprocess.Popen(
            [CHROME, "--headless=new", "--no-sandbox", "--hide-scrollbars", "--mute-audio",
             "--remote-allow-origins=*", "--remote-debugging-port=0", f"--user-data-dir={self.prof}", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        pf = Path(self.prof) / "DevToolsActivePort"
        for _ in range(150):
            if pf.exists() and pf.read_text().strip():
                break
            time.sleep(0.1)
        port = pf.read_text().split()[0]
        pages = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
        self.ws = websocket.create_connection(next(p for p in pages if p["type"] == "page")["webSocketDebuggerUrl"])
        self.n = 0
        self.problems, self.logs = [], []
        for d in ("Page", "Runtime", "Log"):
            self.call(f"{d}.enable")
        self.size(w, h, mobile)
        self.scheme(dark)

    def size(self, w, h, mobile=False):
        self.w, self.h = w, h
        self.call("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=2 if mobile else 1,
                  mobile=mobile)
        self.call("Emulation.setTouchEmulationEnabled", enabled=mobile, maxTouchPoints=5)

    def scheme(self, dark):
        self.call("Emulation.setEmulatedMedia",
                  features=[{"name": "prefers-color-scheme", "value": "dark" if dark else "light"}])

    def call(self, method, **params):
        self.n += 1
        i = self.n
        self.ws.send(json.dumps({"id": i, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            self.note(m)
            if m.get("id") == i:
                if "error" in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})

    def note(self, m):
        p = m.get("params", {})
        meth = m.get("method")
        if meth == "Runtime.exceptionThrown":
            d = p["exceptionDetails"]
            self.problems.append(d.get("exception", {}).get("description") or d.get("text"))
        elif meth == "Runtime.consoleAPICalled":
            text = " ".join(str(a.get("value", a.get("description", ""))) for a in p["args"])
            (self.problems if p.get("type") == "error" else self.logs).append(f"{p.get('type')}: {text}")
        elif meth == "Log.entryAdded" and p["entry"]["level"] == "error":
            self.problems.append(f'{p["entry"]["text"]} {p["entry"].get("url", "")}'.strip())

    def pump(self, s):
        self.ws.settimeout(0.2)
        end = time.time() + s
        while time.time() < end:
            try:
                self.note(json.loads(self.ws.recv()))
            except websocket.WebSocketTimeoutException:
                pass
        self.ws.settimeout(120)

    def js(self, code):
        r = self.call("Runtime.evaluate", expression=code, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in r:
            raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", code))
        return r.get("result", {}).get("value")

    def wait(self, code, timeout=30):
        t = time.time()
        while time.time() - t < timeout:
            if self.js(code):
                return
            self.pump(0.2)
        raise TimeoutError(code)

    def nav(self, url, wait=1.0):
        self.call("Page.navigate", url=url)
        self.pump(wait)

    def shot(self, path, full=False):
        o = {"format": "png"}
        if full:
            hh = self.call("Page.getLayoutMetrics")["cssContentSize"]["height"]
            o.update(captureBeyondViewport=True, clip={"x": 0, "y": 0, "width": self.w, "height": hh, "scale": 1})
        Path(path).write_bytes(b64decode(self.call("Page.captureScreenshot", **o)["data"]))

    def close(self):
        self.chrome.kill()
        self.chrome.wait()
        shutil.rmtree(self.prof, ignore_errors=True)
