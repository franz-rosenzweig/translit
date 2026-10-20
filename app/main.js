// Translit: the screens. The matching itself is in matcher.js, the term list in data/terms.json.
import * as M from "./matcher.js";
import * as store from "./store.js";
import * as out from "./export.js";
import { SAMPLE } from "./sample.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const he = (s) => (s ? `<span class="he" lang="he" dir="rtl">${esc(s)}</span>` : "");
const icon = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const plural = (n, one, many = one + "s") => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const SCREENS = ["text", "findings", "proof", "sheet", "styles", "terms"];

const state = {
  data: null, index: null, styleById: {},
  text: "", fileName: "",
  base: "ch", picks: {}, englishFix: {}, customTerms: [], caps: "keep",
  profileId: null, profiles: [],
  sheetFor: "", sheetScope: "text", filter: "all",
  termsQuery: "", termsGroup: "",
  cache: { key: null, matches: [] },
  stet: new Set(), undo: null,
};

const settings = () => ({ base: state.base, picks: state.picks, englishFix: state.englishFix, caps: state.caps });
const activeProfile = () => state.profiles.find((p) => p.id === state.profileId) || null;

// ------------------------------------------------------------------------------------ saving
function persist() {
  // The text is kept apart from the settings, so a text too big for storage never costs you your picks.
  if (!store.save("text", { text: state.text, fileName: state.fileName })) store.save("text", { text: "", fileName: "" });
  store.save("work", {
    base: state.base, picks: state.picks, englishFix: state.englishFix, customTerms: state.customTerms,
    caps: state.caps, profileId: state.profileId, sheetFor: state.sheetFor, sheetScope: state.sheetScope,
  });
  const p = activeProfile();
  if (p) {
    Object.assign(p, { base: state.base, picks: { ...state.picks }, englishFix: { ...state.englishFix },
      customTerms: structuredClone(state.customTerms), caps: state.caps, updated: new Date().toISOString() });
    store.save("profiles", state.profiles);
  }
}
const saveProfiles = () => store.save("profiles", state.profiles);

function rebuildIndex() {
  state.index = M.buildIndex(state.data.terms, state.customTerms);
  state.cache.key = null;
}

function matches() {
  const key = state.text;
  if (state.cache.key !== key || state.cache.index !== state.index) {
    state.cache = { key, index: state.index, matches: M.findAll(state.text, state.index) };
  }
  return state.cache.matches;
}
const changes = () => M.planChanges(state.text, matches(), settings());

// ------------------------------------------------------------------------------------ toast
let toastTimer;
function toast(msg, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button" class="link">${esc(action.label)}</button>` : "");
  if (action) t.querySelector("button").onclick = () => { action.run(); t.classList.remove("show"); };
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), action ? 7000 : 3200);
}

// ------------------------------------------------------------------------------------ routing
function screenFromHash() {
  const h = location.hash.replace("#", "");
  return SCREENS.includes(h) ? h : "text";
}

