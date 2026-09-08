#!/usr/bin/env node
/**
 * Proposes a Commons file for every unit that still has none.
 *
 *   npm run emblems:find
 *
 * scripts/emblems.json was filled in by hand and stopped 41 units in: the rest
 * carry a note saying the search budget ran out. Those 59 are why /catalog
 * still draws placeholders for two thirds of the army.
 *
 * This does the searching properly instead of by hand: several query shapes per
 * unit, one request a second with a real User-Agent (Commons rate-limits a
 * datacentre that asks faster — silently, as an empty result, which is how the
 * first attempt at this looked like "nothing exists"), and a score that prefers
 * a unit TAG over a flag or a photograph.
 *
 * It proposes; it does not decide. The candidates land in
 * data/emblem-candidates.json with their URLs so a person can look before any
 * of them is wired into emblems.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "scripts", "emblems.json");
const OUT = path.join(ROOT, "data", "emblem-candidates.json");
const API = "https://commons.wikimedia.org/w/api.php";
// Commons asks for a real agent with a contact. Without one it throttles hard.
const UA = "unit3d-emblem-finder/1.0 (https://github.com/AYochelman/unit3d)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, d: (s) => `\x1b[90m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m` };

async function search(query, limit = 8) {
  const url = `${API}?${new URLSearchParams({
    action: "query", format: "json", list: "search",
    srsearch: query, srlimit: String(limit), srnamespace: "6",
  })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.search ?? []).map((r) => r.title);
  }
  return [];
}

/** Distinctive words from a unit's name — a number, or a transliterated name. */
function tokens(entry) {
  const out = new Set();
  if (entry.number) out.add(String(entry.number));
  for (const src of [entry.name, entry.englishName ?? "", entry.nickname ?? ""]) {
    for (const m of String(src).matchAll(/\d{2,4}/g)) out.add(m[0]);
    for (const w of String(src).split(/[\s,()/'"־-]+/)) {
      if (w.length >= 4 && /^[A-Za-z]+$/.test(w) && !/brigade|israeli|israel|force|corps|unit|units|command|squadron|squadrons/i.test(w)) out.add(w.toLowerCase());
    }
  }
  return [...out];
}

function score(title, toks) {
  const t = title.toLowerCase();
  let s = 0;
  if (/\.svg$/.test(t)) s += 3;
  else if (/\.png$/.test(t)) s += 2;
  else if (/\.gif$/.test(t)) s += 1;
  else s -= 4;                                    // a jpg is almost always a photograph
  if (/insignia|emblem|badge|logo|semel|סמל|תג/.test(t)) s += 3;
  if (/flag|דגל/.test(t)) s -= 2;                 // a flag is not the shoulder tag
  if (/flickr|soldiers|visit|ceremony|training|exercise|pdf/.test(t)) s -= 6;
  if (/rank|דרגה/.test(t)) s -= 3;
  for (const k of toks) if (t.includes(k)) s += 4;
  return s;
}

async function main() {
  const entries = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const todo = entries.filter((e) => !e.file);
  console.log(c.b(`\n  ${todo.length} יחידות בלי קובץ. מחפש בקומונס...\n`));

  const found = [];
  for (const e of todo) {
    const toks = tokens(e);
    const en = (e.englishName || "").split("(")[0].trim();
    // A battalion is found by its number and its nickname, not by "גדוד 12" —
    // that phrase matches every battalion in the army.
    const queries = e.level === "גדוד"
      ? [
          e.number && `גדוד ${e.number} סמל`,
          e.number && `gdud ${e.number}`,
          e.nickname && `${e.nickname} גדוד תג`,
          e.nickname && `${e.nickname} סמל`,
          e.number && `battalion ${e.number} Israel insignia`,
        ].filter(Boolean)
      : [
          `${e.name} תג יחידה`,
          `${e.name} סמל`,
          en && `${en} insignia`,
          en && `${en} emblem`,
        ].filter(Boolean);

    const seen = new Map();
    for (const q of queries) {
      for (const title of await search(q)) {
        if (!seen.has(title)) seen.set(title, score(title, toks));
      }
      await sleep(1100); // one a second, as Commons asks
    }

    const ranked = [...seen.entries()]
      .filter(([t]) => /\.(svg|png|gif|jpe?g)$/i.test(t))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, s]) => ({
        title,
        score: s,
        page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      }));

    found.push({ slug: e.slug, name: e.name, englishName: e.englishName, candidates: ranked });
    const best = ranked[0];
    console.log(
      best && best.score > 0
        ? `  ${c.g("מועמד")} ${e.slug.padEnd(30)} ${best.title}  ${c.d(`(${best.score})`)}`
        : `  ${c.y("אין   ")} ${e.slug.padEnd(30)} ${c.d(e.name)}`,
    );
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ searchedAt: new Date().toISOString(), found }, null, 2)}\n`, "utf8");

  const withOne = found.filter((f) => f.candidates[0]?.score > 0).length;
  console.log(c.b(`\n  ${withOne} מתוך ${todo.length} קיבלו מועמד. נכתב ל-data/emblem-candidates.json\n`));
  console.log(c.d("  אף אחד מהם לא נכנס לאתר לבד — צריך לעבור עליהם ולהעביר ל-scripts/emblems.json.\n"));
}

main().catch((e) => { console.error(`\n  שגיאה: ${e.message}\n`); process.exitCode = 1; });
