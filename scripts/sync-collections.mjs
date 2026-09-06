#!/usr/bin/env node
/**
 * Watch the owner's MakerWorld collections and add what he saved.
 *
 *   npm run sync:collections            # add anything new
 *   npm run sync:collections -- --dry   # say what it would add, write nothing
 *
 * He curates on his phone, in the Bambu Lab app: a model he likes goes into one
 * of his collections and he expects to find it in the shop. This runs nightly
 * (.github/workflows/sync-collections.yml), reads every PUBLIC collection on his
 * profile, and appends the models the catalogue does not have yet.
 *
 * It only ever ADDS. Rows already in lib/imported.generated.ts are left exactly
 * as they are — several carry hand-corrected names, shelves and plate figures
 * that a regenerate would throw away. (That is also why this is not a mode of
 * import-makerworld.mjs, which rewrites the whole file.)
 *
 * The same guards as every other import apply to what it adds: a weapon or a
 * model under a non-commercial licence is imported but held out of the shop.
 *
 * HOW IT READS THE COLLECTIONS
 * MakerWorld has no public collection API — every documented path answers `{}`
 * — but the pages render server-side, so the model ids are in the HTML. It
 * loads the profile with headless Chromium, follows each collection, and scrolls
 * until the list stops growing. A PRIVATE collection is invisible to anyone not
 * signed in and is skipped; the run says so rather than pretending it is empty.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, UA, c, sleep, fetchDetails, classify, holdsFor, platesFrom,
  readableTitle, fmtSize, ESTIMATE, HUE, ART, HE_DESC, SHELF_OVERRIDES,
} from "./lib/makerworld.mjs";

const OUT = path.join(ROOT, "lib", "imported.generated.ts");
const RAW = path.join(ROOT, "data", "makerworld-raw.json");
const PROFILE = process.env.MAKERWORLD_PROFILE || "Erez.yoch";

const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(...a);

/** The shelf a collection's name implies, when its name is that explicit. */
const COLLECTION_SHELF = [
  [/flexi/i, "flexi"],
  [/fidget/i, "fidget"],
  [/statue|sculpt/i, "statues"],
  [/pet/i, "pets"],
  [/smok|cigar|ashtray/i, "smoke"],
  [/movie|series|screen|film/i, "screen"],
  [/b2b|business|buisness/i, "b2b"],
];
const shelfForCollection = (name) => COLLECTION_SHELF.find(([re]) => re.test(name))?.[1] ?? null;

async function browser() {
  const { chromium } = await import("playwright").catch(() => ({ chromium: null }));
  if (!chromium) throw new Error("playwright חסר — הרץ npm i -D playwright");
  const exe = process.env.PLAYWRIGHT_CHROMIUM;
  return chromium.launch(exe ? { executablePath: exe } : {});
}

const MODEL_ID = /models\\?\/(\d{3,9})-/g;
const idsIn = (html) => [...new Set([...html.matchAll(MODEL_ID)].map((m) => m[1]))];

/** Every public collection on the profile: id, slug and display name. */
async function readCollections(page) {
  await page.goto(`https://makerworld.com/en/@${PROFILE}/collections`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(6000);
  const found = await page.$$eval('a[href*="/collections/"]', (as) =>
    as.map((a) => ({ href: a.getAttribute("href") || "", text: (a.textContent || "").trim() })),
  );
  const out = new Map();
  for (const { href, text } of found) {
    const m = href.match(/\/collections\/(\d+)-([a-z0-9-]+)/i);
    if (!m) continue;
    out.set(m[1], { id: m[1], slug: m[2], name: (text.split("\n")[0] || m[2]).slice(0, 40) });
  }
  return [...out.values()];
}

/** Model ids in one collection, scrolling until the page stops adding any. */
async function readCollection(page, col) {
  await page.goto(`https://makerworld.com/en/collections/${col.id}-${col.slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(5000);
  if ((await page.evaluate(() => document.body.innerText)).includes("collection does not exist")) return null;

  let ids = idsIn(await page.content());
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(900);
    const next = idsIn(await page.content());
    if (next.length === ids.length) break;
    ids = next;
  }
  return ids;
}

/** Ids the shop already knows about, whatever shelf or state they are in. */
function knownIds() {
  const src = fs.readFileSync(OUT, "utf8");
  return new Set([...src.matchAll(/"id": "mw-(\d+)"/g)].map((m) => m[1]));
}

function buildRow(id, d, shelfHint) {
  const name = readableTitle((d.title || "").trim(), d.slug);
  if (!name) return null;

  const shelf = SHELF_OVERRIDES[id] ?? shelfHint ?? classify(name, d.tags, d.cats);
  const est = ESTIMATE[shelf] ?? ESTIMATE.trendy;
  const p = platesFrom(d.instances);
  const grams = Math.max(1, p?.base.g ?? d.grams ?? est.grams);
  const hours = Math.max(0.2, p?.base.h ?? (d.seconds ? d.seconds / 3600 : est.hours));
  const holds = holdsFor(`${name} ${d.tags.join(" ")} ${d.cats.join(" ")}`, d.license);

  const row = {
    id: `mw-${id}`,
    name,
    desc: HE_DESC[shelf] ?? HE_DESC.trendy,
    shelf,
    hours: Math.round(hours * 100) / 100,
    grams,
    size: fmtSize(grams),
    colors: Math.max(1, p?.base.mc ?? d.colors ?? est.colors),
    image: d.cover ? `${d.cover}?x-oss-process=image/resize,w_400/format,webp` : undefined,
    creator: d.creator || undefined,
    sourceUrl: `https://makerworld.com/en/models/${id}${d.slug ? `-${d.slug}` : ""}`,
    license: d.license || undefined,
    downloads: d.downloads || undefined,
    hue: HUE[shelf] ?? HUE.trendy,
    art: ART[shelf] ?? ART.trendy,
    status: holds.length ? "hold" : "live",
    holds,
    licenseChecked: !!d.license,
  };
  if (p?.ams) { row.hoursAms = p.ams.h; row.gramsAms = p.ams.g; }
  if (p?.plates) row.plates = p.plates;
  return row;
}

/** Appends to the generated file without touching a single existing row. */
function append(rows) {
  let s = fs.readFileSync(OUT, "utf8");
  const block = rows.map((r) => "  " + JSON.stringify(r, null, 2).split("\n").join("\n  ")).join(",\n");
  const before = [...s.matchAll(/"id": "mw-(\d+)"/g)].length;
  s = s.replace(/\n\];\n\nexport const IMPORTED_AT/, ",\n" + block + "\n];\n\nexport const IMPORTED_AT");
  s = s.replace(/\/\/ Items: \d+/, `// Items: ${before + rows.length}`);
  fs.writeFileSync(OUT, s, "utf8");

  // Keep the record of where the catalogue came from in step with it.
  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
  const have = new Set(raw.map((r) => String(r.id)));
  for (const r of rows) {
    const id = r.id.slice(3);
    if (!have.has(id)) raw.push({ id, slug: r.sourceUrl.split("-").slice(1).join("-"), title: r.name, cover: r.image, url: r.sourceUrl });
  }
  fs.writeFileSync(RAW, JSON.stringify(raw, null, 2) + "\n", "utf8");
}

