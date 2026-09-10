import type { Fidget, MaterialId, Product, ProductArtId, ProductCategory } from "./types";
import { DEFAULT_COST_SETTINGS, estimateCost, fmtHours } from "./costing";
import { IMPORTED_GENERATED, IMPORTED_AT } from "./imported.generated";
import { photoSrc } from "./assets";
import { applyShelf } from "./shelves";
import { REMOVED_BY_OWNER, SHELF_MOVES } from "./shop-overrides";
import { HE_DESCS } from "./he-descs";
import { heName } from "./he-names";

// ─── Models imported from a maker site ───────────────────────────────────────
//
// `scripts/import-makerworld.mjs` reads the collections listed in
// scripts/makerworld-sources.json and writes lib/imported.generated.ts. This
// module turns those raw rows into the same Fidget / Product shapes the rest
// of the site already renders, so an import needs no UI changes anywhere.
//
// IMPORTANT — what we import and what we hold back.
//
// We import the model's NAME, PICTURE, CREATOR and a LINK BACK, and we sell a
// PRINTING SERVICE of it. We never redistribute the STL. CC-BY (MakerWorld's
// common licence) requires crediting the designer, which the product page does.
//
// The import tags two kinds of model in `holds`:
//   • "weapon"  — knives, katanas, shuriken, launchers. Israeli law (חוק
//                 העונשין, נשק קר) makes SELLING these an offence regardless of
//                 the material they are made of, so they stay out of the shop.
//   • "brand"   — KAWS, Bearbrick, Spider-Man, Hello Kitty, anime characters…
//                 Selling copies of a protected character is a trademark /
//                 copyright exposure. The owner asked for these to be listed
//                 anyway (2026-09-05); it is a commercial risk they carry, not
//                 an illegal act on our side, so "brand" is NOT in BLOCKED_HOLDS.
//   • "license-nc" — the designer chose a CC licence with the NC (non-commercial)
//                 term, i.e. wrote down that this model may not be sold. Unlike
//                 the two above this is not a judgement call, so it blocks.
// Change BLOCKED_HOLDS to change what is offered for sale.
//
// `licenseChecked` is false for anything collected through the browser snippet:
// a MakerWorld collection page does not show licences, so the licence has to be
// read on the model's own page before that model is sold.

// "trendy" doubles as the catch-all: anything that does not belong on a named
// shelf lands there rather than being forced into one that nearly fits.
export type ImportedShelf = "flexi" | "fidget" | "statues" | "screen" | "pets" | "home" | "office" | "smoke" | "trendy" | "b2b";

export type ImportedModel = {
  id: string;
  name: string;
  /** Hebrew one-liner for the card. */
  desc: string;
  shelf: ImportedShelf;
  /**
   * Extra shelves the model also belongs on.
   *
   * A Billy Butcher bust is a display piece AND something from the screen; a
   * customer looking on either shelf should find it. `shelf` stays the one the
   * product page treats as home, `also` widens where it is listed.
   */
  also?: ImportedShelf[];
  /**
   * Print time and filament for the SINGLE-COLOUR plate.
   *
   * The import used to take instances[0], which is whichever plate the designer
   * uploaded first — on 147 of 183 models that was not the one-colour version,
   * so the shop was costing a multi-colour print as if it were plain. These two
   * are now always the cheapest single-colour instance.
   */
  hours: number;
  grams: number;
  /**
   * The filament the designer actually sliced with.
   *
   * MakerWorld carries it per plate and it is not decoration: an airless tennis
   * ball is TPU, and listing it as PLA both prices it wrong and promises a
   * rigid ball. Absent means MakerWorld named nothing we stock, and the shop
   * falls back to PLA+.
   */
  material?: MaterialId;
  /**
   * The colour the designer printed it in, as a hex.
   *
   * The shop used to open every model on the same orange, which was an index
   * into a list and meant nothing. This is the colour of the photograph the
   * customer is looking at.
   */
  colorHex?: string;
  /** The AMS plate, when the designer published one. Much slower: colour
   *  changes and the purge tower can triple the time and the filament. */
  hoursAms?: number;
  gramsAms?: number;
  /**
   * Size options, lightest first, when the designer published more than one.
   *
   * MakerWorld plates carry no names, so these are the distinct single-colour
   * plates after collapsing anything within 35% of the one before it — those
   * are colour variants of the same size, not a bigger version. `hours` and
   * `grams` above are always the first of these, so the shop quotes the
   * cheapest size and the customer chooses up from there.
   */
  plates?: { g: number; h: number }[];
  /** Longest dimension, e.g. "~120mm". */
  size: string;
  /** Colours the model is designed for (AMS). */
  colors: number;
  image?: string;
  /**
   * Every photograph the designer published, cover first.
   *
   * The cover alone sells a keychain badly: a flexi dragon has six pictures of
   * it curled, held and printed in three colours, and the shop was showing one.
   */
  images?: string[];
  creator?: string;
  sourceUrl?: string;
  license?: string;
  downloads?: number;
  likes?: number;
  hue: number;
  /** Drawing to fall back on when the remote picture is missing. */
  art?: ProductArtId;
  /** "live" shows in the shop; "hold" is imported but not offered for sale. */
  status: "live" | "hold";
  /** Why it is held: "weapon", "brand", "license". Empty when live. */
  holds: string[];
  /** True only once someone has read the licence on the model's own page. */
  licenseChecked: boolean;
  /** The original title, kept for the credit line and for finding the source. */
  nameEn?: string;
};

