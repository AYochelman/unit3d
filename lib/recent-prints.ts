import RECENT from "@/data/recent-prints.json";
import { photoById, type Photo } from "./photos";
import { sellableModels } from "./imported";

/**
 * The products that actually came off this printer lately.
 *
 * The home page used to run a carousel of eight studio photographs on a loop
 * under the heading "הזמנות אמיתיות שנשלחו ללקוחות". They were real prints —
 * but they were the same eight forever, they were not tied to anything a
 * visitor could buy, and clicking one did nothing. A photograph that leads
 * nowhere is decoration; the shop has enough of that.
 *
 * So the section is now a list of catalogue items, taken from real orders:
 * Ariel presses one button in /admin → הזמנות and the items from his finished
 * orders are written to data/recent-prints.json. Each card is the product, and
 * clicking it opens the product. Nothing about the customer is published —
 * only which products were printed.
 *
 * An id that is no longer in the catalogue is dropped rather than drawn as a
 * hole. When the list is empty the section does NOT disappear — a hole in the
 * home page is its own kind of wrong — it falls back to what genuinely IS new
 * here: the models most recently added to the shop, under a heading that says
 * so. Both halves are true; what the section must never do is put "הזמנות
 * אמיתיות" over products nobody ordered.
 */
const ids: string[] = Array.isArray((RECENT as { itemIds?: unknown }).itemIds)
  ? ((RECENT as { itemIds: string[] }).itemIds)
  : [];

export const RECENT_PRINTS: Photo[] = ids
  .map((id) => photoById(id))
  .filter((p): p is Photo => Boolean(p));

/** When the list was last taken from the orders, for the section's own caption. */
export const RECENT_PRINTS_AT: string | null =
  (RECENT as { updatedAt?: string | null }).updatedAt ?? null;

/**
 * The newest things in the shop, for when no order has been published yet.
 *
 * `IMPORTED` is only ever appended to (the nightly sync adds and never
 * rewrites), so the tail of it is genuinely the most recent arrivals — not a
 * guess, and not a random pick dressed up as one.
 */
export const NEWEST_IN_SHOP: Photo[] = sellableModels()
  .filter((m) => !!m.image)
  .slice(-8)
  .reverse()
  .map((m) => photoById(m.id))
  .filter((p): p is Photo => Boolean(p));

/** Which of the two the section is showing, so it can title itself honestly. */
export const SHOWING_ORDERS = RECENT_PRINTS.length > 0;
export const RECENT_SECTION: Photo[] = SHOWING_ORDERS ? RECENT_PRINTS : NEWEST_IN_SHOP;
