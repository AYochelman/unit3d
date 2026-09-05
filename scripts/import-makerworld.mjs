#!/usr/bin/env node
/**
 * Import MakerWorld collections into the shop.
 *
 *   npm run import:makerworld            # fetch + write lib/imported.generated.ts
 *   npm run import:makerworld -- --dry   # show what it found, write nothing
 *   npm run import:makerworld -- --raw   # skip the network, read data/makerworld-raw.json
 *   npm run import:makerworld -- --doctor# check the connection and explain failures
 *
 * WHAT IT IMPORTS: the model's title, picture, designer, licence and a link
 * back — plus our own estimate of print time, weight and price. It does NOT
 * download or redistribute any STL. We sell a printing service and credit the
 * designer, which is what CC-BY asks for. Models under a NON-COMMERCIAL (NC)
 * licence are marked commercialOk:false and stay hidden until you have the
 * designer's written permission (see lib/imported.ts).
 *
 * Sources live in scripts/makerworld-sources.json.
 *
 * If MakerWorld is unreachable or changes its markup, run with --doctor: it
 * names the failure and the fix. As a last resort you can save a collection's
 * JSON response from the browser's Network tab to data/makerworld-raw.json and
 * re-run — the script will read that instead of the network.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = path.join(ROOT, "scripts", "makerworld-sources.json");
const RAW_FALLBACK = path.join(ROOT, "data", "makerworld-raw.json");
const OUT = path.join(ROOT, "lib", "imported.generated.ts");

const ARGS = new Set(process.argv.slice(2));
const DRY = ARGS.has("--dry");
const DOCTOR = ARGS.has("--doctor");
// --raw skips the network entirely and reads data/makerworld-raw.json, which is
// what scripts/collect-in-browser.js produces from your own logged-in browser.
const RAW_ONLY = ARGS.has("--raw");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 25_000;

// ── tiny console helpers ─────────────────────────────────────────────────────
const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  d: (s) => `\x1b[90m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = "text") {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": UA,
        "accept-language": "en-US,en;q=0.9,he;q=0.8",
        accept: as === "json" ? "application/json" : "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, body: as === "json" ? await res.json() : await res.text() };
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
    log(c.r("  צריך Node 18 ומעלה (fetch מובנה). התקן מ-https://nodejs.org והרץ שוב.\n"));
    return false;
  }

  const srcOk = fs.existsSync(SOURCES);
  log(`  scripts/makerworld-sources.json ${srcOk ? c.g("קיים") : c.r("חסר")}`);
  if (!srcOk) return false;

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) log(c.y(`  שים לב: מוגדר פרוקסי (${proxy}). אם ההורדה נכשלת — בטל אותו.`));

  const probe = await get("https://makerworld.com/en", "text");
  if (probe.ok) {
    log(`  חיבור ל-makerworld.com ${c.g("עובד")}`);
    return true;
  }
  log(`  חיבור ל-makerworld.com ${c.r("נכשל")} ${c.d(`(${probe.status || probe.error})`)}`);
  if (probe.status === 403 || probe.status === 429) {
    log(c.y("  האתר חוסם בקשות אוטומטיות כרגע. נסה שוב בעוד כמה דקות, או שמור את"));
    log(c.y("  ה-JSON של האוסף מלשונית Network בדפדפן אל data/makerworld-raw.json."));
  } else {
    log(c.y("  אין גישה לאינטרנט מהמחשב הזה, או שחומת אש חוסמת את node."));
  }
  log("");
  return false;
}

// ── classification ───────────────────────────────────────────────────────────
const RULES = [
  { shelf: "flexi",   re: /(flexi|articulat|print[- ]?in[- ]?place|dragon|snake|serpent|worm|octopus|axolotl|shark|lizard|gecko|pangolin|spider|scorpion|crab|dino|t-?rex|raptor|caterpillar|slug|seahorse|turtle)/i },
  { shelf: "fidget",  re: /(fidget|spinner|cube|slider|clicker|clicky|knob|popper|whirl|rattle|snapper|toy)/i },
  { shelf: "statues", re: /(statue|bust|sculpt|figure|figurine|model kit|low[- ]?poly|vase|trophy|lamp|moon|chess|diorama|display)/i },
  { shelf: "pets",    re: /(pet|dog|cat|collar|tag|paw|kibble|leash|aquarium)/i },
  { shelf: "office",  re: /(desk|pen|cable|headphone|monitor|organizer|card holder|stand|tray|clip|bookmark)/i },
  { shelf: "home",    re: /(planter|coaster|hook|kitchen|shelf|box|lid|bathroom|door|wall|light|holder)/i },
];

function classify(name, fallback = "trendy") {
  for (const r of RULES) if (r.re.test(name)) return r.shelf;
  return fallback === "auto" ? "trendy" : fallback;
}

// Print-time / weight estimates per shelf. MakerWorld does not expose the
// slicer numbers publicly, so these are deliberate, stated assumptions — edit
// them in /admin per item once you have sliced the model for real.
const ESTIMATE = {
  flexi:   { hours: 5.0, grams: 70,  size: "~160mm", colors: 2 },
  fidget:  { hours: 1.6, grams: 30,  size: "~65mm",  colors: 1 },
  statues: { hours: 9.0, grams: 140, size: "~150mm", colors: 1 },
  pets:    { hours: 0.6, grams: 7,   size: "~35mm",  colors: 2 },
  office:  { hours: 1.8, grams: 35,  size: "~90mm",  colors: 1 },
  home:    { hours: 2.2, grams: 45,  size: "~100mm", colors: 1 },
  trendy:  { hours: 2.0, grams: 40,  size: "~90mm",  colors: 1 },
};

const HUE = { flexi: 90, fidget: 280, statues: 320, pets: 30, office: 200, home: 260, trendy: 145 };
const ART = { statues: "lowpoly", pets: "round", office: "penholder", home: "planter", trendy: "keychain" };

const HE_DESC = {
  flexi: "יצור מפרקי שיוצא מהמדפסת כשהוא כבר זז. בלי דבק, בלי הרכבה.",
  fidget: "צעצוע שולחני להעסקת הידיים. הדפסה אחת, מוכן לשימוש.",
  statues: "פריט תצוגה בהדפסה איטית ובשכבות דקות. למדף, לא לכיס.",
  pets: "אביזר לחיה, מודפס ב-PETG שעמיד במים ובשמש.",
  office: "פריט לשולחן העבודה. אפשר עם שם או לוגו.",
  home: "פריט לבית. אפשר לבחור צבע וגודל.",
  trendy: "מודל פופולרי מהקהילה, מודפס אצלנו בצבע שתבחר.",
};

// CC-BY-NC / ND wording → not sellable without permission.
const isCommercialOk = (license) => !!license && !/nc|non[- ]?commercial/i.test(license);

// ── extraction ───────────────────────────────────────────────────────────────
/** Pull /en/models/<id>-<slug> links out of a page, keeping first-seen order. */
function modelsFromHtml(html) {
  const found = new Map();
  const re = /\/(?:en\/)?models\/(\d+)-([a-z0-9-]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (!found.has(id)) found.set(id, { id, slug: m[2], title: titleFromSlug(m[2]) });
  }
  // A nicer title, when the embedded JSON carries one for that id.
  for (const [id, item] of found) {
    const t = new RegExp(`"id"\\s*:\\s*${id}\\b[^{}]{0,400}?"(?:title|name)"\\s*:\\s*"([^"]{3,120})"`).exec(html)
      || new RegExp(`"(?:title|name)"\\s*:\\s*"([^"]{3,120})"[^{}]{0,400}?"id"\\s*:\\s*${id}\\b`).exec(html);
    if (t) item.title = unescapeJson(t[1]);
  }
  return [...found.values()];
}