/**
 * Hold reasons that keep a model out of the shop. Anything tagged only with a
 * reason NOT listed here is still offered for sale.
 */
export const BLOCKED_HOLDS: string[] = ["weapon", "license-nc"];

/**
 * Models the owner pulled from the shop by hand.
 *
 * Not a licence or a legal matter — these are simply things Unit 3D does not
 * want to sell (a printer accessory nobody outside the hobby wants, a car-brand
 * keyring, a trophy that duplicates a better one, a novelty that does not fit
 * the shelf). Removing the id here takes the model off every shelf, out of the
 * trendy row and out of the photo pool, and its page stops being generated.
 */
export const REMOVED_IDS = new Set<string>([
  "mw-1376675",  // מייבש AMS · קיט קארד
  "mw-18687",    // מארגן שולחן · רובוט
  "mw-2253620",  // קופסת ממחטות למדפסת
  "mw-2375134",  // מתקן קוקטיילים משולש
  "mw-1509282",  // מחזיק מפתחות BYD
  "mw-19006",    // גביע צמיג
  "mw-1797688",  // מחזיק חדר כושר
  "mw-2624902",  // מערבב קלפים
  "mw-27048",    // כדור גמיש לחתול
  "mw-2863365",  // פיגורת אסטה
  "mw-115260",   // לוח שנה נצחי מתהפך
  "mw-1292618",  // כיסא מתקפל
  "mw-881870",   // פטיש שופט
  // 74 שעות מכונה ו-700 גרם: המחיר האמיתי הוא ~1,335 ש"ח, ואף אחד לא קונה
  // כפכפים מודפסים במחיר הזה. הבעלים החליט להוריד.
  "mw-1515698",  // Air Slides
  // הרכב של מישהו אחר, לא מוצר לחנות
  "mw-1491471",  // מגן לוח מחוונים BYD
  "mw-133829",   // מכסי מזגן BYD
  // כל מה שהגיע מקולקציית GAME — משחקי קופסה, לא הקו של החנות
  "mw-128570", "mw-1400050", "mw-1506167", "mw-15784", "mw-226667",
  "mw-2841172", "mw-421037", "mw-580825", "mw-583150", "mw-737254",
  "mw-740269", "mw-761480",
]);

/** Set to true to list everything, weapons included. Leave false. */
export const SHOW_HELD_MODELS = false;

// Photos resolve to the copies in public/img/catalog (see lib/assets.ts), so
// nothing on the shop is loaded from a designer's CDN at page view.
/**
 * A move made from /admin wins over the hand-written placement, because it is
 * the more recent decision and the person who made it was looking at the
 * product when they made it.
 */
const applyOwnerShelf = (m: ImportedModel): ImportedModel => {
  const moved = SHELF_MOVES[m.id];
  if (!moved?.length) return m;
  const [home, ...also] = moved;
  return { ...m, shelf: home, ...(also.length ? { also } : { also: undefined }) };
};

export const IMPORTED: ImportedModel[] = IMPORTED_GENERATED.map((m) =>
  applyOwnerShelf(
    applyShelf(
      m.image || m.images?.length
        ? { ...m, ...(m.image ? { image: photoSrc(m.image) } : {}), ...(m.images?.length ? { images: m.images.map((u) => photoSrc(u)) } : {}) }
        : m,
    ),
  ),
);
export const IMPORTED_DATE = IMPORTED_AT;

const ownerRemoved = new Set(REMOVED_BY_OWNER);

