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
// IMPORTANT — licensing. We import the model's NAME, PICTURE, CREATOR and a
// LINK BACK, and we sell a PRINTING SERVICE of it. We never redistribute the
// STL. Most MakerWorld models are CC-BY / CC-BY-NC / CC-BY-NC-ND: BY always
// requires crediting the designer (we do, on the card and the product page),
// and NC forbids commercial use — so `commercialOk` is false for those and
// they are kept out of the shop by default. Flip `SHOW_NON_COMMERCIAL` only
// for models whose designer gave you permission in writing.

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
  /** False for NC (non-commercial) licences — hidden from the shop. */
  commercialOk: boolean;
};

/** Set to true only for models you have written permission to sell. */
export const SHOW_NON_COMMERCIAL = false;

export const IMPORTED: ImportedModel[] = IMPORTED_GENERATED;
export const IMPORTED_DATE = IMPORTED_AT;

const sellable = (m: ImportedModel) => m.commercialOk || SHOW_NON_COMMERCIAL;

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
    }));
}
