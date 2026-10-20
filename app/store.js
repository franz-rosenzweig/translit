// Everything Translit keeps lives in this browser's localStorage, and every access is wrapped so the
// app still works (for the length of the visit) when storage is blocked or full.

const PREFIX = "translit:v1:";
let works = null;

export function storageWorks() {
  if (works !== null) return works;
  try {
    localStorage.setItem(PREFIX + "probe", "1");
    localStorage.removeItem(PREFIX + "probe");
    works = true;
  } catch {
    works = false;
  }
  return works;
}

export function load(key, fallback) {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s == null ? fallback : JSON.parse(s);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const newId = (p = "s") => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The JSON file My styles exports and imports. */
export function exportFile(profiles) {
  return { app: "translit", version: 1, exported: new Date().toISOString(), styles: profiles };
}

const BASES = ["ch", "h", "acad", "ashk"];

/** Read an exported file (or a single style) back; returns clean style objects or throws a friendly Error. */
export function parseImport(json) {
  let d;
  try {
    d = JSON.parse(json);
  } catch {
    throw new Error("That file isn't a Translit styles file.");
  }
  const list = Array.isArray(d?.styles) ? d.styles : d && d.name ? [d] : null;
  if (!list) throw new Error("That file isn't a Translit styles file.");
  const str = (x, n = 200) => (typeof x === "string" ? x.slice(0, n) : "");
  return list.filter((s) => s && typeof s.name === "string").map((s) => ({
    id: str(s.id, 60) || newId(),
    name: str(s.name, 80).trim() || "Untitled",
    base: BASES.includes(s.base) ? s.base : "ch",
    picks: Object.fromEntries(Object.entries(s.picks || {}).filter(([k, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => [str(k, 80), str(v, 80)])),
    englishFix: Object.fromEntries(Object.entries(s.englishFix || {}).filter(([, v]) => v === true)),
    customTerms: (Array.isArray(s.customTerms) ? s.customTerms : []).filter((c) => c && typeof c.use === "string")
      .map((c) => ({
        id: str(c.id, 60) || newId("c"), use: str(c.use, 80),
        variants: (Array.isArray(c.variants) ? c.variants : []).map((v) => str(v, 80)).filter(Boolean),
        plural: str(c.plural, 80), pluralVariants: (Array.isArray(c.pluralVariants) ? c.pluralVariants : [])
          .map((v) => str(v, 80)).filter(Boolean),
        he: str(c.he, 80), gloss: str(c.gloss, 160),
      })),
    caps: s.caps === "follow" ? "follow" : "keep",
    updated: str(s.updated, 40) || new Date().toISOString(),
  }));
}
