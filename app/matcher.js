// Translit's matcher: finds every known term in a text, in all its spellings, and plans the fixes.
// Pure functions with no DOM, shared by the app and tests/matcher.test.js. The terms themselves live in
// data/terms.json, so adding a term never touches this file.
//
// How a spelling is matched:
//  - whole words only, ignoring case (capitals are handled when the fix is written);
//  - a space or hyphen in a spelling matches a space, a hyphen, a line break or nothing
//    ("Rosh ha-Shanah" also finds "Rosh HaShanah", "Rosh Ha-Shanah" and "Rosh\nhashanah");
//  - an apostrophe in a spelling is optional and may be straight or curly ("Ta'anit" finds "Taanit");
//  - ḥ ṭ ẓ ṣ match whether they're typed as one character or as a letter plus a combining dot;
//  - an English ending may follow: 's, s', s, es (and ing, ed, er for the Yiddish verbs), and a bare
//    apostrophe after an s ("Sukkos' end"), unless the word opened with a quote mark ('Sukkos');
//  - the longest match wins, so "Rosh Hashanah" is never read as "shanah", and "bar mitzvah" not as "mitzvah".

export const STYLE_IDS = ["ch", "h", "acad", "ashk"];

const APOS = "'’‘ʼʻ`";
const APOS_RE = "['’‘ʼʻ`]";
const SEP_RE = "[\\s\\u00A0\\-\\u2010\\u2011]*";
const IS_SEP = /[\s \-‐‑]/u;
const DOT_BELOW = { "ḥ": "h", "Ḥ": "H", "ṭ": "t", "Ṭ": "T", "ẓ": "z", "Ẓ": "Z", "ṣ": "s", "Ṣ": "S" };
const SUFFIX = "['’]s|s['’]|es|s|['’]";
const VERB_SUFFIX = "ing|ers|er|ed|['’]s|s['’]|es|s|['’]";
const AFTER = "(?![\\p{L}\\p{M}\\p{N}])";
const WORD_START = /(?<![\p{L}\p{M}\p{N}])\p{L}/gu;
const URLS = /\bhttps?:\/\/[^\s<>()]+|\bwww\.[^\s<>()]+|[\w.+-]+@[\w-]+\.[\w.-]+/giu;
const SIBILANT = /(s|sh|tch|sch|x|z|tz)$/i;

const escapeRe = (c) => c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const isUpper = (c) => c !== c.toLowerCase() && c === c.toUpperCase();
const isLower = (c) => c !== c.toUpperCase() && c === c.toLowerCase();
const firstLetter = (s) => (s.match(/\p{L}/u) || [""])[0];
const capFirst = (s) => s.replace(/\p{L}/u, (c) => c.toUpperCase());

