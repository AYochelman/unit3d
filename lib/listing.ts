// Shared filter / sort model for every product listing (pets, home & office,
// trendy, fidgets). Pages map their items onto ListingStats and call applyListing.

export type ListingStats = {
  id: string;
  price: number;
  /** 1–5 */
  rating: number;
  /** Orders to date (demo counters until there is a backend). */
  orders: number;
  /** Max colours the item is offered in (1 = single colour, 2–4 = AMS). */
  colors: number;
  isNew?: boolean;
};

export type SortId = "popular" | "orders" | "rating" | "priceDesc" | "priceAsc" | "newest";
export type ColorFilter = "all" | "1" | "2" | "3+";
export type PriceFilter = "all" | "lt50" | "50-100" | "gt100";

export type ListingState = { sort: SortId; colors: ColorFilter; price: PriceFilter };

export const DEFAULT_LISTING: ListingState = { sort: "popular", colors: "all", price: "all" };

export const SORTS: { id: SortId; label: string }[] = [
  { id: "popular", label: "פופולרי" },
  { id: "orders", label: "הכי מוזמן" },
  { id: "rating", label: "דירוג הכי גבוה" },
  { id: "priceDesc", label: "מחיר: מהגבוה לנמוך" },
  { id: "priceAsc", label: "מחיר: מהנמוך לגבוה" },
  { id: "newest", label: "חדש באתר" },
];

export const COLOR_FILTERS: { id: ColorFilter; label: string }[] = [
  { id: "all", label: "כל הצבעים" },
  { id: "1", label: "צבע אחד" },
  { id: "2", label: "2 צבעים" },
  { id: "3+", label: "3–4 צבעים (AMS)" },
];

export const PRICE_FILTERS: { id: PriceFilter; label: string }[] = [
  { id: "all", label: "כל מחיר" },
  { id: "lt50", label: "עד ₪50" },
  { id: "50-100", label: "₪50–100" },
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
  const popularity = (it: ListingStats) => it.orders * (0.6 + it.rating / 5);
  out = [...out].sort((a, b) => {
    switch (s.sort) {
      case "orders":
        return b.orders - a.orders;
      case "rating":
        return b.rating - a.rating || b.orders - a.orders;
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

export const fmtOrders = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
