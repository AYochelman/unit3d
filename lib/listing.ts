import { rankScore } from "./ranking";
// Shared filter / sort model for every product listing (pets, home & office,
// trendy, fidgets). Pages map their items onto ListingStats and call applyListing.

export type ListingStats = {
  id: string;
  /**
   * The catalogue id, when `id` carries a prefix to keep React keys unique
   * across shelves that mix sources. `PINNED` is matched against this first.
   */
  itemId?: string;
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
  /**
   * Downloads on the platform the model came from, as the designer's page
   * reports them. This is the only number on a card that is measured rather
   * than assigned, so it is what orders every shelf.
   *
   * Undefined means the shop drew it itself and there is no source page to
   * count — those sit after everything with a figure, ordered among
   * themselves by `orders`.
   */
  downloads?: number;
  /** Max colours the item is offered in (1 = single colour, 2-4 = AMS). */
  colors: number;
  isNew?: boolean;
  /** The shelf it is sitting on, so the ranking can ask whether it belongs. */
  shelf?: string;
  /** How many photographs the product page can show. */
  shots?: number;
  /** Matched against the shelf when the model carries no tags. */
  name?: string;
};

export type SortId = "popular" | "priceDesc" | "priceAsc" | "newest";
export type ColorFilter = "all" | "1" | "2" | "3+";
export type PriceFilter = "all" | "lt50" | "50-100" | "gt100";

export type ListingState = { sort: SortId; colors: ColorFilter; price: PriceFilter };

export const DEFAULT_LISTING: ListingState = { sort: "popular", colors: "all", price: "all" };

// "הכי מוזמן" and "דירוג הכי גבוה" are gone with the numbers behind them:
// a shop that has not sold yet cannot sort by how much it has sold. What it
// CAN sort by is how many people downloaded each model where it was published,
// which is a real count of other people's interest — so that is the default.
export const SORTS: { id: SortId; label: string }[] = [
  { id: "popular", label: "הכי פופולריים" },
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

/**
 * The two products that lead every shelf they appear on, in this order.
 *
 * Both are the shop's own, and neither has a download count to be ranked by —
 * so under the rule below they would sit after every imported model, at the
 * very bottom. That is backwards for what they are: the mystery box is the
 * answer to "I don't know what to pick", and the 3D business card is the one
 * object a visitor shows someone else. They earn the top of the shelf by what
 * they do for the shop, not by a number, so the decision is written here
 * rather than faked with an invented download figure.
 *
 * It applies to the default order only. A customer who sorts by price asked a
 * question, and pinning would answer a different one.
 */
export const PINNED: string[] = ["mystery-box", "biz-card-3d"];

/** Position in PINNED, or -1. Lower index wins; -1 means "not pinned". */
const pinRank = (it: ListingStats): number => {
  const i = PINNED.indexOf(it.itemId ?? it.id);
  return i === -1 ? PINNED.indexOf(it.id) : i;
};

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
   * Every shelf runs on the source download count, highest first.
   *
   * The score this replaces was `orders * (0.6 + rating / 5)`, where `orders`
   * was the download count divided by 500 and rounded. That rounding did two
   * things, both wrong: it flattened 15,600 and 15,900 into the same bucket,
   * and it turned every model under 250 downloads into a zero — which then hit
   * the `isNew` branch and jumped to the FRONT of the shelf. Since the import
   * marks every model new, the 50 least-downloaded models led their own
   * categories. Sorting on the raw figure removes both faults at once.
   *
   * `-1` for a missing count, not `0`: the shop's own designs have no source
   * page to count, and they belong after everything that does — not tangled
   * among models that were published and downloaded zero times.
   */
  /**
   * The score lib/ranking.ts builds from five signals, not the download count.
   *
   * `-Infinity` for the shop's own designs: they have no source page and no
   * signals, so a score would be built out of nothing and drop them somewhere
   * arbitrary in the middle. They belong after everything that was measured —
   * except the pinned ones, which are decided above and never reach here.
   */
  const rank = (it: ListingStats) =>
    it.downloads == null && !(it.itemId ?? it.id).startsWith("mw-")
      ? -Infinity
      : rankScore({
        id: it.itemId ?? it.id,
        shelf: it.shelf,
        downloads: it.downloads,
        shots: it.shots,
        name: it.name,
      });
  out = [...out].sort((a, b) => {
    switch (s.sort) {
      case "priceDesc":
        return b.price - a.price;
      case "priceAsc":
        return a.price - b.price;
      case "newest":
        return Number(!!b.isNew) - Number(!!a.isNew) || rank(b) - rank(a);
      default: {
        // Pinned first, in the order they are listed; everything else by the
        // download count, highest first.
        const pa = pinRank(a), pb = pinRank(b);
        if (pa !== -1 || pb !== -1) {
          if (pa === -1) return 1;
          if (pb === -1) return -1;
          return pa - pb;
        }
        return rank(b) - rank(a) || b.orders - a.orders;
      }
    }
  });
  return out;
}

