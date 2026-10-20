#!/usr/bin/env python3
"""Check app/data/terms.json for mistakes, and print the review list.

    tools/check_terms.py                 check the data; exit 1 on errors
    tools/check_terms.py --words FILE    also flag one-word spellings that are English words (FILE: one word per line)
    tools/check_terms.py --review        print the "please check" list as Markdown (for REVIEW.md)

What it checks: ids are unique; every term has a group, Hebrew, a gloss and a form for each house style;
every form is also a spelling; and no spelling belongs to two terms (spaces, hyphens and apostrophes are
ignored, the way the matcher ignores them). Two terms may share letters only if they differ in capitals
(Sukkot the festival, sukkot the booths), because that is how the matcher tells them apart.
"""
import json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "terms.json"
STYLES = ("ch", "h", "acad", "ashk")
HEBREW = re.compile(r"[א-ת]")
TOPICS = {
    "modern": "Forms in the two modern styles",
    "kamatz": "Ashkenazi: kamatz as o, or not",
    "ashkenazi": "Other Ashkenazi forms",
    "doubling": "Academic: doubling a letter for a dagesh",
    "academic": "Other academic forms",
    "apostrophes": "Apostrophes",
    "capitals": "Capitals",
    "yiddish": "Yiddish and YIVO",
}


def key(s):
    """What the matcher treats as the same spelling: case, spaces, hyphens and apostrophes ignored."""
    s = unicodedata.normalize("NFC", s).casefold()
    return re.sub(r"[\s\-‐‑'’‘ʼʻ`]", "", s)


def main():
    a = sys.argv[1:]
    d = json.loads(DATA.read_text())
    terms = d["terms"]
    if "--review" in a:
        return review(d)
    errors, warnings = [], []
    groups = {g["id"] for g in d["groups"]}
    assert [s["id"] for s in d["styles"]] == list(STYLES), "styles must be ch, h, acad, ashk in that order"
    seen = set()
    owners = defaultdict(list)  # key -> [(term id, form, exact spelling)]
    for t in terms:
        tid = t.get("id", "?")
        where = f"{tid}:"
        if tid in seen:
            errors.append(f"{where} duplicate id")
        seen.add(tid)
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", tid):
            errors.append(f"{where} id should be lowercase-with-hyphens")
        if t.get("group") not in groups:
            errors.append(f"{where} unknown group {t.get('group')!r}")
        if not HEBREW.search(t.get("he", "")):
            errors.append(f"{where} no Hebrew")
        g = t.get("gloss", "")
        if not g or len(g) > 110:
            errors.append(f"{where} gloss missing or too long ({len(g)})")
        if t.get("check") and not t.get("note"):
            errors.append(f"{where} check without a note")
        if t.get("check") and t.get("topic") not in TOPICS:
            errors.append(f"{where} check without a known topic")
        for form, block in (("sg", t), ("pl", t.get("plural"))):
            if block is None:
                continue
            fm = block.get("forms", {})
            if set(fm) != set(STYLES) or not all(fm.values()):
                errors.append(f"{where} {form} needs a form for each of {STYLES}")
                continue
            if form == "pl" and not HEBREW.search(block.get("he", "")):
                errors.append(f"{where} plural has no Hebrew")
            variants = block.get("variants", [])
            skip = set(t.get("noMatch", [])) if form == "sg" else set()
            for f in fm.values():
                if f not in variants and f not in skip:
                    errors.append(f"{where} {form} form {f!r} is not among the spellings")
            if len(set(variants)) != len(variants):
                errors.append(f"{where} {form} repeats a spelling")
            for v in variants:
                if v != v.strip() or "  " in v:
                    errors.append(f"{where} stray space in {v!r}")
                if v != unicodedata.normalize("NFC", v):
                    errors.append(f"{where} {v!r} is not NFC")
                owners[key(v)].append((tid, form, v))
        for e in t.get("english", []):
            owners[key(e)].append((tid, "en", e))
    for k, own in owners.items():
        terms_here = {(o[0], o[1]) for o in own}
        if len(terms_here) < 2:
            continue
        exact = defaultdict(set)
        for tid, form, v in own:
            exact[v].add((tid, form))
        clash = [v for v, ts in exact.items() if len(ts) > 1]
        if clash:
            errors.append(f"same spelling in two places: {sorted(terms_here)} share {clash}")
        else:
            warnings.append(f"told apart by capitals only: {', '.join(f'{v} ({t}/{f})' for t, f, v in own)}")

    if "--words" in a:
        words = {w.strip().lower() for w in Path(a[a.index("--words") + 1]).read_text().split()}
        hits = sorted({(v, o[0][0]) for k, o in owners.items() for v in {x[2] for x in o}
                       if " " not in v and "-" not in v and v.lower() in words})
        if hits:
            print("One-word spellings that are also in the word list (check each is safe to search for):")
            for v, tid in hits:
                print(f"  {v:<16} {tid}")

    for w in warnings:
        print("note:", w)
    for e in errors:
        print("ERROR:", e)
    n_sp = sum(len(t["variants"]) + len(t.get("plural", {}).get("variants", [])) for t in terms)
    print(f"{len(terms)} terms, {n_sp} spellings, {sum(1 for t in terms if t.get('check'))} to check, "
          f"{len(errors)} errors")
    return 1 if errors else 0


def review(d):
    names = {s["id"]: s["name"] for s in d["styles"]}
    by = defaultdict(list)
    for t in d["terms"]:
        if t.get("check"):
            by[t["topic"]].append(t)
    out = []
    for topic, title in TOPICS.items():
        ts = by.get(topic)
        if not ts:
            continue
        out.append(f"### {title} ({len(ts)})\n")
        out.append("| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |")
        out.append("|---|---|---|---|---|---|---|")
        for t in ts:
            fm = t["forms"]
            cells = [fm[s] for s in STYLES]
            if "plural" in t:
                pf = t["plural"]["forms"]
                cells = [f"{c} / pl. {pf[s]}" for c, s in zip(cells, STYLES)]
            out.append(f"| `{t['id']}` | {t['he']} | " + " | ".join(cells) + f" | {t['note']} |")
        out.append("")
    notes = [t for t in d["terms"] if t.get("note") and not t.get("check")]
    out.append(f"### Choices I made on purpose ({len(notes)})\n")
    out.append("These aren't questions, just decisions you might want to know about.\n")
    for t in notes:
        out.append(f"- `{t['id']}` ({t['forms']['ch']}): {t['note']}")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
