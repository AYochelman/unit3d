/**
 * What both MakerWorld importers agree on.
 *
 * `import-makerworld.mjs` rebuilds the whole catalogue from a browser-collected
 * list; `sync-collections.mjs` watches the owner's collections every night and
 * appends what is new. They classify a model onto a shelf, decide what may be
 * sold, and read the sliced figures the same way — so those rules live here
 * once instead of drifting apart in two files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const API = (id) => `https://makerworld.com/api/v1/design-service/design/${id}`;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  d: (s) => `\x1b[90m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Answers that were fetched somewhere else.
 *
 * The design API is normally reachable from anywhere, which is the whole
 * reason this importer exists. "Anywhere" turned out not to include every
 * machine: a network that blocks makerworld.com outright answers 403 to the
 * connection itself, and the script could only report "not found" — which is
 * a lie about the model.
 *
 * So a response can be dropped into data/mw-api/<id>.json by hand, or by
 * anything that CAN reach the API, and it answers when the network will not.
 * It is a fallback and not a cache on purpose: the live API is always tried
 * first, so on a machine that can reach MakerWorld nothing here changes and
 * nothing goes stale behind your back.
 */
const SNAPSHOTS = path.join(ROOT, "data", "mw-api");

function snapshot(url) {
  const m = /design-service\/design\/(\d+)/.exec(url);
  if (!m) return null;
  const file = path.join(SNAPSHOTS, `${m[1]}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Cloudflare's bot cookie, kept for the life of the process.
 *
 * The first request to makerworld.com comes back with
 * `set-cookie: __cf_bm=...` — Cloudflare's bot-management token, which every
 * browser then sends back on the next request. node's fetch has no cookie jar,
 * so it never did, and the edge saw a client that would not hold the token it
 * had just been handed. One request answered; every one after it was 403.
 *
 * That is exactly the shape the signals run had: 1 model read, 483 refused, on
 * a connection that was fine. Checked against a real browser on the same API
 * at the same moment — seven ids, seven 200s — so the address was never the
 * problem and neither was a rate limit.
 *
 * A Map rather than a string because more than one cookie may arrive, and the
 * last value for a name wins, which is what a jar is.
 */
const jar = new Map();

function remember(res) {
  // getSetCookie keeps the headers separate; the joined string cannot be split
  // safely, since Expires= carries a comma of its own.
  const all = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  for (const line of all) {
    const [pair] = String(line).split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}

const cookieHeader = () =>
  jar.size ? [...jar].map(([k, v]) => `${k}=${v}`).join("; ") : undefined;

/**
 * A real browser, for the requests node is no longer allowed to make.
 *
 * makerworld.com's API used to answer plain node fetch, and the whole import
 * was built on that. It now returns 403 to it and 200 to a browser, checked
 * side by side on the same ids at the same minute. It is not the address (a
 * datacenter browser gets 200), not a rate limit (seven in a row at 1.2s all
 * answered), not the user-agent (a browser sending the literal string "node"
 * still gets 200) and not a cookie. What is left is how the connection itself
 * looks, which no header can change — so the request has to come from a
 * browser.
 *
 * Opened only when a plain request has actually been refused, so a machine
 * where fetch still works never starts one, and shared by every later call.
 * No profile directory: this API needs no login, and pointing a second Chrome
 * at the signed-in profile is what takes that profile hostage
 * ("Opening in existing browser session").
 *
 * MAKERWORLD_NO_BROWSER=1 turns it off and restores the old behaviour.
 */
const NO_BROWSER = !!(process.env.MAKERWORLD_NO_BROWSER || "").trim();
let ctx = null;
let tab = null;
/** Set only when no browser could be started at all, so we stop trying. */
let unavailable = false;
/** Said once per process, not once per reopen. */
let announced = false;

/**
 * Close the browser once nothing has used it for a while.
 *
 * An open browser is a live child process and node will not exit while one is
 * running, so a script that reads the API and forgets to close it does not
 * finish — it sits there, silent, looking exactly like a slow run. That is
 * what happened to the nightly job: six of the scripts that read this API
 * never called closeBrowser, and the first one to open a browser hung the
 * whole chain.
 *
 * Remembering to call it in every script is the kind of rule that holds until
 * someone writes the seventh script. So the browser closes itself: every API
 * call through it pushes this timer out, and twenty seconds after the last one
 * it shuts down and lets the process end. A later call simply opens a new one.
 * unref, so the timer itself never keeps node alive.
 */
const IDLE_MS = 20_000;
let idle = null;
function touchIdle() {
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => { void closeBrowser(); }, IDLE_MS);
  idle.unref?.();
}

async function browserTab() {
  if (tab) return tab;
  if (unavailable || NO_BROWSER) return null;
  const { chromium } = await import("playwright").catch(() => ({ chromium: null }));
  if (!chromium) return null;
  const exe = (process.env.PLAYWRIGHT_CHROMIUM || "").trim();
  // --enable-automation is the loudest thing a browser can say about itself,
  // and it is said before any page loads. Playwright adds it unasked.
  const opts = {
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  };
  const ways = [
    ["PLAYWRIGHT_CHROMIUM", () => (exe ? chromium.launch({ ...opts, executablePath: exe }) : Promise.reject(new Error("not set")))],
    ["Chrome", () => chromium.launch({ ...opts, channel: "chrome" })],
    ["Chromium", () => chromium.launch(opts)],
  ];
  const why = [];
  for (const [name, launch] of ways) {
    try {
      ctx = await launch();
      tab = await ctx.newPage();
      // Said out loud: a run that silently changed how it reaches the API is a
      // run whose timings and failures mean something different.
      if (!announced) {
        console.log(c.d(`  (ה-API דוחה בקשות רגילות — עובר דרך ${name})`));
        announced = true;
      }
      return tab;
    } catch (e) {
      why.push(`${name}: ${e.message.split("\n")[0]}`);
    }
  }
  ctx = null;
  unavailable = true;
  console.log(c.y("  ה-API דוחה בקשות רגילות ולא נמצא דפדפן להחליף אותן:"));
  for (const line of why) console.log(c.d(`    ${line}`));
  console.log(c.d("    התקנה:  npm i -D playwright   (או PLAYWRIGHT_CHROMIUM=<נתיב ל-chrome.exe>)"));
  return null;
}

/**
 * Navigating to the URL rather than fetching from inside the page: a fetch
 * started by a script on about:blank is cross-origin and never leaves the
 * browser, and Playwright's own request context is not the browser's network
 * stack either. A navigation is.
 */
async function viaBrowser(url) {
  const page = await browserTab();
  if (!page) return null;
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    if (!res || !res.ok()) return { ok: false, status: res ? res.status() : 0 };
    const text = await page.evaluate(() => document.body?.innerText || "");
    return { ok: true, body: JSON.parse(text) };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    touchIdle();
  }
}

/**
 * Shut the browser now, rather than waiting out the idle timer above.
 *
 * Worth calling at the end of a script that has just finished with the API —
 * it saves the twenty seconds — but no longer required for the process to
 * exit, which is the point: the six scripts that never called it used to hang
 * forever, and the seventh would have too.
 */
export async function closeBrowser() {
  if (idle) { clearTimeout(idle); idle = null; }
  if (!ctx) return;
  await ctx.close().catch(() => {});
  ctx = null;
  tab = null;
}

export async function getJson(url, timeoutMs = 25_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const cookie = cookieHeader();
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": UA,
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        ...(cookie ? { cookie } : {}),
      },
    });
    remember(res);
    if (!res.ok) {
      // A browser before a snapshot: the snapshot is a frozen copy of one
      // model from whenever it was saved, and answering with it hid the fact
      // that the live API had stopped talking to us at all. One id in the
      // signals run came back "read" for exactly that reason while the other
      // 483 were refused, which read as a rate limit and was not one.
      const live = await viaBrowser(url);
      if (live?.ok) return live;
      const snap = snapshot(url);
      return snap ? { ok: true, body: snap } : { ok: false, status: res.status };
    }
    return { ok: true, body: await res.json() };
  } catch (e) {
    const live = await viaBrowser(url);
    if (live?.ok) return live;
    const snap = snapshot(url);
    if (snap) return { ok: true, body: snap };
    return { ok: false, status: 0, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
  }
}

// ── shelves ──────────────────────────────────────────────────────────────────
const OVERRIDES = path.join(ROOT, "scripts", "shelf-overrides.json");
export const SHELF_OVERRIDES = fs.existsSync(OVERRIDES) ? JSON.parse(fs.readFileSync(OVERRIDES, "utf8")) : {};

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
// The smoking shelf is named by what the thing IS, so it beats every other
// rule: an ashtray is not "household decor" and a cigarette case is not "a box".
const SMOKE_RE = /(ashtray|ash tray|aschenbecher|posacenere|cigarette|zigaretten|cigar |tobacco|rolling (station|tray)|grinder|lighter (case|sleeve)|bic sleeve|clipper lighter)/i;

const TITLE_RULES = [
  [/(flexi|articulat|bendy)/i, "flexi"],
  [/(fidget|spinner|clicker|clicky|slider|popper|squishy|sensory|infinity|twisty|slime)/i, "fidget"],
  [/(dragon|snake|serpent|worm|octopus|axolotl|shark|lizard|gecko|pangolin|scorpion|skorpion|crab|dino|t-?rex|raptor|frog|manta)/i, "flexi"],
  [/(statue|bust|sculpt|figurine|replica|low[- ]?poly|vase|trophy|lamp|moon|chess|skull|mask|charm)/i, "statues"],
  [/(pet |dog |cat |collar|paw|leash)/i, "pets"],
  [/(desk|pen |cable|usb|headphone|monitor|organizer|card holder|controller|tray|clip|bookmark|calendar|phone stand|keychain)/i, "office"],
  [/(planter|coaster|hook|kitchen|shelf|rack|box|lid|bathroom|door|wall|towel|toilet|shower|broom|holder|dispenser|stand|chair|opener|winder)/i, "home"],
];

export function classify(title, tags = [], cats = []) {
  const tagStr = tags.join(" ");
  const catStr = cats.join(" ");

  if (SMOKE_RE.test(title) || SMOKE_RE.test(tagStr)) return "smoke";
  // A flexi or a fidget can sit in any category, so the tags decide first.
  if (FLEXI_TAG.test(tagStr) && !FIDGET_TAG.test(title)) return "flexi";
  if (FIDGET_TAG.test(tagStr)) return "fidget";

  for (const [re, shelf] of CAT_SHELF) {
    if (re.test(catStr)) {
      // "Animals / Miniatures" is a flexi only when it actually articulates;
      // otherwise it is something for the display shelf.
      if (shelf === "flexi" && !FLEXI_TAG.test(tagStr) && !FLEXI_TAG.test(title)) return "statues";
      return shelf;
    }
  }
  for (const [re, shelf] of TITLE_RULES) if (re.test(title)) return shelf;
  return "trendy";
}

// ── what we import but do NOT put on sale ────────────────────────────────────
/**
 * Every term is word-bounded, and that is not tidying.
 *
 * Without \b, "blade" matches inside SCHUBLADE — German for drawer — and an
 * AMS drawer for a Bambu printer came through the sweep tagged as a weapon.
 * The same hole catches "crossword" and "password" on `sword`, "Shakespeare"
 * and "spearmint" on `spear`, "ammonia" on `ammo`. A wrong tag was noise while
 * these only warned; now that a weapon is dropped, a wrong tag deletes a good
 * model, so the boundaries are load-bearing.
 *
 * `throwing` alone was too broad for the same reason, and now needs its noun.
 */
const WEAPON_RE =
  /\b(knife|knives|katana|sword|swords|blade|blades|shuriken|kunai|karambit|balisong|dagger|machete|blowgun|airsoft|pistol|shotgun|rifle|gun|guns|ammo|ammunition|bullet|bullets|nunchaku|taser|crossbow|spear)\b|\bbb\s+(launcher|gun)\b|\bthrowing\s+(knife|knives|star|stars|axe|card|cards|dart|darts)\b/i;

/**
 * A knife block, a katana stand, a drawer: storage that the weapon word alone
 * would have thrown away. What is printed is not the blade.
 */
const NOT_A_WEAPON = /\b(block|holder|stand|rack|organi[sz]\w*|storage|sharpen\w*|dock|drawer|schublade|magnet|mount|case|sheath)\b/i;

/** The one place that decides. Three copies of this regex disagreed before. */
export const isWeapon = (text) => WEAPON_RE.test(text) && !NOT_A_WEAPON.test(text);

/**
 * The line the owner drew: a toy or a prop is fine, a real weapon is not.
 *
 * Everything this shop prints is PLA, so a katana, a butterfly knife and a
 * banana sword are props — and nineteen of them are already on his shelves,
 * selling. A blanket "weapon" block would have deleted them.
 *
 * What is left is the narrow set that is not a toy in any reading: a firearm
 * or one of its parts, ammunition, and the things built to launch or shock.
 * These are also the only ones with real legal weight, which is the point.
 */
const NOT_A_TOY =
  /\b(airsoft|crossbow|taser|stun\s?gun|ammunition|live\s+round|broadhead|arrowhead|suppressor|silencer|firearm|receiver|glock|ar[-\s]?15|ak[-\s]?47|sten|luger|derringer)\b/i;

/**
 * Never queued, never sold. `isWeapon` only marks a card for a second look;
 * this is the one that removes a model from the owner's choices, so it stays
 * as small as the reason for it.
 */
export const isRealWeapon = (text) => NOT_A_TOY.test(text);

// Word-bounded: "Link Cable Clip" is not Zelda, "Overengineered" is not Eren,
// and "Ultrasonic" is not Sonic. Each name here is a trademark someone
// enforces, which is a different and dearer complaint than a designer's.
const BRAND_RE =
  /\b(kaws|bearbrick|be@rbrick|smiski|hello kitty|sanrio|labubu|spider[- ]?man|spider noir|miles morales|marvel|iron ?man|hulk|thor|captain america|deadpool|venom|groot|batman|superman|joker|disney|mickey mouse|lilo and stitch|grinch|pokemon|pikachu|mario|zelda|master sword|kirby|nintendo|star wars|mandalorian|grogu|baby yoda|x-?wing|tie fighter|millennium falcon|jujutsu|mahoraga|gojo|demon slayer|tanjiro|bleach|zangetsu|chainsaw man|pochita|black clover|asta|one piece|luffy|naruto|dragon ball|goku|attack on titan|aot titan|eren yeager|totoro|ghibli|toothless|night fury|how to train your dragon|harry potter|hogwarts|aperture science|portal turret|minecraft|creeper|among us|sonic the hedgehog|squid game|fortnite|roblox|master chief|subnautica|seraphon|warhammer|corvo|dishonored|panda by bambu|byd|stussy|nike|adidas|ferrari|lego|l3go|cheburashka|tscheburaschka)\b/i;

export function holdsFor(text, license) {
  const holds = [];
  if (isWeapon(text)) holds.push("weapon");
  if (BRAND_RE.test(text)) holds.push("brand");
  // A CC "NC" licence is the designer stating in writing that the model may not
  // be used commercially. That is not a judgement call like the two above.
  if (/(^|-)NC(-|$)/i.test(license || "")) holds.push("license-nc");
  return holds;
}

// Fallbacks for a model the API could not describe.
export const ESTIMATE = {
  flexi:   { hours: 5.0, grams: 70,  colors: 2 },
  fidget:  { hours: 1.6, grams: 30,  colors: 1 },
  statues: { hours: 9.0, grams: 140, colors: 1 },
  pets:    { hours: 0.6, grams: 7,   colors: 2 },
  office:  { hours: 1.8, grams: 35,  colors: 1 },
  home:    { hours: 2.2, grams: 45,  colors: 1 },
  smoke:   { hours: 1.5, grams: 40,  colors: 1 },
  screen:  { hours: 7.0, grams: 110, colors: 1 },
  trendy:  { hours: 2.0, grams: 40,  colors: 1 },
  b2b:     { hours: 2.0, grams: 45,  colors: 2 },
};

export const HUE = { flexi: 90, fidget: 280, statues: 320, pets: 30, office: 200, home: 260, smoke: 25, screen: 340, trendy: 145, b2b: 190 };
export const ART = { statues: "lowpoly", pets: "round", office: "penholder", home: "planter", smoke: "penholder", screen: "lowpoly", trendy: "keychain", b2b: "nameplate" };

export const HE_DESC = {
  flexi: "יצור פלקסי שיוצא מהמדפסת כשהוא כבר זז. בלי דבק, בלי הרכבה.",
  fidget: "צעצוע שולחני להעסקת הידיים. הדפסה אחת, מוכן לשימוש.",
  statues: "פריט תצוגה בהדפסה איטית ובשכבות דקות. למדף, לא לכיס.",
  pets: "אביזר לחיה, מודפס ב-PETG שעמיד במים ובשמש.",
  office: "פריט לשולחן העבודה. אפשר עם שם או לוגו.",
  home: "פריט שימושי לבית. אפשר לבחור צבע וגודל.",
  smoke: "אביזר עישון מודפס, לבגירים בלבד. למאפרות מומלץ PETG.",
  screen: "פריט תצוגה מהמסך. הדפסה איטית בשכבות דקות.",
  trendy: "מודל פופולרי מהקהילה, מודפס אצלנו בצבע שתבחר.",
  b2b: "מתנה ממותגת. אפשר עם הלוגו שלכם, מ-10 יחידות ומעלה.",
};

// ── titles and sizes ─────────────────────────────────────────────────────────
const titleFromSlug = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()).trim();

/** Latin letters in at least a third of the title, else fall back to the slug. */
export const readableTitle = (title, slug) => {
  const latin = (title.match(/[A-Za-z]/g) || []).length;
  const letters = (title.match(/\p{L}/gu) || []).length;
  return letters && latin / letters >= 0.34 ? title : titleFromSlug(slug || "") || title;
};

export const fmtSize = (grams) =>
  grams >= 300 ? "~250mm" : grams >= 120 ? "~160mm" : grams >= 40 ? "~100mm" : "~60mm";

/**
 * The profiles a design was published with, read the way the shop quotes them.
 *
 * The base has to be the profile the DESIGNER points at — `defaultInstanceId`,
 * or the one people actually print. It cannot be the lightest: a designer will
 * happily upload a 23g "just the pins" profile beside the 433g shelf, and
 * quoting the pins prices a whole wall unit at 22 ₪. (That is not theoretical;
 * it is what "Shoe Rack / Wall Shelf" was selling for.)
 *
 * It also cannot be the sample. Designers upload sizing testers beside the
 * real thing — "InsoleSizeTest", 78g, 2 hours, next to a 698g pair of slides —
 * and because everybody prints the tester first it wins on downloads by two to
 * one. When the design's own default is missing from the profile list (which
 * happens), download count is all that is left to go on, and it picks the
 * tester: a pair of shoes priced as 78 grams. Profiles that name themselves a
 * test are dropped before anything is chosen.
 *
 * The headline still avoids the AMS profile — that one can be three times
 * slower and makes every price look wrong — so when the default needs AMS and a
 * single-colour profile exists, the closest single-colour profile stands in.
 * `hoursAms`/`gramsAms` carry the multi-colour figures, and `plates` offers the
 * genuinely BIGGER profiles as sizes: only what is at least 35% heavier and
 * slower than the base, never something lighter, which would be a part.
 */
/**
 * What a profile is actually printed in.
 *
 * MakerWorld carries the sliced filament per plate — `TPU`, `PETG`, `PLA`,
 * `PLA-CF` — and it matters: an airless tennis ball is TPU, and selling it as
 * PLA both prices it wrong and promises a rigid ball that bounces off the wall.
 * The importer used to stamp every model PLA+ because it never looked.
 */
export function filamentOf(instance) {
  const plates = instance?.extention?.modelInfo?.plates ?? [];
  const types = plates.flatMap((pl) => (pl.filaments ?? []).map((f) => String(f.type || "")));
  return types.find(Boolean) ?? "";
}

/**
 * The colour the designer printed it in.
 *
 * The same plate record carries a hex. It is the colour of the photograph on
 * the model's page — the one a customer means by "like the picture" — which is
 * the only honest answer to "what is this model's colour". Everything else the
 * shop could pick is an invention.
 */
export function colorOf(instance) {
  const plates = instance?.extention?.modelInfo?.plates ?? [];
  // The key has moved between `color`, `colorHex` and `filamentColor`, and the
  // value comes back with or without the leading #, sometimes with an alpha
  // pair on the end. Take the first thing that reads as a colour.
  const hex = plates
    .flatMap((pl) => (pl.filaments ?? []))
    .flatMap((f) => [f?.color, f?.colorHex, f?.filamentColor, f?.hex])
    .map((v) => String(v || "").trim().replace(/^#/, ""))
    .map((v) => (v.length === 8 ? v.slice(0, 6) : v))
    .find((v) => /^[0-9a-f]{6}$/i.test(v));
  return hex ? `#${hex.toUpperCase()}` : null;
}

/** MakerWorld's filament name → the family this shop sells. */
export function materialFor(type) {
  const t = String(type || "").toUpperCase();
  if (!t) return null;
  if (t.includes("TPU") || t.includes("TPE")) return "tpu";
  if (t.includes("PETG") || t.includes("PET")) return "petg";
  if (t.includes("ABS") || t.includes("ASA")) return "abs";
  if (t.includes("SILK")) return "pla_silk";
  if (t.includes("MATTE")) return "pla_matte";
  if (t.includes("PLA")) return "pla";
  // PC, PA, nylon, resin: real materials this shop does not stock. Saying so is
  // better than quietly pricing them as PLA.
  return null;
}

/** A profile whose own name says it is a trial piece, not the product. */
const SAMPLE = /(size ?test|test ?print|\btest(er)?\b|sample|calibrat|\btrial\b|\bdemo\b|preview|fit ?check|sizer)/i;

export function platesFrom(instances = [], defaultInstanceId = null) {
  const all = instances
    .map((x) => ({
      id: x.id,
      g: x.weight || 0,
      h: Math.round(((x.prediction || 0) / 3600) * 100) / 100,
      mc: x.materialColorCnt || x.materialCnt || 1,
      ams: !!x.needAms,
      dl: x.downloadCount || 0,
      name: x.name || x.title || "",
      filament: filamentOf(x),
      color: colorOf(x),
      def: !!x.isDefault || (defaultInstanceId != null && x.id === defaultInstanceId),
    }))
    .filter((x) => x.g > 0 && x.h > 0);
  if (!all.length) return null;

  // Drop the testers — unless that is all there is, in which case they are the
  // model and dropping them would leave nothing to price.
  const real = all.filter((x) => !SAMPLE.test(x.name));
  const every = real.length ? real : all;

  // What the designer published as THE profile, else what people print most.
  const chosen =
    every.find((x) => x.def) ?? [...every].sort((a, b) => b.dl - a.dl)[0];

  // Keep the headline on one colour, but stay near the chosen size: the
  // stand-in is the single-colour profile closest in weight, not the smallest.
  const single = every.filter((x) => x.mc === 1 && !x.ams);
  const base =
    chosen.mc === 1 && !chosen.ams
      ? chosen
      : single.length
        ? [...single].sort((a, b) => Math.abs(a.g - chosen.g) - Math.abs(b.g - chosen.g))[0]
        : chosen;

  const ams = every.find((x) => x.ams && x.g !== base.g) ?? null;

  const bigger = [...every.filter((x) => x.mc === 1 && !x.ams)].sort((a, b) => a.g - b.g);
  const plates = [{ g: base.g, h: base.h }];
  for (const p of bigger) {
    const last = plates[plates.length - 1];
    if (p.g > last.g * 1.35 && p.h > last.h) plates.push({ g: p.g, h: p.h });
  }

  return { base, ams, plates: plates.length > 1 ? plates : null };
}

/**
 * Every photograph the designer published for this model.
 *
 * The shop stored the cover and nothing else, so a product page showed one
 * picture of a thing that has six. MakerWorld has moved this list around
 * between redesigns, so rather than name one path this reads all of them and
 * keeps whatever looks like an image: the cover, the design's own gallery, and
 * each print profile's photo. Order matters — the cover is what the card shows,
 * so it stays first.
 */
export function picturesOf(d) {
  const out = [];
  const add = (u) => {
    const s = String(u?.url ?? u?.picture ?? u ?? "").split("?")[0];
    if (/^https?:\/\/[^\s]+\.(png|jpe?g|webp)$/i.test(s)) out.push(s);
  };
  add(d?.coverUrl);
  for (const key of ["design_pictures", "designPictures", "pictures", "images", "gallery"]) {
    for (const x of d?.designExtension?.[key] ?? d?.[key] ?? []) add(x);
  }
  for (const inst of d?.instances ?? []) add(inst?.coverUrl);
  return [...new Set(out)].slice(0, 8);
}

/** One model's details, straight from MakerWorld's API. */
export async function fetchDetails(id) {
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
    pictures: picturesOf(d),
    // Where the gallery lives has moved between redesigns and the guesses in
    // picturesOf found nothing, so the run reports the shape it was handed.
    shape: { top: Object.keys(d ?? {}), ext: Object.keys(d?.designExtension ?? {}) },
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
    instances,
    defaultInstanceId: d.defaultInstanceId ?? null,
    // The designer's own clip of the thing moving, when they filmed one. A
    // fidget that clicks and a flexi that bends sell themselves in two seconds
    // of video and not at all in a still photograph.
    video: d.designExtension?.design_video?.[0]?.url || null,
    nsfw: !!d.nsfw,
  };
}
