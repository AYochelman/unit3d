import RECENT from "@/data/recent-prints.json";
import { photoById, type Photo } from "./photos";

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
 * hole, and an empty list hides the whole section. "Recently printed" with
 * nothing behind it is exactly the claim this section exists to stop making.
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
