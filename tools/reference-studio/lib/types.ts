// Every shape the studio stores or ships. One file so the API routes, the UI
// and the exporters cannot drift apart.

/** How confident we are in a single stated value. */
export type Confidence = "observed" | "estimated";

/**
 * What a reference is being kept FOR. A reference can serve several purposes -
 * a screenshot is often both the typography reference and the colour reference.
 */
export const PURPOSES = [
  "direction",
  "hero",
  "typography",
  "colors",
  "layout",
  "navigation",
  "components",
  "motion",
] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_LABELS: Record<Purpose, { en: string; he: string }> = {
  direction: { en: "Overall direction", he: "כיוון כללי" },
  hero: { en: "Hero", he: "הירו" },
  typography: { en: "Typography", he: "טיפוגרפיה" },
  colors: { en: "Colors", he: "צבעים" },
  layout: { en: "Body layout", he: "פריסת גוף" },
  navigation: { en: "Navigation", he: "ניווט" },
  components: { en: "Components", he: "רכיבים" },
  motion: { en: "Motion", he: "אנימציה" },
};

export type AssetRole = "image" | "desktop" | "mobile" | "manual" | "artwork";

export interface Asset {
  id: string;
  role: AssetRole;
  /** File name inside data/files. Served through /api/files/<file>. */
  file: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  /** Optional label shown under the thumbnail (e.g. "Desktop 1440x900"). */
  label?: string;
}

export interface Swatch {
  hex: string;
  /** 0..1 share of sampled pixels, when the swatch came from pixel counting. */
  share?: number;
  role?: string;
  name?: string;
  confidence: Confidence;
}

/**
 * Facts read off a live page with the browser. Anything in here is `observed`:
 * it came from getComputedStyle, not from looking at a picture.
 */
export interface ObservedProbe {
  title?: string;
  lang?: string;
  dir?: string;
  fonts: { family: string; usage: number; sample: string; role?: string }[];
  colors: { hex: string; usage: number; where: string }[];
  headings: { tag: string; fontSize: string; fontWeight: string; fontFamily: string; text: string }[];
  body: { fontSize: string; lineHeight: string; fontFamily: string; color: string; background: string };
  buttons: { text: string; background: string; color: string; radius: string; padding: string; border: string; fontSize: string }[];
  containerWidths: number[];
  radii: string[];
  /** CSS-declared transitions/animations, and whether the page ships motion. */
  motion: { transitions: number; animations: number; prefersReducedMotionQuery: boolean; sample: string[] };
  /** Breakpoints found in the page's own stylesheets. */
  breakpoints: string[];
  images: { count: number; withObjectFit: number; sample: string[] };
  viewportMeta?: string;
  capturedAt: string;
}

export interface TypographyAnalysis {
  fonts: { name: string; role: string; confidence: Confidence; evidence?: string }[];
  scale: string;
  weights: string;
  casing: string;
  tracking: string;
  hierarchy: string;
}

export interface Analysis {
  aestheticFamily: string;
  vocabulary: string[];
  character: string;
  adaptation: string[];
  colors: Swatch[];
  typography: TypographyAnalysis;
  layout: { grid: string; spacing: string; density: string; alignment: string; containerWidth: string };
  hero: { composition: string; imageTreatment: string };
  components: { name: string; description: string; confidence: Confidence }[];
  motion: { notes: string; confidence: Confidence };
  /** Explicitly split so the brief can say which is which. */
  facts: string[];
  estimates: string[];
}

export type AnalysisSource = "none" | "ai" | "imported" | "manual" | "observed";

export interface AnalysisMeta {
  source: AnalysisSource;
  model?: string;
  at?: string;
  editedAt?: string;
  /** Free text shown in the UI when something went wrong or was partial. */
  note?: string;
}

export interface ReferenceSource {
  url: string;
  capturedAt?: string;
  status: "captured" | "failed" | "manual" | "pending";
  error?: string;
  httpStatus?: number;
  title?: string;
  observed?: ObservedProbe;
}

export interface Reference {
  id: string;
  kind: "image" | "url";
  title: string;
  note: string;
  tags: string[];
  favorite: boolean;
  collections: string[];
  purposes: Purpose[];
  use: string[];
  avoid: string[];
  assets: Asset[];
  source?: ReferenceSource;
  analysis?: Analysis;
  analysisMeta: AnalysisMeta;
  /** Swatches counted from the pixels of the primary asset. Always observed. */
  autoPalette?: Swatch[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ProjectRef {
  refId: string;
  /** Which part of this reference the project is taking. */
  role: Purpose;
  weight: "primary" | "secondary";
  note?: string;
}

export interface BrandColor { name: string; hex: string }
export interface BrandFont { name: string; role: string }

export interface Project {
  id: string;
  name: string;
  purpose: string;
  audience: string;
  mainAction: string;
  pages: string[];
  sections: string[];
  functionality: string[];
  brand: { colors: BrandColor[]; fonts: BrandFont[]; logo: string; assets: string[] };
  /** Keeps brand colours and fonts even when the references disagree. */
  brandLock: boolean;
  existing: { url: string; codebase: string };
  language: string;
  direction: "ltr" | "rtl" | "both";
  animation: "none" | "subtle" | "moderate" | "expressive";
  mustKeep: string[];
  dislikes: string[];
  refs: ProjectRef[];
  /** Free-form combination instructions, one per line. */
  directives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  /** Never sent to the browser - the API only reports whether it is set. */
  anthropicApiKey?: string;
  model: string;
  /** Capture viewports. */
  desktopViewport: { width: number; height: number };
  mobileViewport: { width: number; height: number };
  captureTimeoutMs: number;
  fullPage: boolean;
  theme: "dark" | "light";
  uiLanguage: "en" | "he";
  /** Optional external services. Off unless the user fills them in. */
  integrations: {
    impeccable: { enabled: boolean; path: string };
    higgsfield: { enabled: boolean; note: string };
    twentyFirst: { enabled: boolean; note: string };
  };
}

export interface Database {
  version: number;
  references: Reference[];
  collections: Collection[];
  projects: Project[];
  settings: Settings;
}