function show(screen) {
  for (const s of SCREENS) $(`#screen-${s}`).hidden = s !== screen;
  $$(".tabs a").forEach((a) => (a.dataset.screen === screen ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  document.body.dataset.screen = screen;
  render(screen);
}

function render(screen = screenFromHash()) {
  renderHeader();
  ({ text: renderText, findings: renderFindings, proof: renderProof, sheet: renderSheet, styles: renderStyles, terms: renderTerms })[screen]();
}

function go(screen) {
  if (location.hash === "#" + screen) show(screen);
  else location.hash = screen;
  window.scrollTo({ top: 0, behavior: "instant" });
}

// ------------------------------------------------------------------------------------ header
function renderHeader() {
  const sel = $("#baseSel");
  sel.value = state.base;
  const p = activeProfile();
  const chip = $("#clientChip");
  chip.hidden = !p;
  if (p) chip.innerHTML = `${icon("card")}<span>${esc(p.name)}</span>`;
}

// ------------------------------------------------------------------------------------ Text
function renderText() {
  const ta = $("#docText");
  if (ta.value !== state.text) ta.value = state.text;
  updateCount();
  $("#fileName").textContent = state.fileName ? state.fileName : "";
  for (const b of $$(".stamp")) {
    const on = b.dataset.base === state.base;
    b.setAttribute("aria-checked", on);
    b.tabIndex = on ? 0 : -1;
  }
  const list = $("#clientList");
  list.innerHTML = state.profiles.length
    ? state.profiles.map((p) => `<button type="button" class="chip ${p.id === state.profileId ? "on" : ""}" data-act="use-profile" data-id="${esc(p.id)}" aria-pressed="${p.id === state.profileId}">${icon("card")}${esc(p.name)}</button>`).join("")
    : `<p class="faint">Save a client's choices under <a href="#styles">My styles</a> and they show up here.</p>`;
}

function updateCount() {
  const words = (state.text.match(/\S+/g) || []).length;
  $("#wordCount").textContent = words ? plural(words, "word") : "Nothing here yet";
}

function setText(text, fileName = "") {
  state.text = text;
  state.fileName = fileName;
  state.stet.clear();
  persist();
  renderText();
}

function stampsHtml() {
  return state.data.styles.map((s) => `
    <button type="button" class="stamp" role="radio" data-base="${s.id}" aria-checked="false">
      <span class="stamp-name">${esc(s.name)}</span>
      <span class="rules">${s.rules.map(ruleHtml).join("")}</span>
      <span class="examples">${s.examples.map(esc).join(" · ")}</span>
    </button>`).join("");
}

function ruleHtml(r) {
  if (r.text) return `<span class="rule">${esc(r.text)}</span>`;
  return `<span class="rule">${he(r.from)}${icon("arrow", "arrow")}<b>${esc(r.to)}</b>${r.note ? ` <i>${esc(r.note)}</i>` : ""}</span>`;
}

// ------------------------------------------------------------------------------------ Findings
function renderFindings() {
  const box = $("#cards");
  const empty = $("#findingsEmpty");
  const bar = $("#findingsBar");
  if (!state.text.trim()) {
    box.innerHTML = "";
    bar.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyHtml("Nothing to check yet", "Paste a text on the Text page, or try the sample, and every Hebrew and Yiddish term in it lands here as a card.", true);
    return;
  }
  const ch = changes();
  const sum = M.summarize(matches(), ch, settings());
  bar.hidden = false;
  const mixed = sum.filter((s) => s.mixed).length;
  const fixing = sum.filter((s) => s.changes).length;
  $("#findingsSummary").innerHTML = sum.length
    ? `<b>${plural(sum.length, "term")}</b> · <b class="red">${mixed}</b> spelled more than one way · <b>${plural(ch.length, "change")}</b> to make`
    : "No known terms in this text.";
  $("#capsSel").value = state.caps;
  const counts = { all: sum.length, mixed, change: fixing, fine: sum.length - fixing };
  for (const b of $$("#filters button")) {
    b.setAttribute("aria-pressed", b.dataset.filter === state.filter);
    b.querySelector(".n").textContent = counts[b.dataset.filter];
  }
  const shown = sum.filter((s) => state.filter === "all" || (state.filter === "mixed" && s.mixed)
    || (state.filter === "change" && s.changes) || (state.filter === "fine" && !s.changes));
  empty.hidden = sum.length > 0 && shown.length > 0;
  if (!sum.length) empty.innerHTML = emptyHtml("No known terms here", "Translit didn't find any of the terms it knows. You can add your own under My styles.", false);
  else if (!shown.length) empty.innerHTML = emptyHtml("Nothing in this pile", "Try another filter above.", false);
  box.innerHTML = shown.map(cardHtml).join("");
}

function emptyHtml(title, body, withButtons) {
  return `<div class="empty-card">${icon("pencil", "big")}<h2>${esc(title)}</h2><p>${esc(body)}</p>` +
    (withButtons ? `<div class="row"><a class="btn" href="#text">${icon("page")}Go to Text</a><button type="button" class="btn primary" data-act="sample-check">${icon("spark")}Try the sample</button></div>` : "") + "</div>";
}

function cardHtml(s) {
  const t = s.term;
  const st = settings();
  const forms = [["sg", "Use"], ["pl", "Plural"]].filter(([f]) => s.forms[f].size);
  const note = s.mixed ? `<span class="hand red">mixed!</span>` : s.changes ? `<span class="hand red">${s.changes} to fix</span>` : `<span class="hand ok">${icon("tick")}ok</span>`;
  const eng = s.forms.en.size
    ? `<div class="english"><span>In English: ${[...s.forms.en].map(([k, n]) => `<b>${esc(k)}</b> ×${n}`).join(", ")}, ${state.englishFix[t.id] ? "changed too" : "left as is"}.</span>
       <label class="check"><input type="checkbox" data-act="english" data-id="${esc(t.id)}" ${state.englishFix[t.id] ? "checked" : ""}> Change these too</label></div>`
    : "";
  return `<article class="card ${s.mixed ? "mixed" : ""} ${s.changes ? "fixing" : ""}" data-id="${esc(t.id)}">
    <header class="card-head">
      <div class="card-title"><h3>${esc(M.chosenFor(t, "sg", st))}</h3>${he(t.he)}</div>
      <p class="gloss">${esc(t.gloss || (t.custom ? "One of your own terms" : ""))}</p>
      <div class="card-note">${note}</div>
    </header>
    ${forms.map(([f, label]) => optionsHtml(s, f, label)).join("")}
    ${eng}
  </article>`;
}

function optionsHtml(s, form, label) {
  const t = s.term;
  const st = settings();
  const chosen = M.chosenFor(t, form, st);
  const house = form === "pl" ? t.plural.forms[state.base] : t.forms[state.base];
  const found = s.forms[form];
  const keys = [...found.keys()];
  if (!keys.some((k) => k === house)) keys.push(house);
  const typed = !keys.includes(chosen);
  const name = `${t.id}/${form}`;
  const rows = keys.map((k) => {
    const n = found.get(k) || 0;
    const isChosen = k === chosen;
    const willChange = s.changedKeys.has(`${form}|${k}`);
    return `<label class="opt ${isChosen ? "on" : ""} ${willChange ? "struck" : ""}">
      <input type="radio" name="${esc(name)}" value="${esc(k)}" data-act="pick" data-id="${esc(t.id)}" data-form="${form}" ${isChosen ? "checked" : ""}>
      <span class="spell">${esc(k)}</span>${n ? `<span class="n">×${n}</span>` : ""}${k === house ? `<span class="tag">house style</span>` : ""}
    </label>`;
  }).join("");
  return `<fieldset class="opts"><legend>${label}</legend>${rows}
    <label class="opt other ${typed ? "on" : ""}">
      <input type="radio" name="${esc(name)}" value="" data-act="pick-other" ${typed ? "checked" : ""} aria-label="Type your own spelling">
      <input type="text" class="own" data-act="own" data-id="${esc(t.id)}" data-form="${form}" value="${typed ? esc(chosen) : ""}" placeholder="Type your own" spellcheck="false" autocomplete="off">
    </label></fieldset>`;
}

function setPick(id, form, value) {
  const term = state.index.byId.get(id);
  const key = form === "pl" ? `${id}/pl` : id;
  const house = form === "pl" ? term.plural.forms[state.base] : term.forms[state.base];
  if (!value || value === house) delete state.picks[key];
  else state.picks[key] = value;
  state.stet.clear();
  persist();
}

// ------------------------------------------------------------------------------------ Proof
function renderProof() {
  const empty = $("#proofEmpty");
  const paper = $("#proofPaper");
  const bar = $("#proofBar");
  if (!state.text.trim()) {
    paper.hidden = bar.hidden = true;
    $("#changeTable").hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyHtml("Nothing to proof yet", "Paste a text on the Text page first, then check it, and the changes show up here marked in red.", true);
    return;
  }
  empty.hidden = true;
  paper.hidden = bar.hidden = false;
  const ch = changes();
  for (const s of [...state.stet]) if (!ch.some((c) => c.start === s)) state.stet.delete(s);
  const kept = ch.filter((c) => state.stet.has(c.start)).length;
  const terms = new Set(ch.map((c) => c.match.term.id)).size;
  $("#proofSummary").innerHTML = ch.length
    ? `<b>${plural(ch.length - kept, "change")}</b> in ${plural(terms, "term")}${kept ? ` · <b>${kept}</b> left as it was` : ""}`
    : `Nothing to change: every term already matches your style.`;
  $("#applyBtn").disabled = ch.length - kept === 0;
  // the marked-up text
  let html = "", at = 0;
  for (const c of ch) {
    html += esc(state.text.slice(at, c.start));
    const stet = state.stet.has(c.start);
    html += `<button type="button" class="chg ${stet ? "stet" : ""}" data-start="${c.start}" aria-pressed="${stet}" title="${stet ? "Left as it was. Click to change it after all." : "Click to leave this one as it was."}"><span class="w"><del>${esc(c.before)}</del><ins aria-label="becomes">${esc(c.after)}</ins></span></button>`;
    at = c.end;
  }
  html += esc(state.text.slice(at));
  $("#proofText").innerHTML = html;
  requestAnimationFrame(placeMarginNotes);
  // the table of changes
  const tbl = $("#changeTable");
  tbl.hidden = !ch.length;
  $("#changeCount").textContent = ch.length;
  $("#changeRows").innerHTML = ch.slice(0, 2000).map((c) => `<tr class="${state.stet.has(c.start) ? "stet" : ""}"><td>${c.line}</td><td><del>${esc(c.before)}</del></td><td>${esc(c.after)}</td><td>${state.stet.has(c.start) ? "stet" : ""}</td></tr>`).join("");
}

function placeMarginNotes() {
  const margin = $("#proofMargin");
  if (!margin || $("#proofPaper").hidden) return;
  if (getComputedStyle(margin).display === "none") { margin.innerHTML = ""; return; }
  const base = $("#proofText").getBoundingClientRect().top;
  const lines = new Map();
  for (const b of $$("#proofText .chg")) {
    const r = b.getClientRects()[0] || b.getBoundingClientRect();
    const top = Math.round(r.top - base);
    const k = [...lines.keys()].find((t) => Math.abs(t - top) < 8) ?? top;
    if (!lines.has(k)) lines.set(k, []);
    lines.get(k).push(b);
  }
  let last = -Infinity;
  margin.innerHTML = [...lines].map(([top, bs]) => {
    const y = Math.max(top, last + 4);
    const notes = bs.map((b) => (b.classList.contains("stet") ? `<span class="stet-mark">stet</span>` : `${esc(b.querySelector("ins").textContent)}<span class="slash">/</span>`));
    last = y + 30 * Math.ceil(notes.join(" ").length / 22);
    return `<div class="note" style="top:${y}px">${notes.join(" ")}</div>`;
  }).join("");
}

function applyAll() {
  const ch = changes();
  const n = ch.filter((c) => !state.stet.has(c.start)).length;
  if (!n) return;
  const before = state.text;
  state.undo = before;
  state.text = M.applyChanges(state.text, ch, state.stet);
  state.stet.clear();
  persist();
  render("proof");
  toast(`Applied ${plural(n, "change")}. Your text is updated.`, { label: "Undo", run: () => { state.text = before; state.undo = null; persist(); render(); } });
}

const fixedText = () => M.applyChanges(state.text, changes(), state.stet);

function fileNames() {
  const m = state.fileName.match(/^(.*?)(\.(txt|md|markdown|text))?$/i);
  const stem = (m && m[1]) || "translit";
  const ext = (m && m[3]) || "txt";
  return { stem, ext };
}

// ------------------------------------------------------------------------------------ Style sheet
function sheetEntries() {
  const st = settings();
  const found = new Map();
  if (state.text.trim()) for (const s of M.summarize(matches(), changes(), st)) found.set(s.term.id, s);
  const terms = state.sheetScope === "all" ? state.index.terms : [...found.values()].map((s) => s.term);
  const groupName = Object.fromEntries(state.data.groups.map((g) => [g.id, g.name]));
  return terms.map((t) => {
    const use = M.chosenFor(t, "sg", st);
    const pl = t.plural ? M.chosenFor(t, "pl", st) : "";
    const s = found.get(t.id);
    const not = s ? [...s.forms.sg.keys()].filter((k) => k.toLowerCase() !== use.toLowerCase())
      .concat([...s.forms.pl.keys()].filter((k) => k.toLowerCase() !== pl.toLowerCase())) : [];
    return { id: t.id, use, plural: pl, he: t.he, gloss: t.gloss, not, group: t.custom ? "Your own terms" : groupName[t.group] || "" };
  }).sort((a, b) => M.fold(a.use).localeCompare(M.fold(b.use)));
}

function renderSheet() {
  const st = state.styleById[state.base];
  const p = activeProfile();
  const inp = $("#sheetFor");
  if (document.activeElement !== inp) inp.value = state.sheetFor || (p ? p.name : "");
  $("#sheetStyle").innerHTML = `House style: <b>${esc(st.name)}</b> (${state.data.styles.find((s) => s.id === state.base).rules.map((r) => (r.text ? esc(r.text) : `${he(r.from)} → ${esc(r.to)}`)).join(", ")})`;
  $("#sheetDate").textContent = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  for (const b of $$("#sheetScope button")) b.setAttribute("aria-pressed", b.dataset.scope === state.sheetScope);
  const entries = sheetEntries();
  $("#sheetCount").textContent = plural(entries.length, "term");
  const grid = $("#sheetGrid");
  if (!entries.length) {
    grid.innerHTML = `<p class="sheet-empty">${state.text.trim() ? "No known terms in this text. Switch to “Every term” to see the whole list in your style." : "Check a text first and the terms it uses land here, or switch to “Every term” for the whole list in your style."}</p>`;
    return;
  }
  const byLetter = new Map();
  for (const e of entries) {
    const L = (M.fold(e.use)[0] || "#").toUpperCase();
    if (!byLetter.has(L)) byLetter.set(L, []);
    byLetter.get(L).push(e);
  }
  grid.innerHTML = [...byLetter].map(([L, es]) => `<section class="box"><h3>${esc(L)}</h3><dl>${es.map((e) => `
      <div class="entry"><dt><b>${esc(e.use)}</b>${e.plural ? ` <span class="pl">pl. ${esc(e.plural)}</span>` : ""} ${he(e.he)}</dt>
      <dd>${esc(e.gloss)}${e.not.length ? ` <span class="not">not ${e.not.map((n) => `<s>${esc(n)}</s>`).join(", ")}</span>` : ""}</dd></div>`).join("")}</dl></section>`).join("");
}

function sheetTitle() {
  const who = ($("#sheetFor").value || "").trim();
  return who ? `Style sheet: ${who}` : "Style sheet";
}

// ------------------------------------------------------------------------------------ My styles
function renderStyles() {
  const p = activeProfile();
  const st = state.styleById[state.base];
  const nPicks = Object.keys(state.picks).length;
  $("#currentSummary").innerHTML = `<b>${esc(st.name)}</b> · ${plural(nPicks, "pick")} · ${plural(state.customTerms.length, "term")} of your own`;
  $("#currentSaved").hidden = !p;
  $("#saveLabel").textContent = p ? "Save a copy as" : "Save it as";
  if (p) $("#currentName").textContent = p.name;
  const picks = Object.entries(state.picks);
  $("#pickList").innerHTML = picks.length
    ? picks.map(([k, v]) => {
      const [id, f] = k.split("/");
      const t = state.index.byId.get(id);
      const from = t ? (f === "pl" ? t.plural?.forms[state.base] : t.forms[state.base]) : id;
      return `<li><span><s>${esc(from)}</s> ${icon("arrow", "arrow")} <b>${esc(v)}</b>${f === "pl" ? " <i>plural</i>" : ""}</span><button type="button" class="icon-btn" data-act="unpick" data-key="${esc(k)}" aria-label="Back to the house style for ${esc(from)}">${icon("x")}</button></li>`;
    }).join("")
    : `<li class="faint">None yet. Pick a spelling on a card under Findings and it shows up here.</li>`;
  $("#customList").innerHTML = state.customTerms.length
    ? state.customTerms.map((c) => `<li><span><b>${esc(c.use)}</b>${c.plural ? ` <i>pl. ${esc(c.plural)}</i>` : ""}${c.variants.filter((v) => v !== c.use).length ? ` <span class="faint">also ${c.variants.filter((v) => v !== c.use).map(esc).join(", ")}</span>` : ""} ${he(c.he)}</span><button type="button" class="icon-btn" data-act="del-custom" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.use)}">${icon("x")}</button></li>`).join("")
    : `<li class="faint">None yet. Add names or words the list doesn't know, with the spellings to catch.</li>`;
  const list = $("#profileList");
  list.innerHTML = state.profiles.length
    ? state.profiles.map((q) => `<article class="card style-card ${q.id === state.profileId ? "active" : ""}">
        <header class="card-head"><div class="card-title"><h3>${esc(q.name)}</h3>${q.id === state.profileId ? `<span class="hand ok">in use</span>` : ""}</div>
        <p class="gloss">${esc(state.styleById[q.base]?.name || "")} · ${plural(Object.keys(q.picks || {}).length, "pick")} · ${plural((q.customTerms || []).length, "term")} of your own</p>
        <p class="faint small">Changed ${esc(new Date(q.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</p></header>
        <div class="row">
          ${q.id === state.profileId ? `<button type="button" class="btn" data-act="stop-profile">Stop using</button>` : `<button type="button" class="btn primary" data-act="use-profile" data-id="${esc(q.id)}">${icon("check")}Use</button>`}
          <button type="button" class="btn" data-act="rename-profile" data-id="${esc(q.id)}">Rename</button>
          <button type="button" class="btn danger" data-act="del-profile" data-id="${esc(q.id)}">${icon("trash")}Delete</button>
        </div></article>`).join("")
    : `<p class="faint">No saved styles yet. Make your choices, give them a name on the left, and they're kept here for next time.</p>`;
  $("#exportBtn").disabled = !state.profiles.length;
  $("#storageNote").hidden = store.storageWorks();
}

function useProfile(id) {
  const p = state.profiles.find((q) => q.id === id);
  if (!p) return;
  state.profileId = p.id;
  state.base = p.base;
  state.picks = { ...(p.picks || {}) };
  state.englishFix = { ...(p.englishFix || {}) };
  state.customTerms = structuredClone(p.customTerms || []);
  state.caps = p.caps || "keep";
  state.sheetFor = "";
  rebuildIndex();
  persist();
  render();
  toast(`Using “${p.name}”. Changes you make now are saved to it.`);
}

// ------------------------------------------------------------------------------------ Terms
let termsRendered = "";
function renderTerms() {
  const list = M.searchTerms(state.index.terms, state.termsQuery, state.termsGroup);
  const sig = `${state.termsQuery}|${state.termsGroup}|${state.base}|${state.index.terms.length}`;
  $("#termsCount").textContent = list.length === state.index.terms.length ? plural(list.length, "term") : `${list.length} of ${plural(state.index.terms.length, "term")}`;
  $$(".term-head .col").forEach((c) => c.classList.toggle("current", c.dataset.base === state.base));
  if (sig === termsRendered) return;
  termsRendered = sig;
  const ids = state.data.styles.map((s) => s.id);
  const groupName = Object.fromEntries(state.data.groups.map((g) => [g.id, g.name]));
  $("#termList").innerHTML = list.length ? list.map((t) => {
    const formCells = (f, block) => ids.map((b) => `<div class="col ${b === state.base ? "current" : ""}" data-label="${esc(state.styleById[b].short)}">${esc(block.forms[b])}</div>`).join("");
    const others = (block) => block.variants.filter((v) => !Object.values(block.forms).includes(v));
    const also = others(t);
    const alsoPl = t.plural ? others(t.plural) : [];
    return `<article class="term ${t.check ? "query" : ""}">
      <div class="trow"><div class="col hecol">${he(t.he)}</div>${formCells("sg", t)}</div>
      ${t.plural ? `<div class="trow pl"><div class="col hecol">${he(t.plural.he)}<span class="faint small">plural</span></div>${formCells("pl", t.plural)}</div>` : ""}
      <div class="tmeta">
        <p class="gloss">${esc(t.gloss)}${t.lang === "yi" ? ` <span class="tag">Yiddish${t.forms.acad !== t.forms.ch ? ", academic is YIVO" : ""}</span>` : ""}${t.custom ? ` <span class="tag">your own</span>` : ` <span class="faint small">${esc(groupName[t.group] || "")}</span>`}</p>
        ${also.length || alsoPl.length ? `<p class="also">Also caught: ${also.map(esc).join(", ")}${alsoPl.length ? `${also.length ? "; " : ""}plural ${alsoPl.map(esc).join(", ")}` : ""}</p>` : ""}
        ${t.english ? `<p class="also">In English (left alone unless you ask): ${t.english.map(esc).join(", ")}</p>` : ""}
        ${t.note ? `<p class="tnote">${t.check ? `<span class="qy" title="A question for the editor">Qy</span>` : ""}${esc(t.note)}</p>` : ""}
      </div>
    </article>`;
  }).join("") : `<p class="sheet-empty">No term matches “${esc(state.termsQuery)}”. You can add it as your own under <a href="#styles">My styles</a>.</p>`;
}

// ------------------------------------------------------------------------------------ events
function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox" || el.type === "text")) return; // handled on change
  switch (act) {
    case "sample": setText(SAMPLE, ""); toast("Sample text loaded. Check terms to see what's in it."); break;
    case "sample-check": setText(SAMPLE, ""); go("findings"); break;
    case "clear":
      if (!state.text) break;
      { const before = state.text, name = state.fileName;
        setText("", "");
        toast("Text cleared.", { label: "Undo", run: () => setText(before, name) }); }
      break;
    case "open": $("#fileInput").click(); break;
    case "check": commitText(); go("findings"); break;
    case "filter": state.filter = el.dataset.filter; renderFindings(); break;
    case "apply": applyAll(); break;
    case "copy": out.copyText(fixedText()).then((ok) => toast(ok ? "Fixed text copied." : "Couldn't copy here. Use Download instead.")); break;
    case "download": { const { stem, ext } = fileNames(); out.download(`${stem}-fixed.${ext}`, fixedText()); break; }
    case "changelist": { const { stem } = fileNames(); out.download(`${stem}-changes.csv`, out.changesCsv(changes(), state.stet), "text/csv"); break; }
    case "scope": state.sheetScope = el.dataset.scope; persist(); renderSheet(); break;
    case "print": window.print(); break;
    case "md": out.download(`style-sheet${slugPart()}.md`, out.sheetMarkdown({ title: sheetTitle(), style: state.styleById[state.base], date: $("#sheetDate").textContent, entries: sheetEntries() }), "text/markdown"); break;
    case "csv": out.download(`style-sheet${slugPart()}.csv`, out.sheetCsv(sheetEntries()), "text/csv"); break;
    case "use-profile": if (el.dataset.id === state.profileId) { state.profileId = null; persist(); render(); toast("Stopped using the saved style. Your choices are still here."); } else useProfile(el.dataset.id); break;
    case "stop-profile": state.profileId = null; persist(); render(); toast("Stopped using it. Your choices stay as they are, unsaved."); break;
    case "rename-profile": {
      const p = state.profiles.find((q) => q.id === el.dataset.id);
      const h3 = p && el.closest(".style-card").querySelector("h3");
      if (!h3) break;
      const inp = document.createElement("input");
      Object.assign(inp, { value: p.name, className: "rename", maxLength: 80 });
      inp.setAttribute("aria-label", "New name");
      h3.replaceWith(inp);
      inp.focus();
      inp.select();
      let done = false;
      const finish = (keep) => {
        if (done) return;
        done = true;
        if (keep && inp.value.trim()) { p.name = inp.value.trim(); saveProfiles(); }
        render();
      };
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        if (e.key === "Escape") finish(false);
      });
      inp.addEventListener("blur", () => finish(true));
      break;
    }
    case "del-profile": {
      const i = state.profiles.findIndex((q) => q.id === el.dataset.id);
      if (i < 0) break;
      const [p] = state.profiles.splice(i, 1);
      if (state.profileId === p.id) state.profileId = null;
      saveProfiles(); persist(); render();
      toast(`Deleted “${p.name}”.`, { label: "Undo", run: () => { state.profiles.splice(i, 0, p); saveProfiles(); render(); } });
      break;
    }
    case "unpick": delete state.picks[el.dataset.key]; persist(); render(); break;
    case "del-custom": {
      const i = state.customTerms.findIndex((c) => c.id === el.dataset.id);
      if (i < 0) break;
      const [c] = state.customTerms.splice(i, 1);
      rebuildIndex(); persist(); render();
      toast(`Removed “${c.use}”.`, { label: "Undo", run: () => { state.customTerms.splice(i, 0, c); rebuildIndex(); persist(); render(); } });
      break;
    }
    case "export": out.download(`translit-styles-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.exportFile(state.profiles), null, 2), "application/json"); break;
    case "import": $("#importInput").click(); break;
    default: break;
  }
}

const slugPart = () => { const s = out.slug($("#sheetFor").value); return s ? "-" + s : ""; };

function onChange(e) {
  const el = e.target;
  const act = el.dataset.act;
  if (el.id === "baseSel") return setBase(el.value);
  if (el.id === "capsSel") { state.caps = el.value; persist(); renderFindings(); return; }
  if (el.id === "termsGroup") { state.termsGroup = el.value; renderTerms(); return; }
  if (act === "pick") { setPick(el.dataset.id, el.dataset.form, el.value); renderFindings(); return; }
  if (act === "pick-other") { el.closest(".opt").querySelector(".own").focus(); return; }
  if (act === "own") { const v = el.value.trim(); if (v) { setPick(el.dataset.id, el.dataset.form, v); renderFindings(); } return; }
  if (act === "english") { if (el.checked) state.englishFix[el.dataset.id] = true; else delete state.englishFix[el.dataset.id]; persist(); renderFindings(); }
}

function setBase(base) {
  if (!state.styleById[base]) return;
  state.base = base;
  state.stet.clear();
  persist();
  render();
}

function commitText() {
  const v = $("#docText").value;
  if (v !== state.text) { state.text = v; state.stet.clear(); persist(); }
}

async function readFile(file) {
  if (!file) return;
  if (file.size > 5_000_000) return toast("That file is too big for Translit (over 5 MB).");
  const text = await file.text();
  if (/\u0000/.test(text.slice(0, 2000))) return toast("That doesn't look like a text file. Try a .txt or .md file.");
  setText(text.replace(/\r\n?/g, "\n"), file.name);
  toast(`Opened ${file.name}.`);
}

function wire() {
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  // typing your own spelling: apply on Enter as well as on blur
  document.addEventListener("keydown", (e) => {
    if (e.target.matches?.(".own") && e.key === "Enter") { e.preventDefault(); e.target.blur(); }
    // arrow keys between the house-style stamps
    if (e.target.matches?.(".stamp") && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const s = $$(".stamp"); const i = s.indexOf(e.target);
      const n = s[(i + (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : s.length - 1)) % s.length];
      n.focus(); setBase(n.dataset.base);
    }
  });
  document.addEventListener("focusin", (e) => { if (e.target.matches?.(".own")) e.target.closest(".opt").querySelector("input[type=radio]").checked = true; });
  $("#stamps").addEventListener("click", (e) => { const b = e.target.closest(".stamp"); if (b) setBase(b.dataset.base); });
  const ta = $("#docText");
  let t;
  ta.addEventListener("input", () => { clearTimeout(t); updateCountFrom(ta.value); t = setTimeout(commitText, 400); });
  ta.addEventListener("blur", commitText);
  ta.addEventListener("dragover", (e) => { e.preventDefault(); ta.classList.add("drop"); });
  ta.addEventListener("dragleave", () => ta.classList.remove("drop"));
  ta.addEventListener("drop", (e) => { e.preventDefault(); ta.classList.remove("drop"); readFile(e.dataTransfer.files[0]); });
  $("#fileInput").addEventListener("change", (e) => { readFile(e.target.files[0]); e.target.value = ""; });
  $("#importInput").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const got = store.parseImport(await f.text());
      let added = 0, updated = 0;
      for (const s of got) {
        const i = state.profiles.findIndex((p) => p.id === s.id);
        if (i >= 0) { state.profiles[i] = s; updated++; } else { state.profiles.push(s); added++; }
      }
      saveProfiles(); render();
      toast(`Imported ${plural(added, "new style")}${updated ? ` and updated ${updated}` : ""}.`);
    } catch (err) { toast(err.message); }
  });
  $("#proofText").addEventListener("click", (e) => {
    const b = e.target.closest(".chg");
    if (!b) return;
    const s = +b.dataset.start;
    if (state.stet.has(s)) state.stet.delete(s); else state.stet.add(s);
    renderProof();
    $(`#proofText .chg[data-start="${s}"]`)?.focus();
  });
  $("#saveForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#saveName").value.trim();
    if (!name) return $("#saveName").focus();
    const p = { id: store.newId(), name: name.slice(0, 80), base: state.base, picks: { ...state.picks },
      englishFix: { ...state.englishFix }, customTerms: structuredClone(state.customTerms), caps: state.caps, updated: new Date().toISOString() };
    state.profiles.push(p);
    state.profileId = p.id;
    $("#saveName").value = "";
    saveProfiles(); persist(); render();
    toast(`Saved as “${p.name}”. Changes you make now are saved to it.`);
  });
  $("#customForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const use = f.use.value.trim();
    if (!use) return f.use.focus();
    const split = (s) => s.split(/[,;\n]/).map((x) => x.trim().replace(/['’]s$/i, "")).filter(Boolean);
    state.customTerms.push({ id: store.newId("c"), use, variants: [use, ...split(f.variants.value)],
      plural: f.plural.value.trim(), pluralVariants: split(f.pluralVariants.value), he: f.he.value.trim(), gloss: f.gloss.value.trim() });
    f.reset();
    rebuildIndex(); persist(); render();
    toast(`Added “${use}”. It's checked like any other term now.`);
  });
  $("#sheetFor").addEventListener("input", (e) => { state.sheetFor = e.target.value; persist(); });
  let st;
  $("#termsSearch").addEventListener("input", (e) => { clearTimeout(st); st = setTimeout(() => { state.termsQuery = e.target.value; renderTerms(); }, 120); });
  window.addEventListener("hashchange", () => { show(screenFromHash()); window.scrollTo(0, 0); });
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (screenFromHash() === "proof") placeMarginNotes(); }, 150); });
}

