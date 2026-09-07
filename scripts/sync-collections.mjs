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
const PENDING = path.join(ROOT, "data", "pending-models.json");
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
];
const shelfForCollection = (name) => COLLECTION_SHELF.find(([re]) => re.test(name))?.[1] ?? null;

async function browser() {
  const { chromium } = await import("playwright").catch(() => ({ chromium: null }));
  if (!chromium) throw new Error("playwright חסר — הרץ npm i -D playwright");
  const exe = process.env.PLAYWRIGHT_CHROMIUM;
  // MakerWorld sits behind Cloudflare, which challenges datacenter addresses on
  // sight. None of this defeats a challenge, but a headless browser that does
  // not announce itself as one gets shown far fewer of them.
  return chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

/**
 * A signed-in session, when one has been provided.
 *
 * Anonymous requests from a server are challenged by Cloudflare most of the
 * time, and a private collection is invisible to them in any case. Putting the
 * owner's MakerWorld cookie in the MAKERWORLD_COOKIE secret fixes both: the
 * session is trusted, and his private collections are readable. The job works
 * without it, just less reliably — so this is an upgrade, never a requirement,
 * and nothing here logs the cookie's value.
 */
async function context(b) {
  const ctx = await b.newContext({
    userAgent: UA,
    locale: "en-US",
    timezoneId: "Asia/Jerusalem",
    viewport: { width: 1440, height: 900 },
  });
  const raw = (process.env.MAKERWORLD_COOKIE || "").trim();
  if (raw) {
    const cookies = raw.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
      const i = p.indexOf("=");
      return { name: p.slice(0, i).trim(), value: p.slice(i + 1).trim(), domain: ".makerworld.com", path: "/" };
    }).filter((ck) => ck.name && ck.value);
    if (cookies.length) {
      await ctx.addCookies(cookies);
      log(c.d(`  משתמש בהתחברות שמורה (${cookies.length} עוגיות)`));
    }
  }
  return ctx;
}

const CHALLENGE = /just a moment|security verification|checking your browser|verify you are (not a bot|human)/i;

/**
 * Load a page and wait for it to be the page, not a challenge.
 *
 * Cloudflare's interstitial answers 200 with real HTML, so a naive read sees a
 * page with no models on it and concludes the collection is empty. That would
 * quietly stop importing anything the day the challenge starts appearing, which
 * is the one failure this job must never have.
 */
async function open(page, url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
    // The challenge clears itself on the same URL when it clears at all.
    for (let w = 0; w < 12; w++) {
      const title = await page.title().catch(() => "");
      if (!CHALLENGE.test(title)) return true;
      await page.waitForTimeout(2500);
    }
    log(c.d(`  אימות של Cloudflare (${i}/${tries}) — מנסה שוב`));
    await sleep(4000 * i);
  }
  return false;
}

const MODEL_ID = /models\\?\/(\d{3,9})-/g;
const idsIn = (html) => [...new Set([...html.matchAll(MODEL_ID)].map((m) => m[1]))];

const COLLECTION_HREF = /\/collections\/(\d+)-([a-z0-9-]+)/gi;

/**
 * Every public collection on the profile: id, slug and display name.
 *
 * The page is a React app behind a CDN that is slower for some visitors than
 * others, so this waits for the first collection link rather than for a fixed
 * number of seconds, and falls back to reading the ids out of the HTML when the
 * anchors are rendered in a way the selector misses.
 */
