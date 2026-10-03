import type { Purpose, Reference } from "./types";

/**
 * Pure list logic, deliberately kept out of the store: no React, no fetch, no
 * browser. That is what makes it testable on its own, and the filter rules are
 * the part most worth testing.
 */
export interface Filters {
  query: string;
  tags: string[];
  collection: string | null;
  purpose: Purpose | null;
  favorites: boolean;
  kind: "all" | "image" | "url";
  unanalysed: boolean;
}

export const EMPTY_FILTERS: Filters = {
  query: "", tags: [], collection: null, purpose: null, favorites: false, kind: "all", unanalysed: false,
};

/** The filtered list the grid renders. Tags are ANDed; text is a broad match. */
export function visibleReferences(references: Reference[], filters: Filters): Reference[] {
  const q = filters.query.trim().toLowerCase();
  return references.filter((ref) => {
    if (filters.favorites && !ref.favorite) return false;
    if (filters.kind !== "all" && ref.kind !== filters.kind) return false;
    if (filters.collection && !ref.collections.includes(filters.collection)) return false;
    if (filters.purpose && !ref.purposes.includes(filters.purpose)) return false;
    if (filters.unanalysed && ref.analysis) return false;
    if (filters.tags.length && !filters.tags.every((t) => ref.tags.includes(t))) return false;
    if (!q) return true;
    // Searching the analysis too is the difference between "find the file I
    // named right" and "find the reference I remember the feeling of".
    const haystack = [
      ref.title, ref.note, ref.source?.url ?? "", ref.tags.join(" "),
      ref.analysis?.aestheticFamily ?? "", ref.analysis?.vocabulary.join(" ") ?? "",
      ref.analysis?.character ?? "",
      ref.use.join(" "), ref.avoid.join(" "),
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function allTags(references: Reference[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ref of references) for (const tag of ref.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}
