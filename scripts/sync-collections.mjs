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
import { pathToFileURL } from "node:url";
import {
  ROOT, UA, c, sleep, fetchDetails, classify, holdsFor, platesFrom,
  readableTitle, SHELF_OVERRIDES,
} from "./lib/makerworld.mjs";

const OUT = path.join(ROOT, "lib", "imported.generated.ts");
const PENDING = path.join(ROOT, "data", "pending-models.json");
const CANDIDATES = path.join(ROOT, "lib", "candidates.generated.ts");
const DECISIONS = path.join(ROOT, "public", "model-decisions.json");
const PROFILE = process.env.MAKERWORLD_PROFILE || "Erez.yoch";
const LOGIN = process.argv.slice(2).includes("--login");
// A visible window for the nightly run too, when MAKERWORLD_HEADFUL is set.
// Headless is the more suspicious of the two to a challenge, and the escape
// hatch costs nothing: on the one machine this runs on, a window opening at
// 07:45 is a smaller problem than a run that quietly reads nothing.
const HEADFUL = !!(process.env.MAKERWORLD_HEADFUL || "").trim();
// No browser at all: work from data/pending-models.json and the details API.
//
// Cloudflare serves the collection pages the challenge with a box to tick, and
// a driven browser cannot tick it — that is exactly what the box is checking,
// and no flag, no real Chrome and no visible window changes the answer. The
// ids come from his own browser instead (scripts/collect-collections-in-browser.js),
// and everything after that — licence, shelf, figures, pictures — is the API,
// which has never once refused us. So this mode is not a lesser fallback: it
// is the whole job minus the one step a person does in three clicks.
const OFFLINE = process.argv.slice(2).includes("--offline");

const DRY = process.argv.includes("--dry");
/**
 * Approve what came out of the owner's OWN collections, without asking again.
 *
 * The shop's standing rule is that nothing reaches a shelf that nobody said
 * yes to, and a sweep of trending models absolutely needs that gate. A model
 * the owner saved to one of his own collections is different: saving it WAS
 * the yes. Asking him to click approve on a list he assembled himself is the
 * same decision twice.
 *
 * Two things stay behind the gate even in this mode, and deliberately:
 *   · a LIKE is still only a nomination. He said "collections only", and a
 *     like is how you remember something, not how you choose to sell it.
 *   · anything `holdsFor` flagged — a non-commercial licence, a weapon, a
 *     brand — waits for him whatever collection it sits in. Those are the
 *     cases where approving by habit is how a shop ends up selling something
 *     it may not sell, and no collection membership answers them.
 */
const PUBLISH = process.argv.includes("--publish");
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

/**
 * Where a signed-in browser can live between runs.
 *
 * Set MAKERWORLD_PROFILE_DIR and the run uses a real browser profile on disk
 * instead of a blank one: sign in there once (`npm run sync:collections --
 * --login`) and every run after that is already signed in, and stays signed in,
 * because the site refreshes that profile's own cookies like it would anyone's.
 * No secret to paste, nothing to re-paste when it expires.
 *
 * This is the setup that actually works, and the reason is the address, not the
 * login: Cloudflare serves the collection PAGES a challenge to every datacenter
 * — GitHub's runners and a hosted browser service alike, tested — while the
 * design API answers them fine. A home connection is not challenged. So the
 * profile belongs on the owner's own machine, which is also the one place his
 * session never has to be copied to.
 */
const PROFILE_DIR = (process.env.MAKERWORLD_PROFILE_DIR || "").trim();