async function readCollections(page) {
  const ok = await open(page, `https://makerworld.com/en/@${PROFILE}/collections`);
  if (!ok) { log(c.y("  הפרופיל חסום כרגע על ידי Cloudflare — משתמש ברשימה השמורה")); return []; }
  await page.waitForSelector('a[href*="/collections/"]', { timeout: 45_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const out = new Map();
  const found = await page.$$eval('a[href*="/collections/"]', (as) =>
    as.map((a) => ({ href: a.getAttribute("href") || "", text: (a.textContent || "").trim() })),
  );
  for (const { href, text } of found) {
    const m = /\/collections\/(\d+)-([a-z0-9-]+)/i.exec(href);
    if (m) out.set(m[1], { id: m[1], slug: m[2], name: (text.split("\n")[0] || m[2]).slice(0, 40) });
  }
  if (!out.size) {
    for (const m of (await page.content()).matchAll(COLLECTION_HREF)) {
      out.set(m[1], { id: m[1], slug: m[2], name: m[2] });
    }
  }
  if (!out.size) {
    // Say what the page actually was — a challenge, a sign-in wall or an empty
    // profile all look the same from "no collections found".
    const title = await page.title();
    const text = (await page.evaluate(() => document.body.innerText)).slice(0, 220).replace(/\s+/g, " ");
    log(c.y(`  הפרופיל לא החזיר קולקציות. כותרת: "${title}"`));
    log(c.d(`  ${text}`));
  }
  return [...out.values()];
}

/**
 * Models queued by hand, waiting to be imported.
 *
 * Reading the collection pages needs a browser MakerWorld will talk to, and
 * some nights it will not talk to a server at all. The details API always
 * answers, so a model whose id is known can be imported from anywhere — which
 * makes this the escape hatch: drop ids in data/pending-models.json and the
 * next run picks them up whether or not it could open a single collection.
 */
function pendingIds() {
  if (!fs.existsSync(PENDING)) return [];
  const out = [];
  for (const group of JSON.parse(fs.readFileSync(PENDING, "utf8")).pending ?? []) {
    for (const id of group.ids ?? []) out.push({ id: String(id), shelf: shelfForCollection(group.collection || "") });
  }
  return out;
}

/** Drops the ids that just landed, so the queue only ever holds real work. */
function clearPending(done) {
  if (!fs.existsSync(PENDING) || !done.size) return;
  const doc = JSON.parse(fs.readFileSync(PENDING, "utf8"));
  doc.pending = (doc.pending ?? [])
    .map((g) => ({ ...g, ids: (g.ids ?? []).filter((id) => !done.has(String(id))) }))
    .filter((g) => g.ids.length);
  fs.writeFileSync(PENDING, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

/**
 * The collections the catalogue was originally built from.
 *
 * Used as a floor under whatever the profile page returns: if MakerWorld serves
 * a runner a page with no links, the job still checks the collections we know
 * about instead of reporting that he has none.
 */
function knownCollections() {
  const f = path.join(ROOT, "scripts", "makerworld-sources.json");
  if (!fs.existsSync(f)) return [];
  const out = [];
  for (const src of JSON.parse(fs.readFileSync(f, "utf8")).sources ?? []) {
    const m = /\/collections\/(\d+)-([a-z0-9-]+)/i.exec(src.url || "");
    if (m) out.push({ id: m[1], slug: m[2], name: src.label || m[2] });
  }
  return out;
}

/** Model ids in one collection, scrolling until the page stops adding any. */
async function readCollection(page, col) {
  const ok = await open(page, `https://makerworld.com/en/collections/${col.id}-${col.slug}`);
  if (!ok) return { blocked: true };
  await page.waitForTimeout(4000);
  if ((await page.evaluate(() => document.body.innerText)).includes("collection does not exist")) return { private: true };

  let ids = idsIn(await page.content());
  // A collection with models always renders at least one card. None at all
  // means the page did not finish, not that he emptied it.
  if (!ids.length) {
    await page.waitForTimeout(6000);
    ids = idsIn(await page.content());
    if (!ids.length) return { blocked: true };
  }

  // The list loads twenty at a time. Nudging the mouse wheel does not move a
  // page whose scroll container is the document, which is why every collection
  // used to come back with exactly its first page — scroll the document, and
  // give it several idle rounds before believing it has finished.
  let stall = 0;
  for (let i = 0; i < 60 && stall < 6; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.keyboard.press("End").catch(() => {});
    await page.waitForTimeout(1400);
    for (const b of await page.$$("button")) {
      const t = (await b.innerText().catch(() => "")).trim().toLowerCase();
      if (/load more|show more|view more/.test(t)) { await b.click().catch(() => {}); await page.waitForTimeout(1500); }
    }
    const next = idsIn(await page.content());
    if (next.length === ids.length) stall++;
    else { stall = 0; ids = next; }
  }
  return { ids };
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
  if (skipped.length) lines.push("", `קולקציות שלא נקראו: ${skipped.join(", ")}`, "", "קולקציה \"חסומה\" תיקרא בהרצה הבאה — Cloudffare חוסם לפעמים כתובות של שרתים.".replace("Cloudffare", "Cloudflare"));
  fs.appendFileSync(f, lines.join("\n") + "\n", "utf8");
}

async function main() {
  log(c.b(`\n  קורא את הקולקציות של @${PROFILE}\n`));
  const b = await browser();
  const ctx = await context(b);
  const page = await ctx.newPage();

  let collections;
  const wanted = [];
  const skipped = [];
  try {
    const seenCollections = new Map();
    for (const col of [...(await readCollections(page)), ...knownCollections()]) {
      if (!seenCollections.has(col.id)) seenCollections.set(col.id, col);
    }
    collections = [...seenCollections.values()];
    if (!collections.length) throw new Error("לא נמצאו קולקציות בפרופיל ואין רשימה שמורה");
    log(`  ${collections.length} קולקציות: ${collections.map((x) => x.name).join(", ")}\n`);

    for (const col of collections) {
      const res = await readCollection(page, col);
      if (res.private) { skipped.push(`${col.name} (פרטית)`); log(c.y(`  ${col.name}: פרטית, מדולגת`)); continue; }
      if (res.blocked) { skipped.push(`${col.name} (חסומה)`); log(c.y(`  ${col.name}: לא נקראה — Cloudflare`)); continue; }
      log(`  ${col.name}: ${res.ids.length} מודלים`);
      const shelf = shelfForCollection(col.name) ?? shelfForCollection(col.slug);
      for (const id of res.ids) wanted.push({ id, shelf });
    }
  } finally {
    await b.close();
  }

  if (skipped.some((x) => x.includes("חסומה"))) {
    log(c.y("\n  חלק מהקולקציות נחסמו על ידי Cloudflare. אפשר לתקן את זה לתמיד:"));
    log(c.d("  Settings → Secrets → Actions → New secret בשם MAKERWORLD_COOKIE,"));
    log(c.d("  והערך: העוגיות של makerworld.com מהדפדפן שלך אחרי התחברות."));
  }

  const queued = pendingIds();
  if (queued.length) log(c.d(`  ${queued.length} מודלים ממתינים ב-data/pending-models.json`));

  const known = knownIds();
  const seen = new Set();
  const fresh = [...wanted, ...queued].filter((x) => !known.has(x.id) && !seen.has(x.id) && seen.add(x.id));
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
  clearPending(new Set(rows.map((r) => r.id.slice(3))));
  summary(rows, skipped);
  log(c.g(`\n  נוספו ${rows.length} מודלים ל-lib/imported.generated.ts\n`));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
