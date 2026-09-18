import { newId } from "./ids";
import type { Purpose, Reference } from "./types";

export function blankReference(kind: Reference["kind"], title: string): Reference {
  const now = new Date().toISOString();
  return {
    id: newId("ref"),
    kind,
    title,
    note: "",
    tags: [],
    favorite: false,
    collections: [],
    purposes: [],
    use: [],
    avoid: [],
    assets: [],
    analysisMeta: { source: "none" },
    createdAt: now,
    updatedAt: now,
  };
}

const PURPOSE_SET = new Set<string>([
  "direction", "hero", "typography", "colors", "layout", "navigation", "components", "motion",
]);

export function asPurposes(value: unknown): Purpose[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is Purpose => typeof v === "string" && PURPOSE_SET.has(v)))];
}

/** A readable title from a URL when the user did not type one. */
export function titleFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const seg = url.pathname.split("/").filter(Boolean).pop();
    return seg ? `${url.hostname.replace(/^www\./, "")} / ${decodeURIComponent(seg)}` : url.hostname.replace(/^www\./, "");
  } catch {
    return raw.slice(0, 80);
  }
}
