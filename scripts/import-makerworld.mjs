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
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "data", "makerworld-raw.json");
const CACHE = path.join(ROOT, "data", "makerworld-details.tsv");
const OUT = path.join(ROOT, "lib", "imported.generated.ts");

const ARGS = new Set(process.argv.slice(2));
const DRY = ARGS.has("--dry");
const DOCTOR = ARGS.has("--doctor");
const NO_NET = ARGS.has("--offline");

const API = (id) => `https://makerworld.com/api/v1/design-service/design/${id}`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TIMEOUT_MS = 25_000;

const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  d: (s) => `\x1b[90m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, body: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
  }
}

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

// ── shelves ──────────────────────────────────────────────────────────────────
//
// MakerWorld tells us its own categories and tags, which beat guessing from a
// title. The title is only the tie-breaker.
const CAT_SHELF = [
  [/(sculpture|art|characters|people)/i, "statues"],
  [/(pets)/i, "pets"],
  [/(office|organizer|tools|3d printer|electronics|gadgets|hand tools)/i, "office"],
  [/(household|decor|house models|kitchen|footwear|fashion)/i, "home"],
  [/(animals|creatures|miniatures)/i, "flexi"],
  [/(toys & games|puzzles|construction sets|outdoor toys)/i, "fidget"],
];

const FLEXI_TAG = /(flexi|articulat|print in place|dragon|snake|dino|t-rex|octopus|frog|skeleton)/i;
const FIDGET_TAG = /(fidget|spinner|clicker|clicky|slider|popper|squishy|sensory|twisty|infinity|puzzle|slime)/i;
const STATUE_TAG = /(sculpture|statue|bust|figurine|figure|display|low poly|art|deko|shelf)/i;

const TITLE_RULES = [
  [/(flexi|articulat|bendy)/i, "flexi"],
  [/(fidget|spinner|clicker|clicky|slider|popper|squishy|sensory|infinity|twisty|slime)/i, "fidget"],
  [/(dragon|snake|serpent|worm|octopus|axolotl|shark|lizard|gecko|pangolin|scorpion|skorpion|crab|dino|t-?rex|raptor|frog|manta)/i, "flexi"],
  [/(statue|bust|sculpt|figurine|replica|low[- ]?poly|vase|trophy|lamp|moon|chess|skull|mask|charm)/i, "statues"],
  [/(pet |dog |cat |collar|paw|leash)/i, "pets"],
  [/(desk|pen |cable|usb|headphone|monitor|organizer|card holder|controller|tray|clip|bookmark|calendar|phone stand|keychain)/i, "office"],
  [/(planter|coaster|hook|kitchen|shelf|rack|box|lid|bathroom|door|wall|towel|toilet|shower|broom|holder|dispenser|stand|chair|opener|winder)/i, "home"],
];

function classify(title, tags = [], cats = []) {
  const tagStr = tags.join(" ");
  const catStr = cats.join(" ");

  // A flexi or a fidget can sit in any category, so the tags decide first.
  if (FLEXI_TAG.test(tagStr) && !FIDGET_TAG.test(title)) return "flexi";
  if (FIDGET_TAG.test(tagStr)) return "fidget";

  for (const [re, shelf] of CAT_SHELF) {
    if (re.test(catStr)) {
      // "Animals / Miniatures" is a flexi only when it actually articulates;
      // otherwise it is something for the display shelf.
      if (shelf === "flexi" && !FLEXI_TAG.test(tagStr) && !FLEXI_TAG.test(title)) {
        return STATUE_TAG.test(tagStr) ? "statues" : "statues";
      }
      return shelf;
    }
  }
  for (const [re, shelf] of TITLE_RULES) if (re.test(title)) return shelf;
  return "trendy";
}

// ── what we import but do NOT put on sale ────────────────────────────────────
const WEAPON_RE =
  /(knife|knives|katana|sword|blade|shuriken|kunai|karambit|balisong|dagger|machete|blowgun|bb (launcher|gun)|airsoft|pistol|shotgun|rifle|\bgun\b|ammo|bullet|throwing|nunchaku|taser|crossbow|spear)/i;

const BRAND_RE =
  /(kaws|bearbrick|be@rbrick|smiski|hello kitty|spider[- ]?man|spiderman|spider noir|miles morales|marvel|batman|superman|disney|pokemon|pikachu|mario|zelda|master sword|nintendo|star wars|mandalorian|jujutsu|mahoraga|demon slayer|tanjiro|bleach|zangetsu|chainsaw man|pochita|black clover|asta|one piece|naruto|dragon ball|subnautica|seraphon|warhammer|corvo|dishonored|panda by bambu|byd|stussy|nike|adidas|ferrari|lego|l3go|cheburashka|tscheburaschka)/i;

function holdsFor(text, license) {
  const holds = [];
  if (WEAPON_RE.test(text)) holds.push("weapon");
  if (BRAND_RE.test(text)) holds.push("brand");
  // A CC "NC" licence is the designer stating in writing that the model may not
  // be used commercially. That is not a judgement call like the two above.
  if (/(^|-)NC(-|$)/i.test(license || "")) holds.push("license-nc");
  return holds;
}

// Fallbacks for a model the API could not describe.
const ESTIMATE = {
  flexi:   { hours: 5.0, grams: 70,  colors: 2 },
  fidget:  { hours: 1.6, grams: 30,  colors: 1 },
  statues: { hours: 9.0, grams: 140, colors: 1 },
  pets:    { hours: 0.6, grams: 7,   colors: 2 },
  office:  { hours: 1.8, grams: 35,  colors: 1 },
  home:    { hours: 2.2, grams: 45,  colors: 1 },
  trendy:  { hours: 2.0, grams: 40,  colors: 1 },
};

const HUE = { flexi: 90, fidget: 280, statues: 320, pets: 30, office: 200, home: 260, trendy: 145 };
const ART = { statues: "lowpoly", pets: "round", office: "penholder", home: "planter", trendy: "keychain" };

const HE_DESC = {
  flexi: "יצור מפרקי שיוצא מהמדפסת כשהוא כבר זז. בלי דבק, בלי הרכבה.",
  fidget: "צעצוע שולחני להעסקת הידיים. הדפסה אחת, מוכן לשימוש.",
  statues: "פריט תצוגה בהדפסה איטית ובשכבות דקות. למדף, לא לכיס.",
  pets: "אביזר לחיה, מודפס ב-PETG שעמיד במים ובשמש.",
  office: "פריט לשולחן העבודה. אפשר עם שם או לוגו.",
  home: "פריט שימושי לבית. אפשר לבחור צבע וגודל.",
  trendy: "מודל פופולרי מהקהילה, מודפס אצלנו בצבע שתבחר.",
};

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

/** One model's details, straight from MakerWorld's API. */
async function fetchDetails(id) {
  const res = await getJson(API(id));
  if (!res.ok) return null;
  const d = res.body;
  const instances = d.instances || [];
  const best =
    instances.find((x) => x.isDefault) ||
    instances.slice().sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))[0] ||
    {};
  return {
    id: String(d.id ?? id),
    title: d.title || "",
    cover: (d.coverUrl || "").split("?")[0],
    slug: d.slug || "",
    license: d.license || "",
    creator: (d.designCreator || {}).name || "",
    handle: (d.designCreator || {}).handle || "",
    grams: best.weight || 0,
    seconds: best.prediction || 0,
    colors: best.materialColorCnt || best.materialCnt || 1,
    ams: !!best.needAms,
    downloads: d.downloadCount || 0,
    likes: d.likeCount || 0,
    prints: d.printCount || 0,
    score: Math.round((best.score || 0) * 1000) / 1000,
    tags: (d.tags || []).slice(0, 6),
    cats: (d.categories || []).map((x) => x.name || "").slice(0, 3),
    nsfw: !!d.nsfw,
  };
}

const titleFromSlug = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()).trim();

/** Latin letters in at least a third of the title, else fall back to the slug. */
const readableTitle = (title, slug) => {
  const latin = (title.match(/[A-Za-z]/g) || []).length;
  const letters = (title.match(/\p{L}/gu) || []).length;
  return letters && latin / letters >= 0.34 ? title : titleFromSlug(slug || "") || title;
};

const fmtSize = (grams) =>
  grams >= 300 ? "~250mm" : grams >= 120 ? "~160mm" : grams >= 40 ? "~100mm" : "~60mm";

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

    const shelf = classify(name, d.tags || [], d.cats || []);
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
