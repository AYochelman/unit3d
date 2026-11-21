import { newId } from "./ids";
import type { Project, ProjectRef, Purpose } from "./types";

export function blankProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    id: newId("prj"),
    name,
    purpose: "", audience: "", mainAction: "",
    pages: [], sections: [], functionality: [],
    brand: { colors: [], fonts: [], logo: "", assets: [] },
    brandLock: false,
    existing: { url: "", codebase: "" },
    language: "", direction: "ltr", animation: "subtle",
    mustKeep: [], dislikes: [], refs: [], directives: [],
    createdAt: now, updatedAt: now,
  };
}

const PURPOSES = new Set(["direction", "hero", "typography", "colors", "layout", "navigation", "components", "motion"]);

export function asProjectRefs(value: unknown): ProjectRef[] {
  if (!Array.isArray(value)) return [];
  const out: ProjectRef[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const refId = typeof r.refId === "string" ? r.refId : "";
    const role = typeof r.role === "string" && PURPOSES.has(r.role) ? (r.role as Purpose) : "direction";
    if (!refId) continue;
    out.push({
      refId,
      role,
      weight: r.weight === "secondary" ? "secondary" : "primary",
      note: typeof r.note === "string" ? r.note.slice(0, 300) : undefined,
    });
  }
  return out.slice(0, 60);
}
