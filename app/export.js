// Files Translit hands back: the style sheet as Markdown and CSV, the list of changes, downloads.

export function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

const csvCell = (s) => (/[",\n\r]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s ?? ""));
export const csv = (rows) => "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
const mdCell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function slug(s) {
  return (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 40);
}

export function ruleText(style) {
  return style.rules.map((r) => (r.text ? r.text : `${r.from} → ${r.to}${r.note ? ` (${r.note})` : ""}`)).join(", ");
}

/** entries: [{ use, plural, he, gloss, not: [] }] */
export function sheetMarkdown({ title, style, date, entries }) {
  const lines = [`# ${title}`, "", `House style: ${style.name} (${ruleText(style)}).`,
    `Made with Translit on ${date}.`, "", "| Use | Plural | Hebrew | Meaning | Not |", "|---|---|---|---|---|"];
  for (const e of entries) {
    lines.push(`| ${[e.use, e.plural, e.he, e.gloss, e.not.join(", ")].map(mdCell).join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

export function sheetCsv(entries) {
  return csv([["Use", "Plural", "Hebrew", "Meaning", "Not", "Group"],
    ...entries.map((e) => [e.use, e.plural, e.he, e.gloss, e.not.join("; "), e.group])]);
}

/** changes: from matcher.planChanges; stet: Set of starts left as they were. */
export function changesCsv(changes, stet) {
  return csv([["Line", "Before", "After", "Term", "Status"],
    ...changes.map((c) => [c.line, c.before, c.after, c.match.term.forms.ch, stet.has(c.start) ? "left as it was (stet)" : "changed"])]);
}