async function browser() {
  const { chromium } = await import("playwright").catch(() => ({ chromium: null }));
  if (!chromium) throw new Error("playwright חסר — הרץ npm i -D playwright");
  const exe = process.env.PLAYWRIGHT_CHROMIUM;
  // MakerWorld sits behind Cloudflare, which challenges datacenter addresses on
  // sight. None of this defeats a challenge, but a headless browser that does
  // not announce itself as one gets shown far fewer of them.
  const args = ["--disable-blink-features=AutomationControlled"];

  if (PROFILE_DIR) {
    // A persistent context IS the context — there is no separate browser to
    // open one from — so it answers both calls and `context()` passes it on.
    //
    // No userAgent override here, and the installed Chrome in preference to
    // Playwright's own build. Both for the same reason: the challenge page was
    // looping forever on this profile. A UA string saying Chrome 131 travels
    // with Sec-CH-UA headers the browser fills in from its REAL version, so the
    // two disagree, and disagreeing with yourself about what browser you are is
    // exactly what the challenge looks for. Real Chrome, telling the truth
    // about itself, from his own home address, is a person as far as
    // Cloudflare can tell — which is what it is.
    const opts = {
      headless: !HEADFUL,
      args,
      // Playwright adds --enable-automation of its own accord, and it was in
      // every launch line while every page came back a challenge. It is the
      // loudest thing a browser can say about itself, said before any page
      // loads. Dropping it is not a disguise: this IS his browser, his
      // profile and his address, and the flag was describing the wrapper
      // rather than the person on the other end of it.
      ignoreDefaultArgs: ["--enable-automation"],
      locale: "en-US",
      timezoneId: "Asia/Jerusalem",
      viewport: { width: 1440, height: 900 },
    };
    // Whatever opens this profile must be the browser that CREATED it. A
    // profile written by real Chrome does not open in Playwright's Chromium:
    // it closes on the spot. An earlier version fell back to Chromium when
    // Chrome failed to start, which turned a clear error into "Target page,
    // context or browser has been closed" and lost the reason with it. So no
    // fallback here — if Chrome will not start, say why.
    let ctx;
    try {
      ctx = exe
        ? await chromium.launchPersistentContext(PROFILE_DIR, { ...opts, executablePath: exe })
        : await chromium.launchPersistentContext(PROFILE_DIR, { ...opts, channel: "chrome" });
    } catch (e) {
      // "Opening in existing browser session" is Chrome saying a process is
      // ALREADY on this profile: it handed the request over and exited, which
      // closes the pipe and surfaces as the unhelpful "Target page, context or
      // browser has been closed". Closing the window does not always end that
      // process, so say what to do about it rather than what it said.
      if (/Opening in existing browser session/i.test(e.message)) {
        log(c.r("\n  כבר רץ כרום על תיקיית הפרופיל הזו, והוא תפס אותה."));
        log(c.y("  לסגור את כל חלונות כרום ואז:  taskkill /F /IM chrome.exe"));
        log(c.d("  ואחר כך להריץ שוב.\n"));
      } else {
        log(c.r(`\n  כרום לא נפתח על הפרופיל: ${e.message.split("\n")[0]}`));
        log(c.y("  לוודא שאין חלון כרום פתוח על אותה תיקייה, ואז להריץ שוב."));
        log(c.d("  אפשר גם להצביע על כרום ידנית:  set PLAYWRIGHT_CHROMIUM=<נתיב ל-chrome.exe>\n"));
      }
      throw e;
    }
    ctx.__persistent = true;
    log(c.d(`  פרופיל דפדפן שמור: ${PROFILE_DIR}`));
    return ctx;
  }

  return chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    args,
  });
}

/**
 * Sign in once, by hand, into the profile the nightly run will use.
 *
 * This opens ORDINARY CHROME — not Playwright, not a driven browser, no flags
 * beyond the profile directory — and waits while he signs in himself. Nothing
 * is typed for him and no password is ever read here.
 *
 * It has to be ordinary Chrome, and that was learned the hard way. A driven
 * browser cannot finish Cloudflare's challenge on the Bambu Lab sign-in at all:
 * the "Verify you are human" box never ticks, however many times it is clicked,
 * because the thing it is checking for is precisely that the browser is being
 * driven. There is no flag that argues with that and there should not be — the
 * honest answer is to let a person use a person's browser. He signs in, the
 * profile keeps the cookies, and the nightly run inherits a session that was
 * created by a human being, which is what it is.
 */
