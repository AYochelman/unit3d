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

export type Fidget = {
  id: string;
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

export type ShapeId = "round" | "rect" | "emblem" | "custom";

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
  | "fidgets";

export type OrderConfig = {
  title: string;
  summary: string[];
  price: number | null;
  source: OrderSource;
  meta?: Record<string, unknown>;
};
