import { photoById, type Photo } from "./photos";
import { sellableModels } from "./imported";

/**
 * The newest models on the shelves.
 *
 * This block on the home page has been three things. It started as a carousel
 * of eight studio photographs on a loop under "הזמנות אמיתיות שנשלחו ללקוחות":
 * real prints, but the same eight forever, tied to nothing a visitor could buy,
 * and clicking one did nothing. Then it was going to be driven by the order
 * book — Ariel would publish which products had actually been printed — and
 * that was dropped: it needed a button pressed to stay true, and a home page
 * that rots the week nobody presses it is worse than one that does not claim
 * anything about orders at all.
 *
 * What is left is the claim the shop can always make honestly and for free:
 * this is what arrived most recently. `IMPORTED` is only ever appended to (the
 * nightly sync adds and never rewrites), so its tail really is the latest
 * arrivals — not a guess, and not a random pick dressed up as one. It updates
 * itself every time a model is approved, with nothing for anyone to remember.
 */
export const NEWEST_IN_SHOP: Photo[] = sellableModels()
  .filter((m) => !!m.image)
  .slice(-8)
  .reverse()
  .map((m) => photoById(m.id))
  .filter((p): p is Photo => Boolean(p));