function chromePath() {
  const set = (process.env.CHROME_PATH || "").trim();
  if (set) return set;
  const env = (k) => process.env[k] || "";
  const candidates = process.platform === "win32"
    ? [
        path.join(env("ProgramFiles"), "Google/Chrome/Application/chrome.exe"),
        path.join(env("ProgramFiles(x86)"), "Google/Chrome/Application/chrome.exe"),
        path.join(env("LOCALAPPDATA"), "Google/Chrome/Application/chrome.exe"),
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find((f) => f && fs.existsSync(f)) || null;
}

async function login() {
  if (!PROFILE_DIR) {
    log(c.r("\n  צריך MAKERWORLD_PROFILE_DIR כדי לשמור את ההתחברות.\n"));
    return;
  }
  const chrome = chromePath();
  if (!chrome) {
    log(c.r("\n  לא מצאתי את כרום."));
    log("  אפשר להצביע עליו ידנית:  set CHROME_PATH=C:\\Path\\To\\chrome.exe\n");
    return;
  }

  const { spawn } = await import("node:child_process");
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  // The home page, not /en/login: that path 404s now, and a login URL is the
  // most likely thing on a site to move. The home page has carried a sign-in
  // link through every redesign so far, and a person can find it there even
  // when it moves again — which a hardcoded path cannot.
  const child = spawn(chrome, [`--user-data-dir=${path.resolve(PROFILE_DIR)}`, "https://makerworld.com/en/"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  log(c.b("\n  נפתח כרום רגיל — בלי שום אוטומציה, ולכן בדיקת Cloudflare תיגמר כרגיל."));
  log("  ללחוץ Sign In בפינה ולהתחבר.");
  log(c.y("\n  כשמסיימים: לסגור את חלון הדפדפן, ורק אז לחזור לכאן וללחוץ Enter."));
  log(c.d("  (הסגירה היא מה שמוודא שהעוגיות נכתבו לדיסק.)\n"));
  await new Promise((res) => process.stdin.once("data", res));
  log(c.g("  ההתחברות נשמרה. מעכשיו כל הרצה כבר מחוברת.\n"));
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
  // A persistent context is already the context, cookies and all.
  if (b.__persistent) return b;
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

  // Everything above is the browser trying by itself, and on the collection
  // pages it does not get through: the challenge there is the one with a box
  // to tick, and a driven browser cannot tick it — that IS what the box is
  // asking. But the window is open in front of him, and he can. One click
  // earns a clearance cookie for the whole domain, so the remaining
  // collections sail past without asking again.
  if (HEADFUL) {
    await page.bringToFront().catch(() => {});
    log(c.y("\n  יש אתגר בחלון הדפדפן. ללחוץ שם על התיבה \"Verify you are human\"."));
    log(c.d("  לחיצה אחת מספיקה לכל השאר. מחכה עד 3 דקות...\n"));
    for (let w = 0; w < 60; w++) {
      const title = await page.title().catch(() => "");
      if (!CHALLENGE.test(title)) {
        log(c.g("  עבר. ממשיך.\n"));
        return true;
      }
      await page.waitForTimeout(3000);
    }
    log(c.r("  האתגר לא נפתר. ממשיך הלאה.\n"));
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
/**
 * What to call a collection in the log.
 *
 * The slug, normally. The card's text used to be the title on its own line,
 * and the first line was a fine name; the card now runs the whole thing
 * together and the "first line" comes out "+63FollowOthers67 models0
 * followers". The slug is the title MakerWorld itself derived from the name,
 * it has not moved, and it is what the shelf rules match on anyway — so the
 * text is only consulted when it looks like a title and not like a card.
 */
function nameOf(slug, text) {
  const first = (text || "").split("\n")[0].trim();
  const clean = first && first.length <= 40 && !/\d\s*(models|followers)|Follow/i.test(first);
  return clean ? first : slug.replace(/-/g, " ");
}

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
    if (m) out.set(m[1], { id: m[1], slug: m[2], name: nameOf(m[2], text) });
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
  // "Turned away at the door" and "walked in and found the furniture moved" are
  // different problems with different fixes, and they were reported with the
  // same word — so eight collections came back "blocked" with no way to know
  // which it was.
  if (!ok) return { blocked: true, why: "cloudflare" };
  await page.waitForTimeout(4000);
  if ((await page.evaluate(() => document.body.innerText)).includes("collection does not exist")) return { private: true };

  let ids = idsIn(await page.content());
  // A collection with models always renders at least one card. None at all
  // means the page did not finish, not that he emptied it.
  if (!ids.length) {
    await page.waitForTimeout(6000);
    ids = idsIn(await page.content());
    if (!ids.length) {
      // What the page DID contain, so a changed layout names itself instead of
      // hiding behind "blocked" for another month.
      const probe = await page.evaluate(() => {
        const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") || "");
        return {
          title: document.title.slice(0, 80),
          links: hrefs.length,
          modelish: hrefs.filter((h) => /\/models?\//.test(h)).length,
          sample: [...new Set(hrefs.filter((h) => h.length < 70))].slice(0, 8),
          text: (document.body.innerText || "").trim().replace(/\s+/g, " ").slice(0, 140),
        };
      }).catch(() => null);
      return { blocked: true, why: "no-model-links", probe };
    }
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

/**
 * The models he liked.
 *
 * A like is weaker than a collection: a collection is "I want this", a like is
 * "this is good". So likes do NOT go on a shelf — they land in /admin →
 * "מודלים לאישור", where he decides per model, which is the standing rule for
 * anything the shop did not choose itself.
 *
 * MakerWorld has moved this tab around, so the URL is tried rather than
 * assumed, and the log says which one answered.
 */
async function readLikes(page) {
  // The tab is rendered by a client-side call, so the honest way to find it is
  // to watch what the profile asks for. Anything under /api/v1 that mentions a
  // like is remembered, and then replayed page by page.
  const seen = new Set();
  const watch = (req) => {
    const u = req.url();
    if (/\/api\/v\d\//.test(u) && /like|favorit|collect/i.test(u)) seen.add(u.split("#")[0]);
  };
  page.on("request", watch);

  const tabs = [
    `https://makerworld.com/en/@${PROFILE}/likes`,
    `https://makerworld.com/en/@${PROFILE}?tab=likes`,
    `https://makerworld.com/en/@${PROFILE}?tab=liked`,
    `https://makerworld.com/en/@${PROFILE}/like`,
    `https://makerworld.com/@${PROFILE}/likes`,
    `https://makerworld.com/en/@${PROFILE}`,
  ];

  let ids = [];
  for (const url of tabs) {
    // One try each: these are guesses, and six guesses at three Cloudflare
    // retries apiece cost more than half an hour of the job.
    if (!(await open(page, url, 1))) continue;
    await page.waitForTimeout(4000);

    // On the bare profile, the tab is a control rather than a link.
    if (url.endsWith(`@${PROFILE}`)) {
      const hit = page.locator('a,button,[role="tab"]').filter({ hasText: /^\s*(likes?|liked|לייקים|אהבתי)\s*$/i }).first();
      if (await hit.count()) {
        await hit.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(4000);
      }
    }

    let found = idsIn(await page.content());
    if (!found.length) { await page.waitForTimeout(5000); found = idsIn(await page.content()); }
    if (!found.length) continue;

    let stall = 0;
    for (let i = 0; i < 60 && stall < 6; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.keyboard.press("End").catch(() => {});
      await page.waitForTimeout(1400);
      const next = idsIn(await page.content());
      if (next.length === found.length) stall++;
      else { stall = 0; found = next; }
    }
    ids = found;
    log(c.g(`  לייקים: ${ids.length} מודלים`) + c.d(`  (${url})`));
    break;
  }

  // Whatever the page itself called is the reliable list — the HTML only ever
  // holds the cards that were scrolled into view.
  for (const base of seen) {
    try {
      const url = base.replace(/([?&])(offset|limit)=\d+/g, "$1$2=0").replace(/limit=0/, "limit=100");
      const res = await page.request.get(url, { headers: { accept: "application/json" } });
      if (!res.ok()) continue;
      const body = await res.text();
      const apiIds = [...body.matchAll(/"(?:design|model)?[Ii]d"\s*:\s*"?(\d{4,9})"?/g)].map((m) => m[1]);
      if (apiIds.length > ids.length) {
        ids = [...new Set(apiIds)];
        log(c.g(`  לייקים דרך ה-API: ${ids.length} מודלים`) + c.d(`  (${url})`));
      }
    } catch {
      /* a probe that fails tells us nothing worth stopping for */
    }
  }

  page.off("request", watch);
  if (!ids.length) {
    log(c.y("  לייקים: לא נקראו — הטאב לא נענה או שהוא מוסתר בלי התחברות"));
    if (seen.size) log(c.d(`  קריאות שנצפו: ${[...seen].slice(0, 6).join(", ")}`));
  }
  return ids;
}

/** Ids the shop already knows about, whatever shelf or state they are in. */
function knownIds() {
  const src = fs.readFileSync(OUT, "utf8");
  return new Set([...src.matchAll(/"id": "mw-(\d+)"/g)].map((m) => m[1]));
}

/**
 * The same model, described for the approval queue instead of the shelf.
 *
 * A collection used to go straight onto the shop. That quietly broke the rule
 * the shop runs on — nothing is sold that nobody said yes to — and it meant
 * saving a model on a phone published it. Now a collection is a nomination: it
 * arrives in /admin → "מודלים לאישור" with the shelf its collection implies
 * already filled in, so approving it is one click rather than a decision made
 * from scratch.
 */
function buildCandidate(id, d, shelfHint, via) {
  const title = readableTitle((d.title || "").trim(), d.slug);
  if (!title) return null;
  const p = platesFrom(d.instances, d.defaultInstanceId);
  const grams = Math.max(1, p?.base.g ?? d.grams ?? 30);
  const hours = Math.max(0.2, p?.base.h ?? (d.seconds ? d.seconds / 3600 : 2));

  return {
    id: String(id),
    title,
    slug: d.slug || "",
    license: d.license || "",
    creator: d.creator || "",
    image: d.cover ? `${d.cover}?x-oss-process=image/resize,w_400/format,webp` : "",
    downloads: d.downloads || 0,
    likes: d.likes || 0,
    grams,
    hours: Math.round(hours * 100) / 100,
    colors: Math.max(1, p?.base.mc ?? d.colors ?? 1),
    suggested: SHELF_OVERRIDES[id] ?? shelfHint ?? classify(title, d.tags, d.cats),
    // The same reasons a model would be held out of the shop are the reasons
    // to look twice before approving it: a brand, a weapon, a licence that
    // forbids selling.
    warnings: holdsFor(`${title} ${d.tags.join(" ")} ${d.cats.join(" ")}`, d.license),
    via,
    tags: d.tags.join(" · "),
  };
}

/** Ids the owner has already answered — approved or rejected. Never re-ask. */
function decidedIds() {
  try {
    const f = JSON.parse(fs.readFileSync(DECISIONS, "utf8"));
    return new Set((f.decisions ?? []).map((d) => String(d.id)));
  } catch {
    return new Set();
  }
}

/**
 * Put the nominations in the queue, keeping whatever is already waiting there.
 *
 * Newest first: what he saved this week is what he wants to see when he opens
 * the tab, not whatever a sweep found a month ago.
 */
function queueCandidates(rows) {
  let existing = [];
  try {
    const src = fs.readFileSync(CANDIDATES, "utf8");
    const m = /export const CANDIDATES: Candidate\[\] = (\[[\s\S]*\]);/.exec(src);
    if (m) existing = JSON.parse(m[1]);
  } catch { /* an unreadable queue is an empty one */ }

  const seen = new Set(rows.map((r) => String(r.id)));
  const merged = [...rows, ...existing.filter((r) => !seen.has(String(r.id)))];

  fs.writeFileSync(
    CANDIDATES,
    `// Auto-generated by scripts/sync-collections.mjs — DO NOT EDIT BY HAND.\n` +
      `//\n// Models waiting for approval in /admin → "מודלים לאישור". Nothing here is\n` +
      `// on the shop; the owner decides, one by one, in that tab.\n` +
      `// Items: ${merged.length}\n// Collected: ${new Date().toISOString()}\n\n` +
      `import type { Candidate } from "./candidates";\n\n` +
      `export const CANDIDATES: Candidate[] = ${JSON.stringify(merged, null, 2)};\n`,
    "utf8",
  );
  return merged.length;
}

/**
 * Write "approved" for the collection models that need no second look.
 *
 * It answers into the SAME file /admin writes (public/model-decisions.json),
 * so `npm run apply:approvals` builds the catalogue rows exactly as it does
 * for a decision made by hand. One path to the shelf, whoever said yes.
 *
 * Returns the rows it approved, so the run can report the split.
 */
export function approveClean(rows) {
  const ok = rows.filter((r) => r.via === "collection" && !r.warnings.length);
  if (!ok.length) return [];

  let doc = { version: 1, decisions: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(DECISIONS, "utf8"));
    if (Array.isArray(parsed?.decisions)) doc = parsed;
  } catch { /* an unreadable decisions file is an empty one */ }

  // Never overwrite an answer that already exists — a rejection especially.
  // `fresh` above already drops decided ids, so this is the belt to that
  // brace: a model the owner said no to must not come back as a yes because
  // it is still sitting in a collection he never cleaned out.
  const answered = new Set(doc.decisions.map((d) => String(d.id)));
  const at = new Date().toISOString();
  const added = [];
  for (const r of ok) {
    if (answered.has(String(r.id))) continue;
    doc.decisions.push({ id: String(r.id), decision: "approved", shelf: r.suggested, at });
    added.push(r);
  }
  if (!added.length) return [];

  fs.writeFileSync(DECISIONS, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  for (const r of added) log(c.g(`  ✓ ${r.title} → ${r.suggested}`));
  return added;
}

/** A line per model for the GitHub job summary, so the owner sees what landed. */
function summary(rows, skipped) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (!f) return;
  const lines = rows.length
    ? [
        `### ${rows.length} מודלים נוספו לתור האישורים`,
        "",
        "| מודל | מדף מוצע | רישיון | הערות |",
        "| --- | --- | --- | --- |",
        ...rows.map((r) => `| ${r.title} | ${r.suggested} | ${r.license || "—"} | ${r.warnings.join(", ") || "—"} |`),
        "",
        "לאשר או לדחות: **/admin ← מודלים לאישור**. שום דבר מכאן לא בחנות עד שמאשרים.",
      ]
    : ["### אין מודלים חדשים", "", "כל מה שבקולקציות ובלייקים כבר בחנות או כבר הוכרע."];
  if (skipped.length) lines.push("", `קולקציות שלא נקראו: ${skipped.join(", ")}`, "", "קולקציה \"חסומה\" תיקרא בהרצה הבאה — Cloudflare חוסם לפעמים כתובות של שרתים.");
  fs.appendFileSync(f, lines.join("\n") + "\n", "utf8");
}

async function main() {
  if (LOGIN) return login();
  if (OFFLINE) return offline();
  log(c.b(`\n  קורא את הקולקציות של @${PROFILE}\n`));
  const b = await browser();
  const ctx = await context(b);
  const page = await ctx.newPage();

  let collections;
  const wanted = [];
  const skipped = [];
  const probes = [];
  let likedFresh = [];
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
      if (res.blocked) {
        const cf = res.why === "cloudflare";
        skipped.push(`${col.name} (${cf ? "Cloudflare" : "לא נמצאו קישורי מודלים"})`);
        log(c.y(`  ${col.name}: לא נקראה — ${cf ? "Cloudflare" : "הדף נטען אבל אין בו קישורי מודלים"}`));
        if (res.probe && probes.length < 2) probes.push({ collection: col.name, ...res.probe });
        continue;
      }
      log(`  ${col.name}: ${res.ids.length} מודלים`);
      const shelf = shelfForCollection(col.name) ?? shelfForCollection(col.slug);
      for (const id of res.ids) wanted.push({ id, shelf });
    }
    // Likes are read in the same session, while the cookie is warm.
    const liked = await readLikes(page);
    const knownNow = knownIds();
    const fresh = liked.filter((id) => !knownNow.has(id));
    fs.writeFileSync(
      path.join(ROOT, "data", "liked-models.json"),
      `${JSON.stringify({ readAt: new Date().toISOString(), all: liked, fresh }, null, 2)}\n`,
      "utf8",
    );
    likedFresh = fresh;
    if (fresh.length) log(c.b(`  ${fresh.length} לייקים שעדיין לא בחנות — נכנסים לתור האישור`));
  } finally {
    await b.close();
  }

  if (skipped.some((x) => x.includes("חסומה"))) {
    log(c.y("\n  חלק מהקולקציות נחסמו על ידי Cloudflare. אפשר לתקן את זה לתמיד:"));
    log(c.d("  Settings → Secrets → Actions → New secret בשם MAKERWORLD_COOKIE,"));
    log(c.d("  והערך: העוגיות של makerworld.com מהדפדפן שלך אחרי התחברות."));
  }

  return queue(wanted, likedFresh, skipped, probes);
}

/**
 * Everything after the ids are in hand: filter, look up, queue, publish.
 *
 * Split out of main() because there are now two ways to arrive here — a
 * browser that read the collections, or a list his own browser collected —
 * and from this point on they are the same job.
 */
async function queue(wanted, likedFresh, skipped, probes) {
  const queued = pendingIds();
  if (queued.length) log(c.d(`  ${queued.length} מודלים ממתינים ב-data/pending-models.json`));

  const known = knownIds();
  const decided = decidedIds();
  const seen = new Set();
  // Liked models are nominations too, and were being read and then dropped.
  const nominated = [...wanted, ...queued, ...likedFresh.map((id) => ({ id, shelf: null }))];
  const fresh = nominated.filter(
    (x) => !known.has(x.id) && !decided.has(x.id) && !seen.has(x.id) && seen.add(x.id),
  );
  log(c.b(`\n  ${wanted.length} בקולקציות · ${likedFresh.length} לייקים · ${fresh.length} חדשים\n`));

  /**
   * What this run actually saw, in one small file.
   *
   * A run that ends with nothing has three different causes — Cloudflare turned
   * the runner away, the collections are empty, or everything in them is
   * already ruled on — and telling them apart meant reading a thousand lines of
   * workflow log. This is the answer, committed beside the data.
   */
  try {
    fs.writeFileSync(
      path.join(ROOT, "data", "collections-status.json"),
      `${JSON.stringify({
        readAt: new Date().toISOString(),
        signedIn: Boolean((process.env.MAKERWORLD_COOKIE || "").trim()),
        collections: (collections ?? []).map((x) => x.name),
        blocked: skipped,
        probes,
        inCollections: wanted.length,
        likesNotInShop: likedFresh.length,
        newForApproval: fresh.length,
        alreadyHandled: nominated.length - fresh.length,
      }, null, 2)}\n`,
    );
  } catch { /* a status file is never worth failing the run for */ }
  if (!fresh.length) {
    log(c.d("  אין מה להוסיף לתור — הכל כבר בחנות או כבר הוכרע.\n"));
    summary([], skipped);
    return;
  }

  const rows = [];
  for (const { id, shelf } of fresh) {
    const d = await fetchDetails(id);
    if (!d) { log(c.y(`  ${id}: ה-API לא ענה, מדולג`)); continue; }
    const row = buildCandidate(id, d, shelf, shelf ? "collection" : "like");
    if (row) rows.push(row);
    await sleep(250); // be a polite guest
  }
  if (!rows.length) { log(c.y("  שום דבר לא נוסף.")); summary([], skipped); return; }

  for (const r of rows) {
    const mark = r.warnings.length ? c.y(`[${r.warnings.join(",")}]`) : c.g("[לאישור]");
    log(`  ${mark} ${r.title} → ${r.suggested}`);
  }

  if (DRY) { log(c.d("\n  --dry: לא נכתב קובץ.\n")); return; }
  const published = PUBLISH ? approveClean(rows) : [];
  const total = queueCandidates(rows);
  clearPending(new Set(rows.map((r) => r.id)));
  summary(rows, skipped);
  if (published.length) {
    log(c.g(`\n  ${published.length} מהאוספים אושרו אוטומטית — apply:approvals יעלה אותם למדף`));
  }
  const waiting = total - published.length;
  log(c.g(`\n  ${rows.length} מודלים נוספו לתור (${waiting} ממתינים להחלטה)`));
  if (waiting > 0) log(c.d(`  לאשר או לדחות: /admin ← "מודלים לאישור"\n`));
}

/**
 * The run with no browser in it.
 *
 * Reads data/pending-models.json and nothing else. Likes are not read here:
 * that tab needs a browser, and a like was never a decision anyway.
 */
async function offline() {
  log(c.b("\n  מצב לא-מקוון: קורא רק את data/pending-models.json\n"));
  return queue([], [], [], []);
}


// Only when run as a command. Importing this file — which a test does, to
// exercise approveClean without opening a browser — must not start a sweep.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(c.r(`\n  שגיאה: ${e.message}\n`));
    process.exitCode = 1;
  });
}
