<sub>[Translit docs](README.md) › Under the hood</sub>

# Developing

These are the working notes for changing Translit itself: what each file does, the term list format,
adding a term, the tests and deploying. Everything a user needs is in the other pages.

## How it runs

Plain ES modules, no framework, no build step, no network calls except for the app's own files.

| File | What |
|---|---|
| `app/index.html`, `app/style.css` | The page and its six screens (`#text`, `#findings`, `#proof`, `#sheet`, `#styles`, `#terms`). Light and dark from the system, phone to wide screen, and a print layout that prints only the style sheet. |
| `app/main.js` | Screens, the Findings cards, the proof marks and margin notes, stet, apply and undo, the style sheet, My styles, the term browser. `window.__translit` is there for the checks. |
| `app/matcher.js` | Finding terms and planning fixes, with no DOM: `buildIndex`, `findAll`, `spellingKey`, `replacementFor`, `planChanges`, `applyChanges`, `summarize`, `searchTerms`. |
| `app/data/terms.json` | The term list, the four house styles and the groups. |
| `app/store.js` | localStorage (every access wrapped), the styles file for export and import. |
| `app/export.js` | Downloads, copying, the style sheet as Markdown and CSV, the list of changes as CSV. |
| `app/sample.js` | The text behind **Try a sample**. |
| `app/fonts/` | Source Serif 4, Frank Ruhl Libre (Hebrew), Caveat and Courier Prime, self-hosted with their OFL texts. |

Storage keys start with `translit:v1:`: `text` (the last text and its file name), `work` (the house
style, picks, English choices, own terms, capitals and which client style is in use) and `profiles`
(the saved client styles). The text is saved separately so that a text too big for storage can't cost
anyone their picks.

## The matcher

`buildIndex` turns every spelling into a sticky regular expression and files it under its first two
letters (folded, skipping apostrophes, spaces, hyphens and marks). `findAll` walks the text one word
start at a time, tries only the spellings filed under that word's first two letters, and keeps the
longest match. Ties go to your own terms first, then to a match without an English ending, then to an
exact-case match (that's how Sukkot and sukkot are told apart), then to a house-style form.

Inside a spelling, a space or a hyphen matches any run of spaces, hyphens or line breaks (or nothing),
an apostrophe is optional and may be curly, and ḥ ṭ ẓ ṣ also match the letter plus U+0323. After the
spelling it allows `'s`, `s'`, `s`, `es` (only after s, sh, tch, sch, x, z, tz), a bare apostrophe after
an s when the word didn't open with a quote mark, and for verbs `ing`, `ed`, `er` and `ers`, with an
optional doubled last consonant (schlepping). Web and email addresses are skipped.

`spellingKey` decides what counts as a separate spelling on a card: an all-capital word counts as the
spelling it matches, and a capital at the start of a sentence, in a Markdown heading, or anywhere when
capitals are kept, is folded away if the lowercase form is in the list. `replacementFor` writes the
chosen spelling with the capitals the original needs and puts the English ending back (s or es to suit
the new spelling, and a bare apostrophe becomes 's when the new spelling doesn't end in s).

## The term list format

`app/data/terms.json` has `styles` (id, name, rules, examples), `groups` and `terms`, one term per line.
A term looks like this:

```json
{"id": "shabbat", "group": "shabbat", "he": "שַׁבָּת", "gloss": "The Sabbath, Friday evening to Saturday night",
 "forms": {"ch": "Shabbat", "h": "Shabbat", "acad": "Shabbat", "ashk": "Shabbos"},
 "variants": ["Shabbat", "Shabbos", "Shabbes", "Shabes", "Shabbath", "Shabat", "Shobbos", "Shabbis", "Shabos"],
 "english": ["Sabbath"],
 "plural": {"he": "שַׁבָּתוֹת", "forms": {"ch": "Shabbatot", "h": "Shabbatot", "acad": "Shabbatot", "ashk": "Shabbosim"},
            "variants": ["Shabbatot", "Shabbosim", "Shabbosos", "Shabbatim", "Shabbasim"]},
 "check": true, "topic": "ashkenazi", "note": "Ashkenazi plural: Shabbosim or Shabbosos?"}
```

- `forms` has one spelling per house style (`ch`, `h`, `acad`, `ashk`), and each must also be in
  `variants`.
- `variants` is every spelling to catch. Case matters only for what's shown on the cards; matching
  ignores it. Write a hyphenated or apostrophe form (Rosh ha-Shanah, Ta'anit) and the plainer ones are
  found too.
- `english` lists English equivalents, which are found but only changed when the user asks.
- `plural` is optional, with the same shape. Leave it out when English plurals are normal.
- Optional flags: `"lang": "yi"` for Yiddish words (the academic form is then YIVO, and `yivo` can hold
  a note such as a verb's infinitive), `"verb": true` to allow -ing, -ed and -er, `"exactCase": true`
  to match only the listed capitals (or a capital at the start of a sentence), and `"noMatch"` for a
  style form that should be written but never searched for (like hag).
- `check`, `topic` and `note` mark a form for review. `note` alone is an explanation that shows in the
  term browser.

## Adding a term

Add a line to `terms.json` in the right group, then run the checks below. `tools/check_terms.py`
complains if a spelling already belongs to another term (spaces, hyphens, apostrophes and case ignored),
if a form isn't among the variants, or if anything is missing. A spelling that's also an ordinary
English word is worth a second thought; `--words FILE` lists those against a word list.

## Checks

```
tools/check_terms.py                   # the term list
tools/check_terms.py --review          # the questions still open, as Markdown (REVIEW.md is built from it)
tools/test.py                          # the matcher tests in headless Chrome (add --data to run the check first)
tools/walk.py OUT_DIR                  # every screen at 1440x900, checked and screenshotted
tools/walk.py OUT_DIR --mobile --dark  # the same at phone size, in dark mode
tools/docshots.py                      # the screenshots in docs/images
tools/make_icons.py                    # app/icon.svg, icon-512.png and icon-192.png
```

`tools/test.py` serves the repo on a free local port and opens `tests/matcher.html`, which runs
`tests/matcher.test.js`: plurals, possessives, capitals, hyphen and space variants, overlapping terms,
words that must not match, Sukkot and sukkot, Unicode, English forms, verbs, picks, custom terms, stet,
and then every spelling in the list (each one must find its own term and nothing else) and every house
style form (every spelling of a term must be fixed to it). It also times `findAll` on about 190,000
characters. It prints the failures and exits 1 if there are any.

`tools/walk.py` (by default against a local copy of `app/`, or pass a URL first) loads the sample,
checks the Findings cards, picks and typed spellings, the filters, stet, apply and undo, the style sheet,
saving a style, renaming it, adding a term of your own, import, the term search in English and Hebrew,
switching house styles, and finally the whole thing again with storage blocked. Every screenshot is
also checked for sideways scrolling.

All the tools use headless Chrome through `tools/cdp.py` (Chrome for Testing by default, or whatever
`CHROME` points to) and need the Python `websocket-client` package. `make_icons.py` also needs
`fontTools`, and `docshots.py` needs Pillow.

## Deploying

```
tools/deploy.sh
```

It copies `app/` with rsync to the folder my web server serves Translit from. For your own server,
change the destination in the script. Any static host works, as long as `data/terms.json` is served
from the same place as the page.
