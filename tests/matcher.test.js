// Matcher tests. Open tests/matcher.html through a web server (tools/test.py does this in headless
// Chrome). Results land in window.__results and on the page.
import * as M from "../app/matcher.js";

const data = await (await fetch("../app/data/terms.json")).json();
const idx = M.buildIndex(data.terms);
const results = { passed: 0, failed: 0, failures: [], ms: {} };
let current = "";

function eq(actual, expected, what = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) results.passed++;
  else { results.failed++; results.failures.push(`${current}${what ? " / " + what : ""}: got ${a}, expected ${e}`); }
}
function test(name, fn) {
  current = name;
  try { fn(); } catch (err) { results.failed++; results.failures.push(`${name}: threw ${err.stack || err}`); }
}
const S = (base = "ch", more = {}) => ({ base, picks: {}, englishFix: {}, caps: "keep", ...more });
const find = (text, index = idx) => M.findAll(text, index);
const ids = (text, index) => find(text, index).map((m) => `${m.term.id}/${m.form}`);
const spans = (text, index) => find(text, index).map((m) => text.slice(m.start, m.end));
const keys = (text, caps = "keep") => find(text).map((m) => M.spellingKey(m, caps));
function fix(text, settings = S(), index = idx) {
  return M.applyChanges(text, M.planChanges(text, M.findAll(text, index), settings));
}

// ---------------------------------------------------------------- plurals
test("plurals", () => {
  const t = "Three mitzvot, two mitzvos and a few mitzvahs.";
  eq(ids(t), ["mitzvah/pl", "mitzvah/pl", "mitzvah/pl"]);
  eq(fix(t), "Three mitzvot, two mitzvot and a few mitzvot.", "modern ch");
  eq(fix(t, S("ashk")), "Three mitzvos, two mitzvos and a few mitzvos.", "Ashkenazi");
  eq(fix(t, S("ch", { picks: { "mitzvah/pl": "mitzvahs" } })), "Three mitzvahs, two mitzvahs and a few mitzvahs.", "picked English plural");
  eq(ids("The Torahs were carried around."), ["torah/sg"], "Torahs");
  eq(spans("The Torahs were carried around."), ["Torahs"]);
  eq(fix("The Torahs were carried around.", S("ashk")), "The Torahs were carried around.", "English plural kept");
  eq(ids("two sukkahs and three sukkot"), ["sukkah/pl", "sukkah/pl"]);
  eq(fix("Two Shabbats in a row.", S("ashk")), "Two Shabboses in a row.", "s after a sibilant becomes es");
  eq(fix("Two Shabboses in a row.", S("ch")), "Two Shabbats in a row.", "es back to s");
  eq(ids("Torahes"), [], "es only after s, sh, ch, x, z");
  eq(ids("Her Megillahs are old."), ["megillah/pl"], "explicit plural beats singular + s");
});

// ---------------------------------------------------------------- possessives
test("possessives", () => {
  eq(fix("By Shabbos's end we were tired."), "By Shabbat's end we were tired.");
  eq(ids("By Shabbos's end"), ["shabbat/sg"]);
  eq(fix("the Rebbe’s tish", S("ch")), "the Rebbe’s tish", "curly apostrophe, capital kept");
  eq(spans("the Rebbes' tables"), ["Rebbes'"], "plural possessive");
  eq(fix("At Sukkos' end we packed up."), "At Sukkot's end we packed up.", "bare apostrophe after s");
  eq(fix("At Sukkot's end we packed up.", S("ashk")), "At Sukkos's end we packed up.");
  eq(fix("She wrote 'Sukkos' on the card."), "She wrote 'Sukkot' on the card.", "a closing quote is not a possessive");
  eq(fix("She wrote ‘Sukkos’ on the card."), "She wrote ‘Sukkot’ on the card.", "curly quotes too");
  eq(fix("Chanukah' was the word"), "Chanukah' was the word", "apostrophe after a non-s word left alone");
  eq(fix("SHABBOS'S END"), "SHABBAT'S END", "all capitals with an ending");
});

