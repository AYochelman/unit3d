import { sellableModels, type ImportedShelf } from "./imported";
import { SHELF_LABEL, SHELVES } from "./candidates";
import { heName } from "./he-names";
import { photoSrc } from "./assets";
import { HD_IMAGES } from "./hdImages.generated";

/**
 * The home-page gallery: on every shelf, the sellable model with the most
 * downloads. Recomputed from the catalogue on each build, so a new leader
 * takes the slot by itself.
 *
 * Photos, best first: the 1600px copy scripts/fetch-hd.mjs keeps for these
 * models, then the catalogue's 900px copy of the designer's first photo, then
 * the 400px cover. All three are served from the site itself, which matters:
 * the gallery draws them with WebGL, and that refuses another domain's image.
 */
export type ShowcaseItem = {
  id: string;
  name: string;
  shelf: ImportedShelf;
  shelfLabel: string;
  href: string;
  creator?: string;
  /** Largest copy we have. */
  src: string;
  /** For phones and the thumbnail strip. */
  small: string;
  hd: boolean;
};

const ORDER: ImportedShelf[] = ["flexi", "fidget", "statues", "screen", "pets", "home", "office", "smoke", "b2b"];

export function showcaseItems(): ShowcaseItem[] {
  const pool = sellableModels();
  const out: ShowcaseItem[] = [];
  for (const shelf of ORDER.filter((s) => SHELVES.includes(s))) {
    const top = pool
      .filter((m) => m.shelf === shelf && (m.images?.length || m.image))
      .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))[0];
    if (!top) continue;
    const local = top.images?.[0] ?? top.image!;
    const hd = HD_IMAGES[top.id];
    out.push({
      id: top.id,
      name: heName(top.id, top.name),
      shelf,
      shelfLabel: SHELF_LABEL[shelf],
      href: shelf === "flexi" || shelf === "fidget" ? `/fidgets/${top.id}` : `/products/${top.id}`,
      creator: top.creator,
      src: hd ? photoSrc(`/${hd}`) : local,
      small: local,
      hd: !!hd,
    });
  }
  return out;
}
