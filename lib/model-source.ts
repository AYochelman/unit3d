import { IMPORTED } from "./imported";
import { PRODUCT_BY_ID } from "./products";
import { FIDGETS } from "./data";
import type { FidgetSource } from "./types";

/**
 * Where the printable file for a thing actually lives.
 *
 * The shop does not host STL files and must not: most of the catalogue is
 * licensed for personal printing only, so re-serving the file from here would
 * be redistribution. What it CAN do is take the owner straight to the page he
 * downloads it from, which is the step he was doing by hand — reading the
 * product name off an order, searching the shelf, then searching MakerWorld.
 *
 * Every route into the cart writes a different key (`productId`, `fidgetId`,
 * `item`…), and orders placed before this existed carry no id at all. So this
 * resolves in three widening steps, and says plainly when it cannot.
 */
export const SOURCE_LABEL: Record<FidgetSource, string> = {
  makerworld: "MakerWorld",
  thingiverse: "Thingiverse",
  printables: "Printables",
  myminifactory: "MyMiniFactory",
};

export type ModelSource = {
  id: string;
  /** The name the shop shows. */
  name: string;
  url: string;
  site?: FidgetSource;
  creator?: string;
  license?: string;
};

const clean = (s: string): string =>
  s
    .replace(/\s*×\s*\d+\s*$/, "") // the "× 3" a quantity appends
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Which site a URL points at.
 *
 * The imported rows carry a `sourceUrl` but no site field — they were all
 * MakerWorld when the importer was written. Reading it off the host keeps that
 * true without assuming it stays true.
 */
function siteOf(url: string): FidgetSource | undefined {
  if (url.includes("makerworld.")) return "makerworld";
  if (url.includes("printables.")) return "printables";
  if (url.includes("thingiverse.")) return "thingiverse";
  if (url.includes("myminifactory.")) return "myminifactory";
  return undefined;
}

/** The whole catalogue as one list of things that might have a source file. */
function all(): ModelSource[] {
  const out: ModelSource[] = [];
  const push = (id: string, name: string, url?: string, site?: FidgetSource, creator?: string, license?: string) => {
    if (url) out.push({ id, name, url, site, creator, license });
  };
  for (const m of IMPORTED) push(m.id, m.name, m.sourceUrl, m.sourceUrl ? siteOf(m.sourceUrl) : undefined, m.creator, m.license);
  for (const p of Object.values(PRODUCT_BY_ID)) push(p.id, p.name, p.sourceUrl, p.source, p.creator);
  for (const f of FIDGETS) push(f.id, f.name, f.sourceUrl, f.source, f.creator, f.license);
  return out;
}

let index: Map<string, ModelSource> | null = null;
let byName: Map<string, ModelSource> | null = null;

function build() {
  if (index && byName) return { index, byName };
  index = new Map();
  byName = new Map();
  for (const m of all()) {
    if (!index.has(m.id)) index.set(m.id, m);
    // First one wins: the imported row is the row with the real source URL.
    const k = clean(m.name);
    if (k && !byName.has(k)) byName.set(k, m);
  }
  return { index, byName };
}

/** By the id the shop knows it under. */
export function modelSourceById(id?: string | null): ModelSource | null {
  if (!id) return null;
  return build().index.get(id) ?? null;
}

/** From whatever key the page that built the cart line happened to use. */
export function modelSourceFromMeta(meta?: Record<string, unknown> | null): ModelSource | null {
  if (!meta) return null;
  for (const key of ["productId", "fidgetId", "item", "modelId", "id"]) {
    const v = meta[key];
    if (typeof v === "string") {
      const hit = modelSourceById(v);
      if (hit) return hit;
    }
  }
  // A few pages already carried the URL itself.
  const url = meta.sourceUrl;
  if (typeof url === "string" && url.startsWith("http")) {
    return { id: "", name: "", url, license: typeof meta.license === "string" ? meta.license : undefined };
  }
  return null;
}

/**
 * Last resort: match the line's title against the catalogue.
 *
 * Orders placed before the line carried an id have nothing else to go on. It
 * is exact-match only — a fuzzy guess here would hand the owner the wrong file
 * to print, which is worse than handing him nothing.
 */
export function modelSourceFromTitle(title?: string | null): ModelSource | null {
  if (!title) return null;
  return build().byName.get(clean(title)) ?? null;
}

/** Everything the admin knows about one order line, in one call. */
export function modelSourceForLine(line: { itemId?: string; title?: string }): ModelSource | null {
  return modelSourceById(line.itemId) ?? modelSourceFromTitle(line.title);
}
