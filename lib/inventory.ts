import type { MaterialId } from "./types";
import { MATERIALS } from "./materials";
import { FILAMENTS } from "./data";

// Which filament we actually have on the shelf, per material family and colour.
//
// The map only records what is OUT: a missing key means "in stock". That way an
// empty inventory means a fully stocked shop, and nothing breaks if a new colour
// or material is added later.

/** `${material}:${colourId}` */
export type StockKey = string;
export type StockMap = Record<StockKey, boolean>;

export const stockKey = (material: MaterialId, color: string): StockKey => `${material}:${color}`;

export const isColorInStock = (stock: StockMap, material: MaterialId, color: string): boolean =>
  stock[stockKey(material, color)] !== false;

/** A material is usable while at least one of its colours is on the shelf. */
export const isMaterialInStock = (stock: StockMap, material: MaterialId): boolean =>
  FILAMENTS.some((f) => isColorInStock(stock, material, f.id));

export const colorsInStock = (stock: StockMap, material: MaterialId): string[] =>
  FILAMENTS.filter((f) => isColorInStock(stock, material, f.id)).map((f) => f.id);

/** Default material for anything that does not name one. */
export const DEFAULT_MATERIAL: MaterialId = "pla_plus";

export type Sellable = { id: string; name: string; material?: MaterialId };

/** Can we print this item at all right now? */
export const isItemInStock = (stock: StockMap, item: Sellable): boolean =>
  isMaterialInStock(stock, item.material ?? DEFAULT_MATERIAL);

// ─── Waiting list ────────────────────────────────────────────────────────────

export type Interest = {
  id: string;
  itemId: string;
  itemName: string;
  material: MaterialId;
  color?: string;
  email: string;
  at: string;
};

export type BuyAdvice = {
  material: MaterialId;
  materialName: string;
  /** How many people asked to be told when this comes back. */
  waiting: number;
  /** How many items in the shop are blocked by it. */
  blocked: number;
  /** Colours people specifically asked for, most-asked first. */
  colors: { id: string; name: string; hex: string; count: number }[];
  /** Cost of one 1kg spool, from the admin's own spool prices. */
  spoolPrice: number;
  score: number;
};

/**
 * What to buy next.
 *
 * Ranked by the two things that actually matter: how many people are waiting on
 * it, and how much of the catalogue it unblocks. A customer who left an e-mail
 * counts for more than a product sitting on a shelf nobody asked about, hence
 * the 3:1 weighting.
 */
export function buyAdvice(
  stock: StockMap,
  interest: Interest[],
  items: Sellable[],
  spoolPrices: Record<MaterialId, number>,
): BuyAdvice[] {
  const out: BuyAdvice[] = [];
  for (const m of MATERIALS) {
    if (isMaterialInStock(stock, m.id)) continue;
    const mine = interest.filter((i) => i.material === m.id);
    const blocked = items.filter((i) => (i.material ?? DEFAULT_MATERIAL) === m.id).length;
    if (!mine.length && !blocked) continue;

    const byColor = new Map<string, number>();
    for (const i of mine) {
      if (!i.color) continue;
      byColor.set(i.color, (byColor.get(i.color) ?? 0) + 1);
    }
    const colors = [...byColor.entries()]
      .map(([id, count]) => {
        const f = FILAMENTS.find((x) => x.id === id);
        return { id, name: f?.name ?? id, hex: f?.hex ?? "#888", count };
      })
      .sort((a, b) => b.count - a.count);

    out.push({
      material: m.id,
      materialName: m.name,
      waiting: mine.length,
      blocked,
      colors,
      spoolPrice: spoolPrices[m.id] ?? m.spoolPriceILS,
      score: mine.length * 3 + blocked,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
