// Shared filter / sort model for every product listing (pets, home & office,
// trendy, fidgets). Pages map their items onto ListingStats and call applyListing.

export type ListingStats = {
  id: string;
  price: number;
  /**
   * An internal ranking signal ONLY — never shown.
   *
   * `orders` is derived from the designer's download count on the source
   * platform and `rating` is a constant. They were once printed on every card
   * as "4.8 ★ · 1,240 הזמנות", which is an invented sales figure and an
   * invented review score presented as fact. They now order the grid and
   * nothing else.
   */
  rating: number;
  orders: number;
  /** Max colours the item is offered in (1 = single colour, 2-4 = AMS). */
  colors: number;
  isNew?: boolean;
};

export type SortId = "popular" | "priceDesc" | "priceAsc" | "newest";
export type ColorFilter = "all" | "1" | "2" | "3+";
export type PriceFilter = "all" | "lt50" | "50-100" | "gt100";

export type ListingState = { sort: SortId; colors: ColorFilter; price: PriceFilter };

export const DEFAULT_LISTING: ListingState = { sort: "popular", colors: "all", price: "all" };

// "הכי מוזמן" and "דירוג הכי גבוה" are gone with the numbers behind them:
// a shop that has not sold yet cannot sort by how much it has sold.
export const SORTS: { id: SortId; label: string }[] = [
  { id: "popular", label: "מומלצים" },
  { id: "priceDesc", label: "מחיר: מהגבוה לנמוך" },
  { id: "priceAsc", label: "מחיר: מהנמוך לגבוה" },
  { id: "newest", label: "חדש באתר" },
];

export const COLOR_FILTERS: { id: ColorFilter; label: string }[] = [
  { id: "all", label: "כל הצבעים" },
  { id: "1", label: "צבע אחד" },
  { id: "2", label: "2 צבעים" },
  // Plain hyphen, not an en dash: U+2013 is BiDi class ON and flips number
  // ranges under an RTL base direction ("50-100" would render "100-50").
  { id: "3+", label: "3-4 צבעים (AMS)" },
];

export const PRICE_FILTERS: { id: PriceFilter; label: string }[] = [
  { id: "all", label: "כל מחיר" },
  { id: "lt50", label: "עד ₪50" },
  { id: "50-100", label: "₪50-100" },
  { id: "gt100", label: "מעל ₪100" },
];

export function applyListing<T extends ListingStats>(items: T[], s: ListingState): T[] {
  let out = items.filter((it) => {
    if (s.colors === "1" && it.colors !== 1) return false;
    if (s.colors === "2" && it.colors !== 2) return false;
    if (s.colors === "3+" && it.colors < 3) return false;
    if (s.price === "lt50" && it.price >= 50) return false;
    if (s.price === "50-100" && (it.price < 50 || it.price > 100)) return false;
    if (s.price === "gt100" && it.price <= 100) return false;
    return true;
  });
  /**
   * "מומלצים", for a shop where most things have never been ordered.
   *
   * The score is orders-weighted, so anything with no orders scores zero and
   * lands at the very bottom — behind every older product, on page two, where
   * nobody looks. A product added today would therefore be invisible on its
   * own shelf on the day it was added, which is the opposite of recommending.
   * Something marked new goes to the front until it has numbers of its own.
   */
  const popularity = (it: ListingStats) =>
    it.orders ? it.orders * (0.6 + it.rating / 5) : it.isNew ? Number.MAX_SAFE_INTEGER : 0;
  out = [...out].sort((a, b) => {
    switch (s.sort) {
      case "priceDesc":
        return b.price - a.price;
      case "priceAsc":
        return a.price - b.price;
      case "newest":
        return Number(!!b.isNew) - Number(!!a.isNew) || b.orders - a.orders;
      default:
        return popularity(b) - popularity(a);
    }
  });
  return out;
}