// ---------------------------------------------------------------- capitals
test("capitals", () => {
  const t = "Halacha is clear. The halacha says so.";
  eq(keys(t), ["halacha", "halacha"], "sentence start counts as the same spelling");
  eq(fix(t), "Halachah is clear. The halachah says so.");
  eq(fix("the Halacha says", S()), "the Halachah says", "keep mode keeps a capital mid-sentence");
  eq(fix("the Halacha says", S("ch", { caps: "follow" })), "the halachah says", "follow mode lowercases it");
  eq(keys("the Halacha says", "follow"), ["Halacha"], "follow mode counts it as its own spelling");
  eq(keys("the Halacha says", "keep"), ["halacha"]);
  eq(fix("# The Laws of Kashrus\n", S("ch", { caps: "follow" })), "# The Laws of Kashrut\n", "headings keep capitals");
  eq(fix("Kashrus matters. He said: \"Halacha is clear.\"", S("ch", { caps: "follow" })),
    "Kashrut matters. He said: \"Halachah is clear.\"", "after a colon and a quote");
  eq(fix("We keep SHABBOS here."), "We keep SHABBAT here.", "all capitals");
  eq(fix("We keep shabbos here."), "We keep Shabbat here.", "lowercase proper noun gets its capital");
  eq(keys("Shabbos and shabbos"), ["Shabbos", "shabbos"], "a missing capital is a spelling of its own");
  eq(fix("- shul is open\n1. Halacha first", S("ch", { caps: "follow" })), "- shul is open\n1. Halachah first", "list items start a line");
  eq(fix("The Chasidic world", S("h")), "The Hasidic world");
  eq(keys("read the Megillah, the whole megillah", "keep"), ["megillah", "megillah"], "a kept capital isn't a spelling");
  eq(keys("read the Megillah, the whole megillah", "follow"), ["Megillah", "megillah"], "unless capitals follow the spelling");
  eq(fix("read the Megillah, the whole megillah"), "read the Megillah, the whole megillah", "the idiom stays lowercase");
  const t2 = "Shabbos and shabbos and Shabbat";
  const ms = find(t2);
  const sum = M.summarize(ms, M.planChanges(t2, ms, S()), S());
  eq([...sum[0].changedKeys].sort(), ["sg|Shabbos", "sg|shabbos"], "which spellings will change");
});

// ---------------------------------------------------------------- hyphens, spaces and capitals inside a term
test("hyphen and space variants", () => {
  const forms = ["Rosh Hashana", "Rosh HaShanah", "Rosh Hashanah", "Rosh-Hashanah", "Rosh ha-Shanah",
    "Rosh Ha-Shanah", "Rosh\nHashanah", "ROSH HASHANAH", "RoshHashanah", "Rosh  Hashanah"];
  const t = forms.join(", ") + ".";
  eq(ids(t), forms.map(() => "rosh-hashanah/sg"));
  eq(keys(t).slice(0, 7), ["Rosh Hashana", "Rosh HaShanah", "Rosh Hashanah", "Rosh-Hashanah", "Rosh ha-Shanah",
    "Rosh Ha-Shanah", "Rosh Hashanah"], "each written form is its own spelling, a line break counts as a space");
  eq(fix(t, S("acad")), forms.map((f) => (f === "ROSH HASHANAH" ? "ROSH HA-SHANAH" : "Rosh ha-Shanah")).join(", ") + ".");
  eq(ids("a bar-mitzvah, a bar mitzvah, a barmitzvah, a Bar Mitzvah"), Array(4).fill("bar-mitzvah/sg"));
  eq(ids("Ta'anit Esther and Taanit Esther and Ta’anit Esther"), Array(3).fill("taanit-esther/sg"));
  eq(ids("Tisha B’Av, Tisha b'Av and Tishah be-Av"), Array(3).fill("tisha-bav/sg"));
  eq(fix("Tisha b'Av", S("acad")), "Tishah be-Av");
});

// ---------------------------------------------------------------- overlapping terms
test("overlapping terms", () => {
  eq(ids("Rosh Hashanah"), ["rosh-hashanah/sg"], "not shanah");
  eq(ids("Shana Tova to all!"), ["shanah-tovah/sg"]);
  eq(spans("L'Shana Tova"), ["Shana Tova"], "the L' prefix is left alone");
  eq(ids("a sweet Rosh Hashana and a Shana Tova"), ["rosh-hashanah/sg", "shanah-tovah/sg"]);
  eq(ids("his bar mitzvah was a big mitzvah"), ["bar-mitzvah/sg", "mitzvah/sg"]);
  eq(ids("Simchat Torah and the Torah"), ["simchat-torah/sg", "torah/sg"]);
  eq(ids("Kriat Shema, then the Shema"), ["kriat-shema/sg", "shema/sg"]);
  eq(ids("matzo ball soup and a matzo"), ["matzo-ball/sg", "matzah/sg"]);
  eq(fix("matzo ball soup and a matzo"), "matzo ball soup and a matzah", "the dish keeps its name");
  eq(ids("Shiva Asar B'Tammuz and sitting shiva"), ["shiva-asar-btammuz/sg", "shiva/sg"]);
  eq(ids("the Purim spiel, a Purimspiel, on Purim"), ["purim-shpiel/sg", "purim-shpiel/sg", "purim/sg"]);
  eq(ids("a kiddush Hashem after Kiddush"), ["kiddush-hashem/sg", "kiddush/sg"]);
  eq(ids("Gut Shabbos and Good Shabbos on Shabbos"), ["gut-shabbos/sg", "gut-shabbos/en", "shabbat/sg"]);
  eq(fix("Gut Shabbos and Good Shabbos on Shabbos"), "Gut Shabbos and Good Shabbos on Shabbat", "greetings kept");
  eq(ids("a talmid chacham, a chacham"), ["talmid-chacham/sg", "chacham/sg"]);
  eq(ids("the Sefer Torah"), ["sefer-torah/sg"]);
  eq(ids("Kabbalat Shabbat and Kabbalah"), ["kabbalat-shabbat/sg", "kabbalah/sg"]);
  eq(ids("sheva brachot and brachot"), ["sheva-brachot/sg", "bracha/pl"]);
});