const titleFromSlug = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()).trim();

const unescapeJson = (s) =>
  s.replace(/\\u([\da-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, "$1");

function firstMatch(html, ...res) {
  for (const re of res) {
    const m = re.exec(html);
    if (m) return unescapeJson(m[1]);
  }
  return undefined;
}

/** Best-effort details from a single model page. */
async function modelDetails(id, slug) {
  const res = await get(`https://makerworld.com/en/models/${id}-${slug}`, "text");
  if (!res.ok) return {};
  const h = res.body;
  return {
    title: firstMatch(h, /<meta property="og:title" content="([^"]+)"/i),
    image: firstMatch(h, /<meta property="og:image" content="([^"]+)"/i, /"coverUrl"\s*:\s*"([^"]+)"/i),
    creator: firstMatch(h, /"(?:designerName|nickname|handle)"\s*:\s*"([^"]{2,60})"/i),
    license: firstMatch(h, /"license"\s*:\s*"([^"]{2,40})"/i, /(CC[- ]BY(?:[- ]NC)?(?:[- ]ND|[- ]SA)?)/i),
    downloads: Number(firstMatch(h, /"downloadCount"\s*:\s*(\d+)/i) ?? 0) || undefined,
    likes: Number(firstMatch(h, /"likeCount"\s*:\s*(\d+)/i) ?? 0) || undefined,
  };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (DOCTOR) {
    process.exitCode = (await doctor()) ? 0 : 1;
    return;
  }

  if (!fs.existsSync(SOURCES)) {
    log(c.r("\n  scripts/makerworld-sources.json חסר. הרץ עם --doctor.\n"));
    process.exitCode = 1;
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(SOURCES, "utf8"));
  const limit = cfg.limitPerSource ?? 60;

  log(c.b(`\n  ייבוא מ-${cfg.sources.length} מקורות\n`));

  const rows = [];
  const seen = new Set();
  let networkFailures = 0;

  for (const src of RAW_ONLY ? [] : cfg.sources) {
    process.stdout.write(`  ${c.d("•")} ${src.label ?? src.url} … `);
    const res = await get(src.url, "text");
    if (!res.ok) {
      networkFailures++;
      log(c.r(`נכשל (${res.status || res.error})`));
      continue;
    }
    const models = modelsFromHtml(res.body).slice(0, limit);
    if (!models.length) {
      log(c.y("0 מודלים — ייתכן שהמבנה של האתר השתנה"));
      continue;
    }
    log(c.g(`${models.length} מודלים`));

    for (const m of models) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);

      let d = {};
      if (cfg.fetchModelPages) {
        d = await modelDetails(m.id, m.slug);
        await sleep(350); // be a polite guest on their servers
      }

      const name = (d.title || m.title).replace(/\s*[|·-]\s*MakerWorld.*$/i, "").trim();
      const shelf = src.shelf && src.shelf !== "auto" ? src.shelf : classify(name);
      const est = ESTIMATE[shelf];
      rows.push({
        id: `mw-${m.id}`,
        name,
        desc: HE_DESC[shelf],
        shelf,
        hours: est.hours,
        grams: est.grams,
        size: est.size,
        colors: est.colors,
        image: d.image,
        creator: d.creator,
        sourceUrl: `https://makerworld.com/en/models/${m.id}-${m.slug}`,
        license: d.license,
        downloads: d.downloads,
        likes: d.likes,
        hue: HUE[shelf],
        art: ART[shelf],
        commercialOk: isCommercialOk(d.license),
      });
    }
  }

  // Offline path: the JSON produced by scripts/collect-in-browser.js.
  if (!rows.length && fs.existsSync(RAW_FALLBACK)) {
    log(c.y("\n  קורא מ-data/makerworld-raw.json"));
    const raw = JSON.parse(fs.readFileSync(RAW_FALLBACK, "utf8"));
    const list = Array.isArray(raw) ? raw : (raw.hits ?? raw.list ?? raw.models ?? []);
    for (const it of list) {
      const name = it.title ?? it.name ?? "";
      if (!name) continue;
      const shelf = classify(name);
      const est = ESTIMATE[shelf];
      rows.push({
        id: `mw-${it.id ?? it.designId ?? name.replace(/\W+/g, "-").toLowerCase()}`,
        name, desc: HE_DESC[shelf], shelf,
        hours: est.hours, grams: est.grams, size: est.size, colors: est.colors,
        image: it.cover ?? it.coverUrl ?? it.image,
        // A slug-only row still gets a usable link.
        creator: it.designerName ?? it.nickname,
        sourceUrl:
          it.url ??
          (it.id ? `https://makerworld.com/en/models/${it.id}${it.slug ? `-${it.slug}` : ""}` : undefined),
        license: it.license,
        downloads: it.downloadCount, likes: it.likeCount,
        hue: HUE[shelf], art: ART[shelf],
        commercialOk: isCommercialOk(it.license),
      });
    }
  }

  if (!rows.length) {
    log(c.r("\n  לא יובאו מודלים."));
    log(c.y("  אם האתר חוסם: פתח את דף האוסף בדפדפן שלך, הדבק ב-Console את"));
    log(c.y("  scripts/collect-in-browser.js, שמור את הקובץ שיורד ל-data/makerworld-raw.json"));
    log(c.y("  והרץ שוב עם --raw.\n"));
    await doctor();
    process.exitCode = 1;
    return;
  }

  // ── report ────────────────────────────────────────────────────────────────
  const byShelf = rows.reduce((acc, r) => ((acc[r.shelf] = (acc[r.shelf] ?? 0) + 1), acc), {});
  log(c.b(`\n  ${rows.length} מודלים:`));
  for (const [k, v] of Object.entries(byShelf)) log(`    ${k.padEnd(9)} ${v}`);
  const blocked = rows.filter((r) => !r.commercialOk).length;
  if (blocked) log(c.y(`\n  ${blocked} מודלים ברישיון לא-מסחרי (NC) — מיובאים אבל מוסתרים מהחנות.`));
  if (networkFailures) log(c.y(`  ${networkFailures} מקורות נכשלו — הרץ --doctor לפרטים.`));

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
