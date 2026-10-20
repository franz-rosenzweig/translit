#!/usr/bin/env python3
"""Take the screenshots the README and docs use, in a clean state, into docs/images/.

    tools/docshots.py [BASE_URL]      default: a local copy of app/ on a free port

Each screen is shot at 1440x900 in light and dark. The phone (390 wide) shots of Text, Findings and
Proof are put side by side in phones-light.png and phones-dark.png, and two close-ups are cut from the
light shots. Needs Pillow.
"""
import sys, tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Page, serve  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "images"


def setup(page, base, extra=""):
    page.nav(base + "#text", 1.2)
    page.js("localStorage.clear()")
    page.call("Page.reload", ignoreCache=True)
    page.pump(1.2)
    page.wait("document.body.classList.contains('ready')")
    page.js("document.querySelector('[data-act=sample]').click()")
    page.pump(0.3)
    if extra:
        page.js(extra)
        page.pump(0.3)


def go(page, screen, scroll=0):
    page.js(f"location.hash = '{screen}'")
    page.pump(0.6)
    page.js(f"window.scrollTo(0, {scroll})")
    page.js("document.querySelector('#toast').classList.remove('show'); document.activeElement && document.activeElement.blur()")
    page.pump(0.5)


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else serve(ROOT / "app")).rstrip("/") + "/"
    OUT.mkdir(parents=True, exist_ok=True)
    problems = []
    for dark in (False, True):
        tag = "dark" if dark else "light"
        p = Page(1440, 900, dark=dark)
        try:
            setup(p, base)
            go(p, "text"); p.shot(OUT / f"text-{tag}.png")
            go(p, "findings"); p.shot(OUT / f"findings-{tag}.png")
            go(p, "proof")
            p.js("document.querySelectorAll('#proofText .chg')[6].click()")
            p.pump(0.4)
            p.js("document.activeElement.blur()")
            p.pump(0.3)
            p.shot(OUT / f"proof-{tag}.png")
            go(p, "sheet")
            p.js("(() => { const i = document.querySelector('#sheetFor'); i.value = 'Example Press'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
            p.pump(0.3)
            p.shot(OUT / f"sheet-{tag}.png")
            # a saved style with a pick and a term of its own
            go(p, "findings")
            p.js("document.querySelector('.card[data-id=\"halachah\"] input[value=\"halacha\"]').click()")
            p.pump(0.3)
            go(p, "styles")
            p.js("document.querySelector('#saveName').value = 'Example Press'; document.querySelector('#saveForm').requestSubmit()")
            p.pump(0.3)
            p.js("""(() => { const f = document.querySelector('#customForm'); f.use.value = 'Rambam'; f.variants.value = 'RaMBaM, Rambam\\u2019s';
                   f.he.value = 'רמב״ם'; f.gloss.value = 'Maimonides (1138–1204)'; f.requestSubmit(); })()""")
            p.pump(0.3)
            p.js("""(() => { const T = window.__translit; T.state.profiles.push({id: 's-other', name: 'Kehillah Quarterly', base: 'ashk',
                   picks: {}, englishFix: {}, customTerms: [], caps: 'keep', updated: new Date(Date.now() - 86400e3 * 12).toISOString()});
                   T.render(); })()""")
            go(p, "styles"); p.shot(OUT / f"styles-{tag}.png")
            go(p, "terms")
            p.js("(() => { const i = document.querySelector('#termsSearch'); i.value = 'chanuk'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
            p.pump(0.5)
            p.js("document.activeElement.blur()")
            p.shot(OUT / f"terms-{tag}.png")
        finally:
            p.close()
        problems += p.problems
    tmp = Path(tempfile.mkdtemp(prefix="translit-phone-"))
    for dark, bg in ((False, "#E8E3D6"), (True, "#13151D")):
        tag = "dark" if dark else "light"
        p = Page(390, 844, mobile=True, dark=dark)
        try:
            setup(p, base)
            go(p, "text"); p.shot(tmp / "text.png")
            go(p, "findings"); p.shot(tmp / "findings.png")
            go(p, "proof", 120); p.shot(tmp / "proof.png")
        finally:
            p.close()
        problems += p.problems
        ims = [Image.open(tmp / f"{n}.png").convert("RGB") for n in ("text", "findings", "proof")]
        ims = [i.resize((i.width // 2, i.height // 2), Image.LANCZOS) for i in ims]
        pad, gap = 36, 28
        sheet = Image.new("RGB", (pad * 2 + sum(i.width for i in ims) + gap * 2, pad * 2 + ims[0].height), bg)
        for k, i in enumerate(ims):
            sheet.paste(i, (pad + k * (i.width + gap), pad))
        sheet.save(OUT / f"phones-{tag}.png", optimize=True)
    Image.open(OUT / "findings-light.png").convert("RGB").crop((40, 190, 720, 570)).save(OUT / "cards-closeup.png", optimize=True)
    Image.open(OUT / "proof-light.png").convert("RGB").crop((40, 200, 1400, 830)).save(OUT / "proof-closeup.png", optimize=True)
    for x in problems:
        print("! page:", x)
    print("wrote", len(list(OUT.glob("*.png"))), "images to docs/images")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
