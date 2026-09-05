import type { Fidget, Product, ProductArtId, ProductCategory } from "./types";
import { DEFAULT_COST_SETTINGS, estimateCost, fmtHours } from "./costing";
import { IMPORTED_GENERATED, IMPORTED_AT } from "./imported.generated";
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
export type ImportedShelf = "flexi" | "fidget" | "statues" | "screen" | "pets" | "home" | "office" | "trendy" | "b2b";

export type ImportedModel = {
  id: string;
  name: string;
  /** Hebrew one-liner for the card. */
  desc: string;
  shelf: ImportedShelf;
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
  /** The AMS plate, when the designer published one. Much slower: colour
   *  changes and the purge tower can triple the time and the filament. */
  hoursAms?: number;
  gramsAms?: number;
  /** Longest dimension, e.g. "~120mm". */
  size: string;
  /** Colours the model is designed for (AMS). */
  colors: number;
  image?: string;
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
]);

/** Set to true to list everything, weapons included. Leave false. */
export const SHOW_HELD_MODELS = false;

export const IMPORTED: ImportedModel[] = IMPORTED_GENERATED;
export const IMPORTED_DATE = IMPORTED_AT;

const sellable = (m: ImportedModel) =>
  !REMOVED_IDS.has(m.id) && (SHOW_HELD_MODELS || !m.holds.some((h) => BLOCKED_HOLDS.includes(h)));

/** Rows kept out of the shop, for the admin page and the import report. */
export const heldModels = (): ImportedModel[] => IMPORTED.filter((m) => !sellable(m));

/** Retail price from the shared cost model, rounded up to the nearest ₪5. */
export function suggestPrice(grams: number, hours: number, colors = 1): number {
  const c = estimateCost({ grams, hours, material: "pla_plus", colors }, DEFAULT_COST_SETTINGS);
  return Math.max(25, Math.ceil(c.recommendedPrice / 5) * 5);
}

const SHELF_TO_CATEGORY: Record<Exclude<ImportedShelf, "flexi" | "fidget">, ProductCategory> = {
  statues: "statues",
  screen: "screen",
  pets: "pets",
  home: "home",
  office: "office",
  trendy: "trendy",
  b2b: "b2b",
};

/** Imported rows that belong on the fidgets tab. */
export function importedFidgets(): Fidget[] {
  return IMPORTED.filter(sellable)
    .filter((m) => m.shelf === "flexi" || m.shelf === "fidget")
    .map((m) => ({
      id: m.id,
      kind: m.shelf === "flexi" ? "flexi" : "fidget",
      name: heName(m.id, m.name),
      nameEn: m.name,
      desc: m.desc,
      price: suggestPrice(m.grams, m.hours, m.colors),
      size: m.size,
      time: fmtHours(m.hours),
      hue: m.hue,
      shape: "hex",
      thumbnail: m.image,
      creator: m.creator,
      source: "makerworld",
      sourceUrl: m.sourceUrl,
      license: m.license,
      downloads: m.downloads,
      ams: m.colors > 1,
      hoursAms: m.hoursAms,
      gramsAms: m.gramsAms,
    }));
}

/** Imported rows that belong on a product shelf (statues, pets, home, office). */
export function importedProducts(): Product[] {
  return IMPORTED.filter(sellable)
    .filter((m) => m.shelf !== "flexi" && m.shelf !== "fidget")
    .map((m) => ({
      id: m.id,
      category: SHELF_TO_CATEGORY[m.shelf as Exclude<ImportedShelf, "flexi" | "fidget">],
      name: heName(m.id, m.name),
      nameEn: m.name,
      desc: m.desc,
      price: suggestPrice(m.grams, m.hours, m.colors),
      size: m.size,
      time: fmtHours(m.hours),
      hours: m.hours,
      grams: m.grams,
      hoursAms: m.hoursAms,
      gramsAms: m.gramsAms,
      art: m.art ?? "lowpoly",
      image: m.image,
      hue: m.hue,
      material: "pla_plus",
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