/** A line per model for the GitHub job summary, so the owner sees what landed. */
function summary(rows, skipped) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (!f) return;
  const lines = ["## מודלים חדשים מהקולקציות", ""];
  if (!rows.length) lines.push("לא נמצא שום דבר חדש.");
  else {
    lines.push("| דגם | מדף | מצב | רישיון |", "| --- | --- | --- | --- |");
    for (const r of rows) {
      const state = r.holds.includes("weapon") ? "לא למכירה (נשק)"
        : r.holds.includes("license-nc") ? "לא למכירה (NC)"
        : r.holds.includes("brand") ? "מותג — לפי בקשתך" : "בחנות";
      lines.push(`| [${r.name}](${r.sourceUrl}) | ${r.shelf} | ${state} | ${r.license ?? "—"} |`);
    }
  }
  if (skipped.length) lines.push("", `קולקציות פרטיות שלא ניתן לקרוא: ${skipped.join(", ")}`);
  fs.appendFileSync(f, lines.join("\n") + "\n", "utf8");
}

async function main() {
  log(c.b(`\n  קורא את הקולקציות של @${PROFILE}\n`));
  const b = await browser();
  const page = await b.newPage({ userAgent: UA });

  let collections;
  const wanted = [];
  const skipped = [];
  try {
    collections = await readCollections(page);
    if (!collections.length) throw new Error("לא נמצאו קולקציות בפרופיל");
    log(`  ${collections.length} קולקציות: ${collections.map((x) => x.name).join(", ")}\n`);

    for (const col of collections) {
      const ids = await readCollection(page, col);
      if (ids === null) { skipped.push(col.name); log(c.y(`  ${col.name}: פרטית, מדולגת`)); continue; }
      log(`  ${col.name}: ${ids.length} מודלים`);
      const shelf = shelfForCollection(col.name) ?? shelfForCollection(col.slug);
      for (const id of ids) wanted.push({ id, shelf });
    }
  } finally {
    await b.close();
  }

  const known = knownIds();
  const seen = new Set();
  const fresh = wanted.filter((x) => !known.has(x.id) && !seen.has(x.id) && seen.add(x.id));
  log(c.b(`\n  ${wanted.length} בקולקציות · ${fresh.length} חדשים\n`));
  if (!fresh.length) { summary([], skipped); return; }

  const rows = [];
  for (const { id, shelf } of fresh) {
    const d = await fetchDetails(id);
    if (!d) { log(c.y(`  ${id}: ה-API לא ענה, מדולג`)); continue; }
    const row = buildRow(id, d, shelf);
    if (row) rows.push(row);
    await sleep(250); // be a polite guest
  }
  if (!rows.length) { log(c.y("  שום דבר לא נוסף.")); summary([], skipped); return; }

  for (const r of rows) {
    const mark = r.holds.length ? c.y(`[${r.holds.join(",")}]`) : c.g("[בחנות]");
    log(`  ${mark} ${r.name} → ${r.shelf}`);
  }

  if (DRY) { log(c.d("\n  --dry: לא נכתב קובץ.\n")); return; }
  append(rows);
  summary(rows, skipped);
  log(c.g(`\n  נוספו ${rows.length} מודלים ל-lib/imported.generated.ts\n`));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