// ---------------------------------------------------------------- what must not match
test("must not match", () => {
  eq(ids("Chesedville and unchesed and chesedness"), [], "chesed inside another word");
  eq(ids("Shabbatai Tzvi"), [], "Shabbatai is a name");
  eq(ids("a Pesachdik kitchen"), [], "Pesachdik");
  eq(ids("Fifth Avenue"), [], "Av inside a word");
  eq(ids("the AV club met"), [], "AV in capitals");
  eq(ids("in Av we mourn"), ["av/sg"], "the month");
  eq(ids("the hag cackled"), [], "hag is never searched for");
  eq(ids("a Brit in London"), [], "Brit mid-sentence");
  eq(ids("the brit was at nine. Bris was the word."), ["bris/sg", "bris/sg"]);
  eq(ids("prayers to Shiva"), [], "Shiva mid-sentence");
  eq(ids("Mr. Cohen's shop"), [], "Cohen is a surname");
  eq(ids("it shames me"), [], "shames");
  eq(ids("Torahless"), [], "unknown ending");
  eq(ids("see https://www.chabad.org/shabbat/page and info@shabbat.org"), [], "links and email addresses");
  eq(ids("Tefillinless? no. Hallelujah!"), [], "Hallel inside Hallelujah");
  eq(ids("He was raving"), [], "no stray endings");
});

// ---------------------------------------------------------------- Sukkot and sukkot
test("Sukkot the festival, sukkot the booths", () => {
  const t = "On Sukkot we eat in our sukkot.";
  eq(ids(t), ["sukkot/sg", "sukkah/pl"]);
  eq(fix(t, S("ashk")), "On Sukkos we eat in our sukkos.");
  eq(fix("Succos is here", S("ch")), "Sukkot is here");
});

// ---------------------------------------------------------------- Unicode
test("unicode", () => {
  const t = "Ḥanukkah and Ḥanukkah";
  eq(ids(t), ["chanukah/sg", "chanukah/sg"]);
  eq(keys(t), ["Ḥanukkah", "Ḥanukkah"], "decomposed dot counts as the same spelling");
  eq(fix(t), "Chanukah and Chanukah");
  eq(fix("Hanukkah", S("acad")), "Ḥanukkah");
});

// ---------------------------------------------------------------- English equivalents
test("English forms are left alone unless asked", () => {
  const t = "the Sabbath and Shabbos and two Sabbaths";
  eq(ids(t), ["shabbat/en", "shabbat/sg", "shabbat/en"]);
  eq(fix(t), "the Sabbath and Shabbat and two Sabbaths");
  eq(fix(t, S("ch", { englishFix: { shabbat: true } })), "the Shabbat and Shabbat and two Shabbats");
  eq(fix("Passover", S("ch", { picks: { pesach: "Passover" } })), "Passover", "an English pick");
  eq(fix("Pesach and Passover", S("ch", { picks: { pesach: "Passover" } })), "Passover and Passover");
});

// ---------------------------------------------------------------- Yiddish verbs
test("verbs", () => {
  eq(ids("davening, davened and he davens"), ["daven/sg", "daven/sg", "daven/sg"]);
  eq(fix("stop schlepping", S("acad")), "stop shlepping", "doubled consonant");
  eq(fix("he schlepps it", S("ch")), "he schleps it");
  eq(ids("kvelling and kvetching"), ["kvell/sg", "kvetch/sg"]);
  eq(fix("bentsching after the meal"), "bentching after the meal");
});

