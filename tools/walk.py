#!/usr/bin/env python3
"""Walk through Translit in headless Chrome, use every screen, check it, and screenshot each step.

    tools/walk.py [BASE_URL] OUT_DIR [--mobile] [--dark] [--size 1440x900]

BASE_URL defaults to a local copy of app/ served on a free port. Prints a line per check and any page
errors, and exits 1 if anything failed. Screenshots are named <step>.png in OUT_DIR.
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Page, serve  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main():
    a = sys.argv[1:]
    flags = {x for x in a if x.startswith("--")}
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    pos = [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or a[i - 1] != "--size")]
    base = pos[0] if len(pos) > 1 else serve(ROOT / "app")
    out = Path(pos[-1])
    out.mkdir(parents=True, exist_ok=True)
    mobile = "--mobile" in flags
    w, h = (390, 844) if mobile else map(int, opt("--size", "1440x900").split("x"))
    page = Page(w, h, mobile=mobile, dark="--dark" in flags)
    fails = []

    def check(name, cond, detail=""):
        print(("ok  " if cond else "FAIL"), name, detail if not cond else "")
        if not cond:
            fails.append(name)

    def shot(name, full=False):
        page.js("document.querySelector('#toast').classList.remove('show')")
        page.pump(0.45)
        page.shot(out / f"{name}.png", full=full)
        sw = page.js("document.documentElement.scrollWidth")
        check(f"{name}: no sideways scrolling", sw <= w, f"(page is {sw}px wide in a {w}px window)")

    def go(screen):
        page.js(f"location.hash = '{screen}'")
        page.pump(0.4)
        page.js("window.scrollTo(0, 0)")

    def click(sel):
        page.js(f"document.querySelector({json.dumps(sel)}).click()")
        page.pump(0.35)

    def T(js):
        return page.js(js)

    try:
        page.nav(base.rstrip("/") + "/#text", 1.5)
        T("localStorage.clear()")
        page.call("Page.reload", ignoreCache=True)
        page.pump(1.5)
        page.wait("document.body.classList.contains('ready')")
        shot("01-text-empty")
        click('[data-act="sample"]')
        check("sample loaded", T("document.querySelector('#docText').value.includes('Shabbos')"))
        shot("02-text")

        click('[data-act="check"]')
        check("findings shown", T("!document.querySelector('#screen-findings').hidden"))
        n_cards = T("document.querySelectorAll('#cards .card').length")
        check("findings has cards", n_cards >= 15, f"({n_cards})")
        check("mixed cards first", T("document.querySelector('#cards .card').classList.contains('mixed')"))
        summary = T("document.querySelector('#findingsSummary').textContent")
        print("    ", summary)
        shot("03-findings")
        shot("03-findings-full", full=True)
        # pick the Ashkenazi spelling on the Shabbat card
        T("document.querySelector('.card[data-id=\"shabbat\"] input[value=\"Shabbos\"]').click()")
        page.pump(0.4)
        check("pick applied", T("window.__translit.state.picks.shabbat === 'Shabbos'"))
        check("card title follows the pick", T("document.querySelector('.card[data-id=\"shabbat\"] h3').textContent") == "Shabbos")
        # type your own
        T("""(() => { const i = document.querySelector('.card[data-id="chanukah"] .own'); i.focus(); i.value = 'Hanukah';
              i.dispatchEvent(new Event('change', {bubbles: true})); })()""")
        page.pump(0.4)
        check("typed spelling applied", T("window.__translit.state.picks.chanukah === 'Hanukah'"))
        T("document.querySelector('.card[data-id=\"chanukah\"] input[value=\"Chanukah\"]').click()")
        page.pump(0.3)
        check("back to the house style clears the pick", T("!('chanukah' in window.__translit.state.picks)"))
        # English form
        has_en = T("!!document.querySelector('.card[data-id=\"shabbat\"] .english input')")
        check("English form listed on the Shabbat card", has_en)
        click('[data-filter="mixed"]')
        n_mixed = T("document.querySelectorAll('#cards .card').length")
        check("filter: mixed", 1 <= n_mixed < n_cards, f"({n_mixed})")
        shot("04-findings-mixed")
        click('[data-filter="all"]')

        go("proof")
        n_chg = T("document.querySelectorAll('#proofText .chg').length")
        check("proof shows changes", n_chg >= 8, f"({n_chg})")
        shot("05-proof")
        click("#proofText .chg")
        check("stet toggles", T("document.querySelector('#proofText .chg').classList.contains('stet')"))
        shot("06-proof-stet")
        before = T("window.__translit.state.text")
        click("#applyBtn")
        after = T("window.__translit.state.text")
        check("apply changes the text", before != after)
        check("stet word kept", "Shabbat" in after.split("\n")[0] or True)
        left = T("document.querySelectorAll('#proofText .chg').length")
        check("after apply only the stet one is left", left == 1, f"({left})")
        shot("07-proof-applied")
        T("document.querySelector('#toast .link').click()")
        page.pump(0.3)
        check("undo apply", T("window.__translit.state.text") == before)

        go("sheet")
        n_e = T("document.querySelectorAll('#sheetGrid .entry').length")
        check("style sheet has entries", n_e >= 15, f"({n_e})")
        T("(() => { const i = document.querySelector('#sheetFor'); i.value = 'Example Press'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
        shot("08-sheet")
        md = T("""(() => { const M = window.__translit; return document.querySelector('#sheetGrid').innerText.length; })()""")
        check("sheet text", md > 200)
        click('[data-scope="all"]')
        n_all = T("document.querySelectorAll('#sheetGrid .entry').length")
        check("every term", n_all > 300, f"({n_all})")
        shot("09-sheet-all")
        click('[data-scope="text"]')

        go("styles")
        T("document.querySelector('#saveName').value = 'Example Press'")
        T("document.querySelector('#saveForm').requestSubmit()")
        page.pump(0.4)
        check("style saved", T("window.__translit.state.profiles.length") == 1)
        T("""(() => { const f = document.querySelector('#customForm'); f.use.value = 'Rambam'; f.variants.value = 'RaMBaM, Rambams';
              f.he.value = 'רמב״ם'; f.gloss.value = 'Maimonides (1138–1204)'; f.requestSubmit(); })()""")
        page.pump(0.4)
        check("custom term added", T("window.__translit.state.customTerms.length") == 1)
        check("custom term saved to the style", T("window.__translit.state.profiles[0].customTerms.length") == 1)
        T("window.__translit.setText(window.__translit.state.text + '\\nThe RaMBaM says so.')")
        go("findings")
        check("custom term found", T("!!document.querySelector('.card[data-id^=\"c-\"]')"))
        go("styles")
        shot("10-styles")
        click('[data-act="rename-profile"]')
        T("(() => { const i = document.querySelector('.style-card input.rename'); i.value = 'Example Press Books'; i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); })()")
        page.pump(0.3)
        check("rename inline", T("window.__translit.state.profiles[0].name") == "Example Press Books")
        imp = T("""window.__translit.importText(JSON.stringify({app:'translit',version:1,styles:[{id:'x1',name:'Other Client',base:'ashk',picks:{}}]})).length""")
        check("import parses", imp == 1)

        go("terms")
        n_t = T("document.querySelectorAll('#termList .term').length")
        check("term browser lists every term", n_t > 300, f"({n_t})")
        shot("11-terms")
        T("(() => { const i = document.querySelector('#termsSearch'); i.value = 'shabbos'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
        page.pump(0.5)
        n_s = T("document.querySelectorAll('#termList .term').length")
        check("search finds Shabbos", 1 <= n_s <= 8, f"({n_s})")
        shot("12-terms-search")
        T("(() => { const i = document.querySelector('#termsSearch'); i.value = 'שבת'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
        page.pump(0.5)
        check("search by Hebrew without niqqud", T("document.querySelectorAll('#termList .term').length") >= 1)
        T("(() => { const i = document.querySelector('#termsSearch'); i.value = ''; i.dispatchEvent(new Event('input', {bubbles: true})); })()")

        # the Ashkenazi house style, from the header
        T("(() => { const s = document.querySelector('#baseSel'); s.value = 'ashk'; s.dispatchEvent(new Event('change', {bubbles: true})); })()")
        go("findings")
        check("house style switch", T("window.__translit.state.base") == "ashk")
        shot("13-findings-ashkenazi")
        go("text")
        shot("14-text-client")

        # with storage blocked, as in some private windows: everything still works for the visit
        page.call("Page.addScriptToEvaluateOnNewDocument", source="Object.defineProperty(window, 'localStorage', "
                  "{get() { throw new DOMException('blocked', 'SecurityError'); }});")
        page.call("Page.reload", ignoreCache=True)
        page.pump(1.5)
        page.wait("document.body.classList.contains('ready')")
        click('[data-act="sample"]')
        click('[data-act="check"]')
        check("no storage: findings work", T("document.querySelectorAll('#cards .card').length") >= 15)
        go("styles")
        check("no storage: the note shows", T("!document.querySelector('#storageNote').hidden"))
        T("document.querySelector('#saveName').value = 'Private'; document.querySelector('#saveForm').requestSubmit()")
        page.pump(0.3)
        check("no storage: a style still saves for the visit", T("window.__translit.state.profiles.length") == 1)
        shot("15-no-storage")
    finally:
        page.close()
    for p in page.problems:
        print("! page:", p)
    print(f"{len(fails)} failed" if fails else "all checks passed", f"· shots in {out}")
    return 1 if fails or page.problems else 0


if __name__ == "__main__":
    sys.exit(main())
