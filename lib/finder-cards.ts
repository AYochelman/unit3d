import { FIDGETS, UNITS } from "./data";
import { CONFIG_PRODUCTS, PRODUCTS, fidgetGrams, fidgetStats } from "./products";
import { parseHours } from "./costing";
import { shelvesOf } from "./use-shelves";
import { applyListing, DEFAULT_LISTING } from "./listing";
import type { ImportedShelf } from "./imported";
import type { ProductCategory } from "./types";
import { productToCard, type ListingCard } from "@/components/ProductGrid";
import type { ShelfId } from "./finder";

/**
 * What each shelf of the questionnaire actually holds — as cards, from the
 * same sources the shelf pages read, so the finder can show real products
 * and quote real prices instead of a guess.
 *
 * `moves` is the owner's live shelf moves from the admin store; the pages
 * honour them (lib/use-shelves.ts) and so does this.
 */
const CATEGORIES: Partial<Record<ShelfId, ProductCategory[]>> = {
  pets: ["pets"],
  statues: ["statues"],
  screen: ["screen"],
  smoke: ["smoke"],
  "home-office": ["home", "office"],
  b2b: ["b2b"],
};

export function cardsForShelf(shelf: ShelfId, moves: Record<string, ImportedShelf[]> = {}): ListingCard[] {
  if (shelf === "fidgets") {
    return FIDGETS.filter((f) => f.thumbnail || f.images?.length).map((f) => {
      const st = fidgetStats(f);
      return {
        id: `fidget-${f.id}`, itemId: f.id, href: `/fidgets/${f.id}`,
        name: f.name, desc: f.desc, price: f.price, size: f.size, time: f.time,
        grams: fidgetGrams(f), hours: parseHours(f.time), hue: f.hue,
        image: f.thumbnail ?? f.images?.[0], category: "פידג'ט",
        colors: st.colors, rating: st.rating, orders: st.orders, downloads: f.downloads,
        shelf: "fidget", shots: f.images?.length ?? (f.thumbnail ? 1 : 0),
      };
    });
  }
  if (shelf === "configurator") {
    return CONFIG_PRODUCTS.map((c) => ({
      id: `config-${c.id}`, itemId: `cfg-${c.id}`, href: `/configurator?product=${c.id}`,
      name: c.label, desc: c.desc, price: c.basePrice,
      size: `${c.face[0]}×${c.face[1]}mm`, time: `${c.hours}h`, grams: c.grams, hours: c.hours,
      hue: 145, art: c.art, image: c.image, category: "מעצב",
      colors: c.hasDesigner ? 4 : 1, rating: 4.9, orders: 120, personalizable: true,
    }));
  }
  const cats = CATEGORIES[shelf];
  if (!cats) return [];
  return PRODUCTS
    .filter((p) => !!p.image && shelvesOf(p, moves).some((c) => cats.includes(c)))
    .map((p) => ({ ...productToCard(p), id: `product-${p.id}`, itemId: p.id }));
}

/** The prices a shelf is really sold at: the middle 80%, rounded to ₪5. */
export function shelfPriceText(shelf: ShelfId): string {
  const prices =
    shelf === "catalog" ? UNITS.map((u) => u.price)
    : shelf === "upload" ? []
    : cardsForShelf(shelf).map((c) => c.price);
  if (!prices.length) return "לפי הקובץ";
  const s = [...prices].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];
  const r5 = (n: number) => Math.round(n / 5) * 5;
  const lo = r5(at(0.1)), hi = r5(at(0.9));
  return lo === hi ? `₪${lo}` : `₪${lo}–${hi}`;
}

export type BudgetId = "low" | "mid" | "high" | "any";
const BUDGET: Record<BudgetId, (p: number) => boolean> = {
  low: (p) => p <= 50,
  mid: (p) => p > 50 && p <= 150,
  high: (p) => p > 150,
  any: () => true,
};

/**
 * A few real products for the result page: the shelf's cards, in the order
 * the shelf itself shows them, within the budget when that leaves anything.
 * Empty means "send them to the shelf" — the page says so.
 */
export function suggestions(shelf: ShelfId, budget: BudgetId, moves: Record<string, ImportedShelf[]>, n = 6): ListingCard[] {
  const all = applyListing(cardsForShelf(shelf, moves), DEFAULT_LISTING);
  const within = all.filter((c) => BUDGET[budget](c.price));
  return (within.length >= 3 ? within : all).slice(0, n);
}
