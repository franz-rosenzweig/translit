#!/usr/bin/env python3
"""Run the matcher tests (tests/matcher.html) in headless Chrome and print the result.

    tools/test.py            serve the repo on a free local port and run the tests; exit 1 on failure
    tools/test.py --data     also run tools/check_terms.py first
"""
import subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Page, serve  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main():
    if "--data" in sys.argv:
        r = subprocess.run([sys.executable, str(ROOT / "tools" / "check_terms.py")])
        if r.returncode:
            return r.returncode
    base = serve(ROOT)
    page = Page(1000, 800)
    try:
        page.nav(f"{base}/tests/matcher.html")
        page.wait("!!window.__results", timeout=60)
        r = page.js("window.__results")
    finally:
        page.close()
    for f in r["failures"]:
        print("FAIL", f)
    for p in page.problems:
        print("! page:", p)
    print(f"{r['passed']} passed, {r['failed']} failed "
          f"({r.get('spellings', 0)} spellings checked; findAll: {r['ms'].get('chars', 0):,} characters "
          f"in {r['ms'].get('find', '?')} ms)")
    return 1 if r["failed"] or page.problems else 0


if __name__ == "__main__":
    sys.exit(main())
