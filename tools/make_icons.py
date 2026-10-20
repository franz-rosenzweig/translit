#!/usr/bin/env python3
"""Draw the app icon: an index card with a ת on it and a red pencil, on editor's indigo.

    tools/make_icons.py      writes app/icon.svg, app/icon-512.png and app/icon-192.png

The ת is taken from Frank Ruhl Libre (bold) as an outline, so the SVG needs no font. The PNGs are
rendered with headless Chrome (see tools/cdp.py) and have a full square background for home screens.
"""
import sys, tempfile
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Page  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"


def glyph(char, weight=700, font="frank-ruhl-libre-hebrew.woff2"):
    f = TTFont(APP / "fonts" / font)
    f = instancer.instantiateVariableFont(f, {"wght": weight})
    gs = f.getGlyphSet()
    name = f.getBestCmap()[ord(char)]
    pen = SVGPathPen(gs)
    gs[name].draw(pen)
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    return pen.getCommands(), bp.bounds  # font units, y up


def svg(rounded=True):
    path, (x0, y0, x1, y1) = glyph("ת")
    h = 132.0  # target height of the letter in px
    s = h / (y1 - y0)
    w = (x1 - x0) * s
    cx, base = 196, 334  # where the letter sits on the card (before the card's tilt)
    tx = cx - w / 2 - x0 * s
    ty = base + y0 * s
    letter = f'<path d="{path}" transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f} {-s:.5f})" fill="#1F2233"/>'

    def hand(ch, x, base_y, size):
        # a red pencil letter from Caveat; size = scale of 1 em in px; x = left edge
        gp, (gx0, gy0, gx1, gy1) = glyph(ch, 700, "caveat-latin.woff2")
        k = size / 1000
        return (f'<path d="{gp}" transform="translate({x - gx0 * k:.2f} {base_y:.2f}) scale({k:.5f} {-k:.5f})" '
                f'fill="#C0392B"/>')
    marks = (hand("s", 300, 332, 128) + hand("t", 356, 268, 108)
             + '<path d="M290 323 L360 291" stroke="#C0392B" stroke-width="8" stroke-linecap="round"/>')
    bg = ('<rect width="512" height="512" rx="112" fill="#3A4A8C"/>' if rounded
          else '<rect width="512" height="512" fill="#3A4A8C"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  {bg}
  <g transform="rotate(-7 256 256)">
    <rect x="78" y="134" width="356" height="250" rx="12" fill="#13183A" opacity="0.28" transform="translate(6 10)"/>
    <rect x="78" y="134" width="356" height="250" rx="12" fill="#FFFDF6"/>
    <path d="M78 186h356" stroke="#C0392B" stroke-width="5"/>
    <path d="M78 238h356M78 286h356M78 334h356" stroke="#C3CEEA" stroke-width="3"/>
    {letter}
    {marks}
  </g>
  <g transform="translate(330 432) rotate(-52)">
    <rect x="0" y="-15" width="190" height="30" rx="3" fill="#C0392B"/>
    <rect x="0" y="-15" width="190" height="10" fill="#D9584A"/>
    <rect x="164" y="-15" width="26" height="30" fill="#9E2E22"/>
    <path d="M0 -15 L-44 0 L0 15 Z" fill="#EBCB9F"/>
    <path d="M-30 -5 L-44 0 L-30 5 Z" fill="#2B2B33"/>
  </g>
</svg>
'''


def main():
    (APP / "icon.svg").write_text(svg(rounded=True))
    square = svg(rounded=False)
    with tempfile.TemporaryDirectory() as d:
        page_file = Path(d) / "icon.html"
        page_file.write_text(f'<!doctype html><html><body style="margin:0;background:#3A4A8C">'
                             f'<div style="width:512px;height:512px">{square}</div></body></html>')
        for size in (512, 192):
            p = Page(size, size)
            try:
                p.call("Emulation.setDeviceMetricsOverride", width=512, height=512, deviceScaleFactor=size / 512,
                       mobile=False)
                p.w = p.h = 512
                p.nav(page_file.as_uri(), 0.6)
                p.shot(APP / f"icon-{size}.png")
            finally:
                p.close()
    print("wrote app/icon.svg, app/icon-512.png, app/icon-192.png")


if __name__ == "__main__":
    main()
