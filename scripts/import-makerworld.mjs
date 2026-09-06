#!/usr/bin/env node
/**
 * Import MakerWorld models into the shop.
 *
 *   npm run import:makerworld            # enrich + write lib/imported.generated.ts
 *   npm run import:makerworld -- --dry   # show what it found, write nothing
 *   npm run import:makerworld -- --doctor# check the connection and explain failures
 *
 * HOW IT GETS THE DATA
 *
 * MakerWorld's HTML pages sit behind a Cloudflare challenge: curl, headless
 * Chromium and scraper services all get a 403 "Just a moment…". Their JSON API
 * does NOT: `GET /api/v1/design-service/design/<id>` answers 200 to a plain
 * request. So the split is:
 *
 *   1. the LIST of models in a collection comes from your own browser, via
 *      scripts/collect-in-browser.js → data/makerworld-raw.json
 *   2. the DETAILS of each model come from that API, right here.
 *
 * The API gives us the things guessing never could: the real licence, the
 * designer's name, the sliced weight in grams, the predicted print time in
 * seconds, the colour count, and MakerWorld's own categories and tags — which
 * classify a model onto the right shelf far better than its title does.
 *
 * Responses are cached in data/makerworld-details.tsv, so a re-run is instant
 * and still works with no network at all (--offline forces that).
 *
 * scripts/makerworld-sources.json is no longer read by this script; it is kept
 * as the written record of which collections the catalogue came from.
 */

import fs from "node:fs";
import path from "node:path";
// Shelves, holds, estimates and the API reader are shared with
// sync-collections.mjs, so the two importers cannot drift apart.
import {
  ROOT, API, c, sleep, getJson, fetchDetails, classify, holdsFor,
  readableTitle, fmtSize, ESTIMATE, HUE, ART, HE_DESC, SHELF_OVERRIDES,
} from "./lib/makerworld.mjs";

const log = (...a) => console.log(...a);
const RAW = path.join(ROOT, "data", "makerworld-raw.json");
const CACHE = path.join(ROOT, "data", "makerworld-details.tsv");
const OUT = path.join(ROOT, "lib", "imported.generated.ts");

const ARGS = new Set(process.argv.slice(2));
const DRY = ARGS.has("--dry");
const DOCTOR = ARGS.has("--doctor");
const NO_NET = ARGS.has("--offline");

// ── doctor ───────────────────────────────────────────────────────────────────
async function doctor() {
  log(c.b("\n  בדיקת מערכת — ייבוא ממייקרוורלד\n"));
  const nodeOk = Number(process.versions.node.split(".")[0]) >= 18;
  log(`  Node ${process.versions.node} ${nodeOk ? c.g("תקין") : c.r("ישן מדי")}`);
  if (!nodeOk) {
    log(c.r("  צריך Node 18 ומעלה. התקן מ-https://nodejs.org והרץ שוב.\n"));
    return false;
  }
  log(`  data/makerworld-raw.json ${fs.existsSync(RAW) ? c.g("קיים") : c.y("חסר — הרץ קודם את collect-models.html")}`);
  log(`  מטמון פרטים ${fs.existsSync(CACHE) ? c.g("קיים") : c.d("ריק")}`);

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) log(c.y(`  שים לב: מוגדר פרוקסי (${proxy}). אם ההורדה נכשלת — בטל אותו.`));

  const probe = await getJson(API(90174));
  if (probe.ok) {
    log(`  ה-API של מייקרוורלד ${c.g("עונה")} ${c.d("(דפי ה-HTML חסומים, ה-API לא)")}`);
    return true;
  }
  log(`  ה-API של מייקרוורלד ${c.r("לא עונה")} ${c.d(`(${probe.status || probe.error})`)}`);
  log(c.y("  אין גישה לאינטרנט, או שחומת אש חוסמת את node."));
  log(c.y("  אפשר להריץ עם --offline ולהשתמש במטמון הקיים.\n"));
  return false;
}