const sellable = (m: ImportedModel) =>
  !REMOVED_IDS.has(m.id) && !ownerRemoved.has(m.id) &&
  (SHOW_HELD_MODELS || !m.holds.some((h) => BLOCKED_HOLDS.includes(h)));

/** Rows kept out of the shop, for the admin page and the import report. */
export const heldModels = (): ImportedModel[] => IMPORTED.filter((m) => !sellable(m));

/** Everything actually offered for sale — what a visitor could be shown. */
export const sellableModels = (): ImportedModel[] => IMPORTED.filter(sellable);

/**
 * Retail price from the shared cost model, rounded up to the nearest ₪5.
 *
 * Priced in the filament the model is actually printed in. A TPU spool costs
 * half again what PLA does, so quoting a TPU ball off the PLA price is a
 * discount nobody decided to give.
 */
export function suggestPrice(
  grams: number,
  hours: number,
  colors = 1,
  material: MaterialId = "pla_plus",
): number {
  const c = estimateCost({ grams, hours, material, colors }, DEFAULT_COST_SETTINGS);
  return Math.max(25, Math.ceil(c.recommendedPrice / 5) * 5);
}

export const SHELF_TO_CATEGORY: Record<Exclude<ImportedShelf, "flexi" | "fidget">, ProductCategory> = {
  statues: "statues",
  screen: "screen",
  smoke: "smoke",
  pets: "pets",
  home: "home",
  office: "office",
  trendy: "trendy",
  b2b: "b2b",
};

/** The way back: a listing knows its category, the mover speaks in shelves. */
export const CATEGORY_TO_SHELF = Object.fromEntries(
  Object.entries(SHELF_TO_CATEGORY).map(([shelf, cat]) => [cat, shelf]),
) as Record<ProductCategory, ImportedShelf>;

/** Imported rows that belong on the fidgets tab. */
export function importedFidgets(): Fidget[] {
  return IMPORTED.filter(sellable)
    .filter((m) => m.shelf === "flexi" || m.shelf === "fidget")
    .map((m) => ({
      id: m.id,
      kind: m.shelf === "flexi" ? "flexi" : "fidget",
      name: heName(m.id, m.name),
      nameEn: m.name,
      desc: HE_DESCS[m.id] ?? m.desc,
      price: suggestPrice(m.grams, m.hours, 1, m.material ?? "pla_plus"),
      defaultColor: m.colorHex,
      size: m.size,
      grams: m.grams,
      hours: m.hours,
      time: fmtHours(m.hours),
      hue: m.hue,
      shape: "hex",
      thumbnail: m.image,
      images: m.images,
      creator: m.creator,
      source: "makerworld",
      sourceUrl: m.sourceUrl,
      license: m.license,
      downloads: m.downloads,
      ams: m.colors > 1,
      hoursAms: m.hoursAms,
      gramsAms: m.gramsAms,
      plates: m.plates,
    }));
}

/** Imported rows that belong on a product shelf (statues, pets, home, office). */
export function importedProducts(): Product[] {
  return IMPORTED.filter(sellable)
    .filter((m) => m.shelf !== "flexi" && m.shelf !== "fidget")
    .map((m) => ({
      id: m.id,
      category: SHELF_TO_CATEGORY[m.shelf as Exclude<ImportedShelf, "flexi" | "fidget">],
      categories: [m.shelf, ...(m.also ?? [])]
        .filter((sh) => sh !== "flexi" && sh !== "fidget")
        .map((sh) => SHELF_TO_CATEGORY[sh as Exclude<ImportedShelf, "flexi" | "fidget">]),
      name: heName(m.id, m.name),
      nameEn: m.name,
      desc: HE_DESCS[m.id] ?? m.desc,
      price: suggestPrice(m.grams, m.hours, 1, m.material ?? "pla_plus"),
      defaultColor: m.colorHex,
      size: m.size,
      time: fmtHours(m.hours),
      hours: m.hours,
      grams: m.grams,
      hoursAms: m.hoursAms,
      gramsAms: m.gramsAms,
      plates: m.plates,
      art: m.art ?? "lowpoly",
      image: m.image,
      images: m.images,
      hue: m.hue,
      // The filament the designer sliced with, when MakerWorld named one we
      // stock. PLA+ is the fallback, not the assumption.
      material: m.material ?? "pla_plus",
      colors: m.colors,
      ams: m.colors > 1,
      rating: 4.8,
      orders: Math.round((m.downloads ?? 0) / 500),
      isNew: true,
      // CC-BY asks for the designer's name next to the work.
      creator: m.creator,
      source: "makerworld",
      sourceUrl: m.sourceUrl,
      license: m.license,
    }));
}
