import type { Fidget, Product, ProductArtId, ProductCategory } from "./types";
import { DEFAULT_COST_SETTINGS, estimateCost, fmtHours } from "./costing";
import { IMPORTED_GENERATED, IMPORTED_AT } from "./imported.generated";

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
// Two kinds of model are imported but NOT put on sale, because selling them is
// a legal problem rather than a taste question:
//   • "weapon"  — knives, katanas, shuriken, launchers. Israeli law (חוק
//                 העונשין, נשק קר) makes selling these an offence regardless of
//                 the material they are made of.
//   • "brand"   — KAWS, Bearbrick, Spider-Man, Hello Kitty, anime characters…
//                 Printing one for yourself is one thing; selling copies of a
//                 protected character is trademark/copyright infringement.
// Those rows arrive with `status: "hold"` and the reason in `holds`, and are
// filtered out of the shop. Flip SHOW_HELD_MODELS only for rows you have
// cleared yourself.
//
// `licenseChecked` is false for anything collected through the browser snippet:
// a MakerWorld collection page does not show licences, so the licence has to be
// read on the model's own page before that model is sold.

export type ImportedShelf = "flexi" | "fidget" | "statues" | "pets" | "home" | "office" | "trendy";

export type ImportedModel = {
  id: string;
  name: string;
  /** Hebrew one-liner for the card. */
  desc: string;
  shelf: ImportedShelf;
  /** Print time in hours and filament weight in grams (estimated by the script). */
  hours: number;
  grams: number;
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
};

/** Set to true only for held models you have cleared yourself. */
export const SHOW_HELD_MODELS = false;

export const IMPORTED: ImportedModel[] = IMPORTED_GENERATED;
export const IMPORTED_DATE = IMPORTED_AT;

const sellable = (m: ImportedModel) => m.status === "live" || SHOW_HELD_MODELS;

/** Rows the import held back, for the admin page and the import report. */
export const heldModels = (): ImportedModel[] => IMPORTED.filter((m) => m.status === "hold");

/** Retail price from the shared cost model, rounded up to the nearest ₪5. */
export function suggestPrice(grams: number, hours: number, colors = 1): number {
  const c = estimateCost({ grams, hours, material: "pla_plus", colors }, DEFAULT_COST_SETTINGS);
  return Math.max(25, Math.ceil(c.recommendedPrice / 5) * 5);
}

const SHELF_TO_CATEGORY: Record<Exclude<ImportedShelf, "flexi" | "fidget">, ProductCategory> = {
  statues: "statues",
  pets: "pets",
  home: "home",
  office: "office",
  trendy: "trendy",
};

/** Imported rows that belong on the fidgets tab. */
export function importedFidgets(): Fidget[] {
  return IMPORTED.filter(sellable)
    .filter((m) => m.shelf === "flexi" || m.shelf === "fidget")
    .map((m) => ({
      id: m.id,
      kind: m.shelf === "flexi" ? "flexi" : "fidget",
      name: m.name,
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
    }));
}

/** Imported rows that belong on a product shelf (statues, pets, home, office). */
export function importedProducts(): Product[] {
  return IMPORTED.filter(sellable)
    .filter((m) => m.shelf !== "flexi" && m.shelf !== "fidget")
    .map((m) => ({
      id: m.id,
      category: SHELF_TO_CATEGORY[m.shelf as Exclude<ImportedShelf, "flexi" | "fidget">],
      name: m.name,
      desc: m.desc,
      price: suggestPrice(m.grams, m.hours, m.colors),
      size: m.size,
      time: fmtHours(m.hours),
      hours: m.hours,
      grams: m.grams,
      art: m.art ?? "lowpoly",
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
