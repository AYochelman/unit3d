import { IMPORTED, type ImportedShelf } from "./imported";

// Real photographs, from the models we import.
//
// The shop had illustrations everywhere and photos almost nowhere, which makes
// a print shop look like it has never printed anything. Every imported model
// carries the photo its designer published, so this module hands those out:
// pick a shelf (or a keyword) and get back the best-looking, most-downloaded
// item that actually has an image.
//
// The photos are hotlinked from MakerWorld's CDN, and every place that shows
// one also shows the designer's name and a link to the original — the same
// attribution the model pages carry.

export type Photo = {
  id: string;
  src: string;
  name: string;
  creator?: string;
  href: string;
  shelf: ImportedShelf;
  price?: number;
};

const withImage = IMPORTED.filter((m) => !!m.image && !m.holds.includes("weapon"));

/** Most-downloaded first — the popular models tend to have the best photos. */
const ranked = [...withImage].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));

const toPhoto = (m: (typeof ranked)[number]): Photo => ({
  id: m.id,
  src: m.image!,
  name: m.name,
  creator: m.creator,
  href: m.shelf === "flexi" || m.shelf === "fidget" ? `/fidgets/${m.id}` : `/products/${m.id}`,
  shelf: m.shelf,
});

/** N photos from one shelf, best first. */
export function photosFromShelf(shelf: ImportedShelf, n = 6): Photo[] {
  return ranked.filter((m) => m.shelf === shelf).slice(0, n).map(toPhoto);
}

/** N photos spread across the given shelves, round-robin so no shelf dominates. */
export function photoMix(shelves: ImportedShelf[], n = 10): Photo[] {
  const pools = shelves.map((s) => ranked.filter((m) => m.shelf === s));
  const out: Photo[] = [];
  for (let i = 0; out.length < n; i++) {
    let added = false;
    for (const pool of pools) {
      if (pool[i]) {
        out.push(toPhoto(pool[i]));
        added = true;
        if (out.length >= n) break;
      }
    }
    if (!added) break; // every pool exhausted
  }
  return out;
}

/** The best photo whose name or shelf matches — for a specific slot. */
export function photoFor(match: RegExp, shelf?: ImportedShelf): Photo | undefined {
  const pool = shelf ? ranked.filter((m) => m.shelf === shelf) : ranked;
  const hit = pool.find((m) => match.test(m.name)) ?? pool[0];
  return hit ? toPhoto(hit) : undefined;
}

/** The photo of one specific model, by id. */
export function photoById(id: string | null | undefined): Photo | undefined {
  if (!id) return undefined;
  const m = withImage.find((x) => x.id === id);
  return m ? toPhoto(m) : undefined;
}

/** Deterministic photo for a slot index — same input, same photo every render. */
export function photoAt(i: number, shelves?: ImportedShelf[]): Photo | undefined {
  const pool = shelves ? ranked.filter((m) => shelves.includes(m.shelf)) : ranked;
  return pool.length ? toPhoto(pool[i % pool.length]) : undefined;
}

export const HAS_PHOTOS = ranked.length > 0;
export const PHOTO_COUNT = ranked.length;
