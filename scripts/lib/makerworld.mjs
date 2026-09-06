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

export async function getJson(url, timeoutMs = 25_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA, accept: "application/json" } });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, body: await res.json() };
  } catch (e) {
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
const WEAPON_RE =
  /(knife|knives|katana|sword|blade|shuriken|kunai|karambit|balisong|dagger|machete|blowgun|bb (launcher|gun)|airsoft|pistol|shotgun|rifle|\bgun\b|ammo|bullet|throwing|nunchaku|taser|crossbow|spear)/i;

const BRAND_RE =
  /(kaws|bearbrick|be@rbrick|smiski|hello kitty|spider[- ]?man|spiderman|spider noir|miles morales|marvel|batman|superman|disney|pokemon|pikachu|mario|zelda|master sword|nintendo|star wars|mandalorian|jujutsu|mahoraga|demon slayer|tanjiro|bleach|zangetsu|chainsaw man|pochita|black clover|asta|one piece|naruto|dragon ball|subnautica|seraphon|warhammer|corvo|dishonored|panda by bambu|byd|stussy|nike|adidas|ferrari|lego|l3go|cheburashka|tscheburaschka)/i;

export function holdsFor(text, license) {
  const holds = [];
  if (WEAPON_RE.test(text)) holds.push("weapon");
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
  flexi: "יצור מפרקי שיוצא מהמדפסת כשהוא כבר זז. בלי דבק, בלי הרכבה.",
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
 * The plates a design was published with, read the way the shop quotes them.
 *
 * A model's headline time must be the SINGLE-COLOUR plate: the AMS plate of the
 * same model can be three times slower, and quoting that makes every price look
 * wrong. So the base is the lightest one-colour plate, `hoursAms`/`gramsAms`
 * carry the multi-colour one when there is one, and `plates` lists the sizes the
 * designer actually published — a step only counts when it is at least 35%
 * heavier AND slower than the one before it, so six near-identical uploads do
 * not become six "sizes".
 */
export function platesFrom(instances = []) {
  const every = instances
    .map((x) => ({ g: x.weight || 0, h: Math.round(((x.prediction || 0) / 3600) * 100) / 100, mc: x.materialColorCnt || x.materialCnt || 1, ams: !!x.needAms }))
    .filter((x) => x.g > 0 && x.h > 0);
  if (!every.length) return null;

  // A 1g plate next to a 20g one is the designer's test print, not a size.
  const big = every.filter((x) => x.g >= 3);
  const all = big.length ? big : every;
  const single = all.filter((x) => x.mc === 1 && !x.ams);
  const pool = single.length ? single : all;

  const sorted = [...pool].sort((a, b) => a.g - b.g);
  const base = sorted[0];
  const ams = all.find((x) => x.ams && x.g !== base.g) ?? null;

  const plates = [];
  for (const p of sorted) {
    const last = plates[plates.length - 1];
    if (!last || (p.g > last.g * 1.35 && p.h > last.h)) plates.push(p);
  }

  return { base, ams, plates: plates.length > 1 ? plates.map((p) => ({ g: p.g, h: p.h })) : null };
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
    nsfw: !!d.nsfw,
  };
}