export function isAllCaps(s) {
  const letters = s.replace(/[^\p{L}]/gu, "");
  return letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

/** The regex source for one spelling (without the ending or the word boundary). */
export function variantPattern(v) {
  let out = "";
  for (const ch of v.normalize("NFC")) {
    if (APOS.includes(ch)) out += APOS_RE + "?";
    else if (IS_SEP.test(ch)) { if (!out.endsWith(SEP_RE)) out += SEP_RE; }
    else if (DOT_BELOW[ch]) out += `(?:${ch}|${DOT_BELOW[ch]}\\u0323)`;
    else out += escapeRe(ch);
  }
  return out;
}

/** First two letters, folded, skipping apostrophes, separators and marks: the bucket a word or spelling falls in. */
function lead(s, i = 0) {
  let k = "";
  for (let j = i; j < s.length && j < i + 10 && k.length < 2; j++) {
    const ch = s[j];
    if (APOS.includes(ch) || IS_SEP.test(ch) || /\p{M}/u.test(ch)) continue;
    if (!/\p{L}/u.test(ch)) break;
    k += ch.normalize("NFD")[0].toLowerCase();
  }
  return k;
}

/** Turn a custom term (from My styles) into the same shape as a built-in one. */
export function customToTerm(c) {
  const all = (s) => Object.fromEntries(STYLE_IDS.map((k) => [k, s]));
  const t = {
    id: c.id, custom: true, group: "custom", he: c.he || "", gloss: c.gloss || "",
    forms: all(c.use), variants: uniq([c.use, ...(c.variants || [])]),
  };
  if (c.plural) t.plural = { he: "", forms: all(c.plural), variants: uniq([c.plural, ...(c.pluralVariants || [])]) };
  return t;
}

function uniq(xs) {
  // Trim, drop a typed possessive ("Rambam's" is "Rambam" plus an ending) and remove repeats.
  const out = [];
  for (const x of xs.map((s) => (s || "").trim().replace(/['’]s$/i, "")).filter(Boolean)) if (!out.includes(x)) out.push(x);
  return out;
}

/** Spellings of one form of a term: "sg", "pl" or "en" (the English equivalents). */
export function formVariants(term, form) {
  if (form === "pl") return term.plural ? term.plural.variants : [];
  if (form === "en") return term.english || [];
  return term.variants;
}

/**
 * Build the lookup for a term list. Custom terms come first and win ties against built-in ones.
 * Returns { terms, byId, buckets } where buckets maps a two-letter lead to candidate spellings.
 */
export function buildIndex(terms, customTerms = []) {
  const all = [...customTerms.map(customToTerm), ...terms];
  const byId = new Map();
  const buckets = new Map();
  all.forEach((term, ti) => {
    if (byId.has(term.id)) return; // a custom term may not reuse an id
    byId.set(term.id, term);
    const styleForms = new Set([
      ...Object.values(term.forms || {}), ...Object.values(term.plural?.forms || {}),
    ].map((s) => s.toLowerCase()));
    for (const form of ["sg", "pl", "en"]) {
      const seen = new Set();
      for (const v of formVariants(term, form)) {
        const vn = v.normalize("NFC");
        if (seen.has(vn.toLowerCase()) && !term.exactCase) continue;
        seen.add(vn.toLowerCase());
        const verb = term.verb && form === "sg";
        let src = `(?<stem>${variantPattern(vn)})`;
        const last = vn.slice(-1);
        if (verb && /[bcdfgklmnprtvz]/i.test(last)) src += `(?<dbl>${escapeRe(last)})?`;
        src += `(?<suf>${verb ? VERB_SUFFIX : SUFFIX})?${AFTER}`;
        const key = lead(vn);
        if (key.length < 2) continue;
        const cand = {
          re: new RegExp(src, "iuy"), ti, term, form, variant: vn, exact: !!term.exactCase,
          custom: !!term.custom, isForm: styleForms.has(vn.toLowerCase()),
        };
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(cand);
      }
    }
  });
  return { terms: all.filter((t, i) => all.findIndex((u) => u.id === t.id) === i), byId, buckets };
}

/** Where a word sits: "start" of a sentence or line, a Markdown "heading", or "mid" sentence. */
export function contextAt(text, pos) {
  const ls = text.lastIndexOf("\n", pos - 1) + 1;
  if (/^\s{0,3}#{1,6}\s/.test(text.slice(ls, pos + 1))) return "heading";
  let i = pos - 1;
  while (i >= 0) {
    const c = text[i];
    if (c === "\n") return "start";
    if (/[\s"“”'‘’()[\]{}*_>#•\-–—]/u.test(c)) { i--; continue; }
    break;
  }
  if (i < 0) return "start";
  return /[.!?…:]/.test(text[i]) ? "start" : "mid";
}

function better(a, b) {
  // Is match a better than match b at the same start?
  if (a.end !== b.end) return a.end > b.end;
  if (a.custom !== b.custom) return a.custom;
  if (!a.suffix !== !b.suffix) return !a.suffix;
  if (a.exactHit !== b.exactHit) return a.exactHit;
  if (a.isForm !== b.isForm) return a.isForm;
  return false;
}

/**
 * Find every term in the text. Returns matches sorted by position:
 * { start, end, stem, dbl, suffix, term, form ("sg" | "pl" | "en"), variant, ctx }.
 */
export function findAll(text, index) {
  const out = [];
  const skips = [];
  for (const m of text.matchAll(URLS)) skips.push([m.index, m.index + m[0].length]);
  const inSkip = (p) => skips.some(([a, b]) => p >= a && p < b);
  const ws = new RegExp(WORD_START.source, "gu");
  let w;
  while ((w = ws.exec(text))) {
    const start = w.index;
    const cands = index.buckets.get(lead(text, start));
    if (!cands || inSkip(start)) continue;
    let best = null;
    let ctx = null;
    for (const c of cands) {
      c.re.lastIndex = start;
      const m = c.re.exec(text);
      if (!m) continue;
      const stem = m.groups.stem;
      let suffix = m.groups.suf || "";
      const dbl = m.groups.dbl || "";
      let end = start + m[0].length;
      if (/^['’]$/.test(suffix) && (dbl || !/s$/i.test(stem) || /['‘]/.test(text[start - 1] || ""))) {
        end -= suffix.length; // a closing quote, not a possessive
        suffix = "";
      }
      if (/^es$/i.test(suffix) && !SIBILANT.test(stem)) continue; // "Torahes" is not a word
      if (dbl && !suffix.match(/^(ing|ed|ers?)$/i)) continue; // a doubled letter only before -ing, -ed, -er
      const stemN = stem.normalize("NFC");
      const exactHit = stemN === c.variant;
      if (c.exact && !exactHit) {
        ctx ??= contextAt(text, start);
        if (!(ctx !== "mid" && stemN === capFirst(c.variant))) continue;
      }
      const cand = {
        start, end, stem, dbl, suffix, term: c.term, form: c.form, variant: c.variant,
        custom: c.custom, isForm: c.isForm, exactHit,
      };
      if (!best || better(cand, best)) best = cand;
    }
    if (!best) continue;
    best.ctx = ctx ?? contextAt(text, start);
    delete best.custom; delete best.isForm; delete best.exactHit;
    out.push(best);
    ws.lastIndex = best.end;
  }
  return out;
}

/** The spelling chosen for a term form under the current settings. */
export function chosenFor(term, form, settings) {
  const base = settings.base || "ch";
  const picks = settings.picks || {};
  if (form === "pl") return picks[`${term.id}/pl`] || term.plural?.forms[base] || "";
  return picks[term.id] || term.forms[base];
}

/** Write the chosen spelling with the capitals the original asks for. */
export function caseLike(stem, chosen, ctx, caps = "keep") {
  if (isAllCaps(stem)) return chosen.toUpperCase();
  const s0 = firstLetter(stem), c0 = firstLetter(chosen);
  if (isUpper(s0) && isLower(c0) && (ctx !== "mid" || caps === "keep")) return capFirst(chosen);
  return chosen;
}

/** How a match is counted in Findings: the spelling as written, folding the capitals that don't count. */
export function spellingKey(m, caps = "keep") {
  const stem = m.stem.normalize("NFC").replace(/\s+/g, " ");
  const variants = formVariants(m.term, m.form);
  if (isAllCaps(stem)) return variants.find((v) => v.toLowerCase() === stem.toLowerCase()) || stem;
  // A capital at the start of a sentence or a heading (or anywhere, when capitals are kept) isn't a spelling.
  if (isUpper(firstLetter(stem)) && (m.ctx !== "mid" || caps === "keep")) {
    const lower = stem.replace(/\p{L}/u, (c) => c.toLowerCase());
    if (variants.includes(lower)) return lower;
  }
  return stem;
}

/** The text a match should become (or the same text when nothing changes). */
export function replacementFor(m, settings) {
  const before = m.stem + m.dbl + m.suffix;
  if (m.form === "en" && !(settings.englishFix || {})[m.term.id]) return before;
  const chosen = chosenFor(m.term, m.form === "en" ? "sg" : m.form, settings);
  if (!chosen) return before;
  const stemOut = caseLike(m.stem, chosen, m.ctx, settings.caps);
  let dbl = m.dbl;
  if (dbl && (!stemOut.toLowerCase().endsWith(dbl.toLowerCase()) || /(.)\1$/i.test(stemOut))) dbl = "";
  let suf = m.suffix;
  const up = /\p{Lu}/u.test(suf) && !/\p{Ll}/u.test(suf);
  if (/^(es|s)$/i.test(suf)) suf = SIBILANT.test(stemOut) ? "es" : "s";
  else if (/^['’]$/.test(suf) && !/s$/i.test(stemOut)) suf += "s"; // Sukkos' end -> Sukkot's end
  else if (/^s['’]$/i.test(suf) && SIBILANT.test(stemOut)) suf = "es" + suf.slice(1);
  if (up) suf = suf.toUpperCase();
  return stemOut + dbl + suf;
}

/** Every change the current settings would make, in order: { start, end, before, after, line, match }. */
export function planChanges(text, matches, settings) {
  const out = [];
  let line = 1, lastPos = 0;
  for (const m of matches) {
    const before = text.slice(m.start, m.end);
    const after = replacementFor(m, settings);
    if (after === before) continue;
    for (let i = lastPos; i < m.start; i++) if (text.charCodeAt(i) === 10) line++;
    lastPos = m.start;
    out.push({ start: m.start, end: m.end, before, after, line, match: m });
  }
  return out;
}

/** Apply changes to the text, leaving out any whose start is in `skip` (the stets). */
export function applyChanges(text, changes, skip = new Set()) {
  let out = "", at = 0;
  for (const c of changes) {
    if (skip.has(c.start)) continue;
    out += text.slice(at, c.start) + c.after;
    at = c.end;
  }
  return out + text.slice(at);
}

/**
 * Group the matches by term for the Findings cards.
 * Returns [{ term, total, changes, changedKeys, forms: { sg, pl, en: Map(spelling -> count) }, mixed }],
 * mixed first, then terms with changes, then the most frequent.
 */
export function summarize(matches, changes, settings) {
  const byTerm = new Map();
  const changed = new Set(changes.map((c) => c.start));
  for (const m of matches) {
    let s = byTerm.get(m.term.id);
    if (!s) byTerm.set(m.term.id, (s = { term: m.term, total: 0, changes: 0, changedKeys: new Set(), forms: { sg: new Map(), pl: new Map(), en: new Map() } }));
    const k = spellingKey(m, settings.caps);
    s.forms[m.form].set(k, (s.forms[m.form].get(k) || 0) + 1);
    s.total++;
    if (changed.has(m.start)) { s.changes++; s.changedKeys.add(`${m.form}|${k}`); }
  }
  const list = [...byTerm.values()];
  for (const s of list) s.mixed = s.forms.sg.size > 1 || s.forms.pl.size > 1;
  const rank = (s) => (s.mixed ? 0 : s.changes ? 1 : 2);
  list.sort((a, b) => rank(a) - rank(b) || b.total - a.total || a.term.forms.ch.localeCompare(b.term.forms.ch));
  return list;
}

/** Plain-text search over the term list (forms, spellings, English, gloss, Hebrew without niqqud). */
export function fold(s) {
  return (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’‘ʼʻ`\-\s]+/g, " ").trim();
}

export function searchTerms(terms, query, group = "") {
  const q = fold(query);
  return terms.filter((t) => {
    if (group && t.group !== group) return false;
    if (!q) return true;
    const hay = [t.id, t.he, t.gloss, t.plural?.he, ...t.variants, ...(t.plural?.variants || []), ...(t.english || []),
      t.yivo].map(fold).join(" | ");
    return hay.includes(q) || hay.replace(/ /g, "").includes(q.replace(/ /g, ""));
  });
}
