// Shared domain types for Unit 3D.
//
// NOTE: this file was reconstructed from its usages across the codebase.
// Type-only modules are erased at compile time and therefore leave no trace in
// build output or source maps. If the original `lib/types.ts` is recovered,
// prefer it over this file.

// ─── Shapes & emblems ─────────────────────────────────────────────────────────
export type EmblemShape =
  | "shield"
  | "circle"
  | "diamond"
  | "hex"
  | "wings"
  | "anchor"
  | "rect";

// ─── Audience segments ────────────────────────────────────────────────────────
export type AudienceId = "private" | "soldier" | "b2b";
export type ReviewSeg = "private" | "soldier" | "family" | "b2b";
export type GallerySeg = "private" | "soldier" | "b2b";

export type Audience = {
  id: AudienceId;
  label: string;
  desc: string;
  iconKey: string;
};

// ─── Units ────────────────────────────────────────────────────────────────────
export type Branch = "ground" | "air" | "sea" | "intel" | "police";

export type Unit = {
  id: string;
  name: string;
  branch: Branch;
  price: number;
  time: string;
  size: string;
  shape: EmblemShape;
  hue: number;
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export type Review = {
  id: string;
  name: string;
  tag: string;
  seg: ReviewSeg;
  stars: number;
  txt: string;
  /** What they ordered — drawn on the card as a picture of the item. */
  item?: string;
  art?: ProductArtId;
  hue?: number;
  /** When the review was left, e.g. "לפני שבועיים". */
  when?: string;
  /** Link to the product they are talking about. */
  href?: string;
  /** Ariel's answer, shown under the review. Used where something went wrong. */
  reply?: string;
};

// ─── Gallery ──────────────────────────────────────────────────────────────────
export type GalleryCat =
  | "unit"
  | "keychain"
  | "fidget"
  | "figurine"
  | "part"
  | "b2b";

export type GalleryItem = {
  id: string;
  cat: GalleryCat;
  seg: GallerySeg;
  title: string;
  meta: string;
  hue: number;
  shape: EmblemShape;
};

// ─── Fidgets ──────────────────────────────────────────────────────────────────
export type FidgetSource =
  | "makerworld"
  | "thingiverse"
  | "printables"
  | "myminifactory";

export type FidgetVariant = {
  id: string;
  label: string;
  thumbnail?: string;
  surcharge: number;
  colors: number;
  time: string;
};

/**
 * Two shelves live under the fidgets tab: `flexi` = print-in-place articulated
 * creatures (dragons, pangolins, axolotls), `fidget` = spinners, cubes, sliders.
 * Missing values are inferred by `fidgetKind()` in lib/fidget-kind.ts.
 */
export type FidgetKind = "flexi" | "fidget";

export type Fidget = {
  id: string;
  kind?: FidgetKind;
  name: string;
  desc: string;
  price: number;
  size: string;
  time: string;
  tag?: string;
  hue: number;
  shape: EmblemShape;
  /** Single remote thumbnail (hand-curated items). */
  thumbnail?: string;
  /** Local image set under /public/fidgets/… (generated items). */
  images?: string[];
  creator?: string;
  source?: FidgetSource;
  sourceUrl?: string;
  license?: string;
  downloads?: number;
  ams?: boolean;
  variants?: FidgetVariant[];
  /** Listing stats (demo counters until there is a backend). */
  rating?: number;
  orders?: number;
  /** Original (usually English) title of an imported model. */
  nameEn?: string;
};

// ─── Configurator options ─────────────────────────────────────────────────────
export type Filament = {
  id: string;
  name: string;
  hex: string;
  desc: string;
};

export type FontOpt = {
  id: string;
  name: string;
  preview: string;
  css: string;
  weight: number;
  letter?: string;
  upper?: boolean;
};

export type ShapeId =
  | "round"
  | "rect"
  | "emblem"
  | "custom"
  // Pet-tag silhouettes — only offered by the pet_tag product.
  | "bone"
  | "heart"
  | "fish"
  | "paw";

export type Shape = {
  id: ShapeId;
  label: string;
  icon: string;
};

export type SizeId = "sm" | "md" | "lg";

export type Size = {
  id: SizeId;
  label: string;
  dim: string;
  priceAdd: number;
  time: string;
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export type Faq = {
  q: string;
  a: string;
};

// ─── Order hand-off (configurator/catalog/upload/gallery → contact form) ──────
export type OrderSource =
  | "catalog"
  | "configurator"
  | "upload"
  | "gallery"
  | "fidgets"
  | "pets"
  | "office";

export type OrderConfig = {
  title: string;
  summary: string[];
  price: number | null;
  source: OrderSource;
  meta?: Record<string, unknown>;
};

// ─── Materials (filament families) ───────────────────────────────────────────
export type MaterialId =
  | "pla"
  | "pla_plus"
  | "pla_matte"
  | "pla_silk"
  | "petg"
  | "tpu"
  | "abs";

export type Material = {
  id: MaterialId;
  name: string;
  /** Short label for chips, e.g. "PLA+" */
  short: string;
  desc: string;
  /** Default retail price of a spool in Israel, ILS. Editable in /admin. */
  spoolPriceILS: number;
  /** Spool net weight in kg. */
  spoolKg: number;
  /** Customer-facing surcharge per item for choosing this material. */
  priceAdd: number;
};

// ─── Shop products (pet tags, office & home) ─────────────────────────────────
export type ProductCategory = "pets" | "office" | "home" | "trendy" | "statues" | "b2b";

export type ProductArtId =
  | "bone" | "round" | "heart" | "fish" | "paw" | "qr" | "bagholder" | "scoop"
  | "penholder" | "cableclip" | "headphones" | "phonestand" | "coaster" | "hook"
  | "keyrack" | "cardholder" | "planter" | "bagclip" | "bookmark" | "doorsign"
  | "organizer" | "lighter" | "phonecase" | "dogtag" | "luggage" | "nameplate"
  | "keychain"
  // Statues / display pieces (עמודת הפסלים)
  | "bust" | "chess" | "dragonstatue" | "lowpoly" | "vase" | "trophy"
  | "moon" | "torso";

export type ProductOption = {
  id: string;
  label: string;
  priceAdd: number;
};

export type Product = {
  id: string;
  category: ProductCategory;
  name: string;
  desc: string;
  price: number;
  size: string;
  time: string;
  /** Print time in hours (for costing). */
  hours: number;
  /** Filament weight in grams (for costing). */
  grams: number;
  art: ProductArtId;
  hue: number;
  tag?: string;
  ams?: boolean;
  /** Default material family. */
  material?: MaterialId;
  /** Listing stats (demo counters until there is a backend). */
  rating?: number;
  orders?: number;
  /** Max colours offered (1 = single colour, 2-4 = AMS). Defaults to ams ? 2 : 1. */
  colors?: number;
  isNew?: boolean;
  /** Optional engraving/text field on the product (pet name, phone…). */
  engraving?: { label: string; placeholder: string; max: number; second?: { label: string; placeholder: string; max: number } };
  options?: { label: string; items: ProductOption[] };
  /** Credit for an imported design — CC-BY requires naming the designer. */
  creator?: string;
  /** Original (usually English) title of an imported model. */
  nameEn?: string;
  /** Photograph of the printed model, when the source published one. */
  image?: string;
  source?: FidgetSource;
  sourceUrl?: string;
  license?: string;
};

// ─── Configurator products ───────────────────────────────────────────────────
export type ConfigProductId =
  | "keychain"
  | "pet_tag"
  | "dog_tag"
  | "phone_case"
  | "lighter_case"
  | "luggage_tag"
  | "name_plate"
  | "coaster"
  | "wall_hook"
  | "cable_clip"
  | "bookmark";

export type ConfigModel = { id: string; label: string };

export type ConfigProduct = {
  id: ConfigProductId;
  label: string;
  desc: string;
  art: ProductArtId;
  basePrice: number;
  hours: number;
  grams: number;
  material: MaterialId;
  /** Shows the base-shape step (round / rect / emblem / custom). */
  hasShape: boolean;
  /** Shape choices for this product. Defaults to SHAPES when not given. */
  shapes?: Shape[];
  /** Shows the size step (uses SIZES for keychain, or `sizes` below). */
  hasSize: boolean;
  /** Shows the text step. */
  hasText: boolean;
  /** Flat printable face available for the free designer. */
  hasDesigner: boolean;
  /** Device / model picker (phone cases, lighter cases). */
  models?: { label: string; items: ConfigModel[] };
  /** Product-specific sizes (when not using the keychain SIZES). */
  sizes?: Size[];
  /** Printable face in millimetres [width, height] for the designer canvas. */
  face: [number, number];
};

// ─── Free designer (PowerPoint-style canvas) ─────────────────────────────────
export type DesignFontId =
  | "heebo"
  | "rubik"
  | "assistant"
  | "secular"
  | "frank"
  | "suez"
  | "karantina"
  | "mono";

export type DesignShapeKind =
  | "rect"
  | "roundrect"
  | "circle"
  | "triangle"
  | "star"
  | "hexagon"
  | "heart"
  | "arrow"
  | "diamond"
  | "line";

export type DesignTextElement = {
  id: string;
  kind: "text";
  text: string;
  font: DesignFontId;
  size: number;
  bold: boolean;
  fill: string;
  x: number;
  y: number;
  rotation: number;
};

export type DesignShapeElement = {
  id: string;
  kind: "shape";
  shape: DesignShapeKind;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

export type DesignElement = DesignTextElement | DesignShapeElement;

export type Design = {
  /** Canvas size in millimetres (the product face). */
  w: number;
  h: number;
  elements: DesignElement[];
};