// ---------------------------------------------------------------- picks, custom terms, stets
test("picks, custom terms and stet", () => {
  eq(fix("Shabbat and Shabbos", S("ch", { picks: { shabbat: "Shabbes" } })), "Shabbes and Shabbes");
  const cidx = M.buildIndex(data.terms, [
    { id: "c-1", use: "Moshiach", variants: ["Mashiach", "Moshiach"] },
    { id: "c-2", use: "Rambam", variants: ["RaMBaM", "Rambam", "Rambam's"] },
  ]);
  eq(ids("Mashiach and the RaMBaM", cidx), ["c-1/sg", "c-2/sg"], "custom terms win");
  eq(fix("Mashiach and the RaMBaM's view", S(), cidx), "Moshiach and the Rambam's view");
  const t = "Shabbos, Shabbos, Shabbos";
  const ch = M.planChanges(t, find(t), S());
  eq(ch.length, 3);
  eq(M.applyChanges(t, ch, new Set([ch[1].start])), "Shabbat, Shabbos, Shabbat", "stet the middle one");
  eq(ch.map((c) => c.line), [1, 1, 1]);
  const t2 = "line one\nShabbos\n\nand Chanukkah";
  eq(M.planChanges(t2, find(t2), S()).map((c) => c.line), [2, 4], "line numbers");
});

// ---------------------------------------------------------------- summary
test("summary for Findings", () => {
  const t = "Shabbos, Shabbat, Shabbos. Chanukah. Torah, Torah.";
  const ms = find(t);
  const sum = M.summarize(ms, M.planChanges(t, ms, S()), S());
  eq(sum.map((s) => s.term.id), ["shabbat", "torah", "chanukah"], "mixed first, then the most frequent");
  eq(sum[0].mixed, true);
  eq([...sum[0].forms.sg.entries()], [["Shabbos", 2], ["Shabbat", 1]]);
  eq(sum[0].changes, 2);
});

// ---------------------------------------------------------------- the whole term list, both ways
test("every spelling finds its own term", () => {
  let n = 0;
  for (const term of data.terms) {
    for (const form of ["sg", "pl", "en"]) {
      for (const v of M.formVariants(term, form)) {
        const text = `Then ${v} came.`;
        const got = M.findAll(text, idx);
        n++;
        const ok = got.length === 1 && got[0].term.id === term.id && got[0].form === form &&
          text.slice(got[0].start, got[0].end) === v;
        if (!ok) eq(got.map((m) => `${m.term.id}/${m.form}:${text.slice(m.start, m.end)}`), [`${term.id}/${form}:${v}`], v);
        else results.passed++;
      }
    }
  }
  results.spellings = n;
});

test("every house-style form round-trips", () => {
  for (const term of data.terms) {
    for (const base of M.STYLE_IDS) {
      for (const form of ["sg", "pl"]) {
        if (form === "pl" && !term.plural) continue;
        const want = form === "pl" ? term.plural.forms[base] : term.forms[base];
        if ((term.noMatch || []).includes(want)) continue;
        // write every spelling of this form in one text and fix it: each must become the style form
        const vs = M.formVariants(term, form);
        const line = (w) => `then ${w} came`;
        const text = vs.map(line).join("; ") + ".";
        const out = fix(text, S(base, { caps: "follow" }));
        const expected = vs.map(() => line(want)).join("; ") + ".";
        if (out !== expected) eq(out, expected, `${term.id} ${form} ${base}`);
        else results.passed++;
      }
    }
  }
});

// ---------------------------------------------------------------- speed
test("speed", () => {
  const para = "Last week we talked about Shabbos, and a few of you wrote in about how Shabbat looked in your " +
    "house. Rosh Hashana is near, so today it's the mitzvos of the season: the shofar, tashlich and davening " +
    "on Yom Kipur. In my family Chanukah was the big one, the Hanukkah candles were my job, and the halacha was clear. ";
  const big = para.repeat(600); // about 190,000 characters
  const t0 = performance.now();
  const ms = M.findAll(big, idx);
  const t1 = performance.now();
  M.planChanges(big, ms, S());
  results.ms.find = Math.round(t1 - t0);
  results.ms.chars = big.length;
  eq(ms.length, 600 * 11, "matches in the big text");
  eq(t1 - t0 < 3000, true, `findAll on ${big.length} characters took ${Math.round(t1 - t0)} ms`);
});

window.__results = results;
document.getElementById("out").textContent =
  `${results.failed ? "FAILED" : "OK"}: ${results.passed} passed, ${results.failed} failed\n\n` + results.failures.join("\n");
document.title = results.failed ? "Matcher tests: FAILED" : "Matcher tests: OK";