// ── detail cache (TSV, one row per model) ────────────────────────────────────
const CACHE_COLS = [
  "id", "license", "creator", "handle", "grams", "seconds", "colors", "ams",
  "downloads", "likes", "prints", "score", "tags", "cats",
];

function readCache() {
  if (!fs.existsSync(CACHE)) return new Map();
  const map = new Map();
  for (const line of fs.readFileSync(CACHE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const f = line.split("\t");
    if (f.length < CACHE_COLS.length) continue;
    map.set(f[0], {
      id: f[0], license: f[1], creator: f[2], handle: f[3],
      grams: +f[4] || 0, seconds: +f[5] || 0, colors: +f[6] || 1, ams: f[7] === "1",
      downloads: +f[8] || 0, likes: +f[9] || 0, prints: +f[10] || 0, score: +f[11] || 0,
      tags: f[12] ? f[12].split(",") : [], cats: f[13] ? f[13].split(",") : [],
    });
  }
  return map;
}

function writeCache(map) {
  const lines = [...map.values()].map((d) =>
    [
      d.id, d.license || "-", (d.creator || "-").replace(/\t/g, " "), d.handle || "-",
      d.grams, d.seconds, d.colors, d.ams ? 1 : 0,
      d.downloads, d.likes, d.prints, d.score,
      d.tags.join(","), d.cats.join(","),
    ].join("\t"),
  );
  fs.writeFileSync(CACHE, lines.join("\n") + "\n", "utf8");
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (DOCTOR) {
    process.exitCode = (await doctor()) ? 0 : 1;
    return;
  }

  if (!fs.existsSync(RAW)) {
    log(c.r("\n  data/makerworld-raw.json חסר."));
    log(c.y("  לחץ פעמיים על collect-models.html, עקוב אחרי ההוראות, והרץ שוב.\n"));
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.hits ?? raw.list ?? raw.models ?? [];
  const seen = new Set();
  const models = [];
  for (const it of list) {
    const id = String(it.id ?? it.designId ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, slug: it.slug || "", title: it.title || it.name || "", cover: it.cover || it.coverUrl });
  }

  log(c.b(`\n  ${models.length} מודלים ברשימה\n`));

  const cache = readCache();
  let fetched = 0;
  let failed = 0;

  if (!NO_NET) {
    const todo = models.filter((m) => !cache.has(m.id));
    if (todo.length) {
      log(`  מוריד פרטים מה-API של מייקרוורלד (${todo.length})…`);
      for (const m of todo) {
        const d = await fetchDetails(m.id);
        if (d) {
          cache.set(m.id, d);
          fetched++;
          if (fetched % 10 === 0) process.stdout.write(c.d(`   ${fetched}/${todo.length}\r`));
        } else {
          failed++;
        }
        await sleep(200); // be a polite guest
      }
      if (fetched) writeCache(cache);
      log(`  ${c.g(`${fetched} הורדו`)}${failed ? c.y(`, ${failed} נכשלו`) : ""}`);
    } else {
      log(c.d("  כל הפרטים כבר במטמון."));
    }
  } else {
    log(c.d("  --offline: משתמש רק במטמון."));
  }

  // ── build the rows ────────────────────────────────────────────────────────
  const rows = [];
  for (const m of models) {
    const d = cache.get(m.id) || {};
    const name = readableTitle((d.title || m.title || "").trim(), m.slug || d.slug);
    if (!name) continue;

    const shelf = SHELF_OVERRIDES[m.id] ?? classify(name, d.tags || [], d.cats || []);
    const est = ESTIMATE[shelf];
    const grams = d.grams || est.grams;
    const hours = d.seconds ? Math.round((d.seconds / 3600) * 10) / 10 : est.hours;
    const holds = holdsFor(`${name} ${(d.tags || []).join(" ")} ${(d.cats || []).join(" ")}`, d.license);

    rows.push({
      id: `mw-${m.id}`,
      name,
      desc: HE_DESC[shelf],
      shelf,
      hours: Math.max(0.2, hours),
      grams: Math.max(1, grams),
      size: fmtSize(grams),
      colors: Math.max(1, d.colors || est.colors),
      image: d.cover || m.cover,
      creator: d.creator || undefined,
      sourceUrl: `https://makerworld.com/en/models/${m.id}${m.slug ? `-${m.slug}` : ""}`,
      license: d.license || undefined,
      downloads: d.downloads || undefined,
      likes: d.likes || undefined,
      hue: HUE[shelf],
      art: ART[shelf],
      status: holds.length ? "hold" : "live",
      holds,
      licenseChecked: !!d.license,
    });
  }

  if (!rows.length) {
    log(c.r("\n  לא יובאו מודלים.\n"));
    await doctor();
    process.exitCode = 1;
    return;
  }

  // ── report ────────────────────────────────────────────────────────────────
  const byShelf = rows.reduce((a, r) => ((a[r.shelf] = (a[r.shelf] ?? 0) + 1), a), {});
  log(c.b(`\n  ${rows.length} מודלים:`));
  for (const [k, v] of Object.entries(byShelf)) log(`    ${k.padEnd(9)} ${v}`);

  const weapons = rows.filter((r) => r.holds.includes("weapon"));
  const brands = rows.filter((r) => r.holds.includes("brand"));
  const ncs = rows.filter((r) => r.holds.includes("license-nc"));
  const live = rows.filter((r) => !r.holds.includes("weapon") && !r.holds.includes("license-nc")).length;
  log(c.b(`\n  ${live} מודלים נכנסים לחנות.`));

  if (weapons.length) {
    log(c.y(`\n  ${weapons.length} מודלים סווגו כנשק ולא יוצגו למכירה:`));
    for (const w of weapons.slice(0, 10)) log(c.d(`    · ${w.name}`));
    if (weapons.length > 10) log(c.d(`    · ועוד ${weapons.length - 10}`));
    log(c.y("    מכירת נשק קר בישראל היא עבירה גם כשהוא מודפס בפלסטיק."));
  }
  if (brands.length) {
    log(c.y(`\n  ${brands.length} מודלים של דמויות ומותגים מוגנים — מוצגים לפי בקשתך:`));
    for (const b2 of brands.slice(0, 10)) log(c.d(`    · ${b2.name}`));
    if (brands.length > 10) log(c.d(`    · ועוד ${brands.length - 10}`));
    log(c.y("    מכירת העתקים של דמות מוגנת חושפת אותך לתביעה. זו החלטה שלך."));
  }

  const licences = rows.reduce((a, r) => ((a[r.license || "לא ידוע"] = (a[r.license || "לא ידוע"] ?? 0) + 1), a), {});
  log(c.b("\n  רישיונות:"));
  for (const [k, v] of Object.entries(licences).sort((a, b) => b[1] - a[1])) log(`    ${String(v).padStart(4)}  ${k}`);
  if (ncs.length) {
    log(c.y(`\n  ${ncs.length} מודלים ברישיון NC — המעצב כתב במפורש "לא למסחר", ולכן הם לא מוצגים:`));
    for (const n of ncs) log(c.d(`    · ${n.name} (${n.license})`));
  }

  if (DRY) {
    log(c.d("\n  --dry: לא נכתב קובץ.\n"));
    return;
  }

  const body = `// Auto-generated by scripts/import-makerworld.mjs — DO NOT EDIT BY HAND.
//
// Re-run \`npm run import:makerworld\` to refresh.
// Generated: ${new Date().toISOString()}
// Items: ${rows.length}

import type { ImportedModel } from "./imported";

export const IMPORTED_GENERATED: ImportedModel[] = ${JSON.stringify(rows, null, 2)};

export const IMPORTED_AT: string | null = ${JSON.stringify(new Date().toISOString())};
`;
  fs.writeFileSync(OUT, body, "utf8");
  log(c.g(`\n  נכתב ${path.relative(ROOT, OUT)}`));
  log(c.d("  הרץ npm run build כדי לראות את זה באתר.\n"));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
