import type { ImportedShelf } from "./imported";

/**
 * A model found somewhere, waiting for the owner to say yes.
 *
 * Nothing here is on the shop. The importer can find a hundred trending models
 * a week, and dropping them straight into the catalogue is how a shop ends up
 * selling things nobody chose. So they land in /admin → "מודלים לאישור",
 * where each one is approved onto a shelf or rejected, and only then does the
 * catalogue change.
 */
export type Candidate = {
  id: string;
  /** MakerWorld's own title, as published. */
  title: string;
  slug: string;
  license: string;
  creator: string;
  image: string;
  downloads: number;
  likes: number;
  /** Sliced weight (g) and print time (h) of the cheapest single-colour plate. */
  grams: number;
  hours: number;
  colors: number;
  /** The shelf the classifier would pick. The owner can override it. */
  suggested: ImportedShelf;
  /** Why it might not belong on the shop at all — brand, licence, subject. */
  warnings: string[];
  /** Where it came from: "trending", "downloadCount"… */
  via: string;
  tags: string;
};

export type Decision = "approved" | "rejected";

/** One line of the owner's answer, saved to public/model-decisions.json. */
export type ModelDecision = {
  id: string;
  decision: Decision;
  /** Which shelf it goes on. Only meaningful when approved. */
  shelf?: ImportedShelf;
  at: string;
};

export type DecisionsFile = { version: 1; decisions: ModelDecision[] };

export const SHELF_LABEL: Record<ImportedShelf, string> = {
  flexi: "פלקסי",
  fidget: "פידג'טים",
  statues: "פסלים",
  screen: "סרטים וסדרות",
  pets: "לחיות",
  home: "לבית",
  office: "למשרד",
  smoke: "מוצרי עישון",
  trendy: "טרנדי",
  b2b: "לעסקים",
};

export const SHELVES = Object.keys(SHELF_LABEL) as ImportedShelf[];