function updateCountFrom(v) {
  const words = (v.match(/\S+/g) || []).length;
  $("#wordCount").textContent = words ? plural(words, "word") : "Nothing here yet";
}

// ------------------------------------------------------------------------------------ start
async function start() {
  try {
    const res = await fetch("data/terms.json");
    state.data = await res.json();
  } catch {
    $("#main").innerHTML = `<div class="empty-card"><h2>The term list didn't load</h2><p>Check your connection and reload the page.</p></div>`;
    return;
  }
  state.styleById = Object.fromEntries(state.data.styles.map((s) => [s.id, s]));
  const w = store.load("work", {});
  const saved = store.load("text", {});
  Object.assign(state, {
    text: typeof saved.text === "string" ? saved.text : "", fileName: saved.fileName || "",
    base: state.styleById[w.base] ? w.base : "ch", picks: w.picks || {}, englishFix: w.englishFix || {},
    customTerms: Array.isArray(w.customTerms) ? w.customTerms : [], caps: w.caps === "follow" ? "follow" : "keep",
    profileId: w.profileId || null, sheetFor: w.sheetFor || "", sheetScope: w.sheetScope === "all" ? "all" : "text",
  });
  state.profiles = store.load("profiles", []);
  if (!Array.isArray(state.profiles)) state.profiles = [];
  if (!activeProfile()) state.profileId = null;
  rebuildIndex();
  $("#baseSel").innerHTML = state.data.styles.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  $("#stamps").innerHTML = stampsHtml();
  $("#termsGroup").innerHTML = `<option value="">All groups</option>` + state.data.groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
  $("#termHead").innerHTML = `<div class="col hecol">Hebrew</div>` + state.data.styles.map((s) => `<div class="col" data-base="${s.id}"><b>${esc(s.name)}</b><span>${s.rules.filter((r) => !r.text).map((r) => `${he(r.from)} ${esc(r.to)}`).join(" · ")}</span></div>`).join("");
  wire();
  show(screenFromHash());
  document.body.classList.add("ready");
  window.__translit = { state, M, render, go, useProfile, setText, importText: (json) => store.parseImport(json) };
}

start();
