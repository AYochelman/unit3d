/**
 * The shop's running deals, as plain numbers.
 *
 * Kept out of the "use client" modules that drive the bar, popup and cart
 * (lib/black-friday.ts, lib/gift.ts re-export these) so the help bot and its
 * build-time knowledge file can state the same deal the cart applies.
 */
/**
 * Black Friday 2026 — everything about the sale in one place.
 *
 * The deal: buy two fidgets, a third worth up to FREE_MAX is free. The bar,
 * the popup and the cart all read these numbers, so moving a date or the cap
 * is a one-line change here.
 */
export const BF = {
  /** Israel time. The sale runs Black Friday to the end of Cyber Monday. */
  start: new Date("2026-11-27T00:00:00+02:00"),
  end: new Date("2026-12-01T00:00:00+02:00"),
  /** Fidgets the customer pays for before the free one unlocks. */
  need: 2,
  /** The free fidget's live price may be at most this. */
  freeMax: 15,
  /**
   * Mystery boxes set aside for the sale. Typed by hand: there is no server
   * that counts orders as they come in, so update it as boxes go out —
   * a "left" number that never moves is a number nobody believes.
   */
  mysteryLeft: 30,
  /** What a regular mystery box holds; the sale edition adds one more on us. */
  mysteryItems: 5,
};

export const GIFT = {
  threshold: 100,
  title: "פידג'ט הפתעה",
  /** The surprise is picked from fidgets that sell for less than this. */
  maxValue: 10,
  /** One line in the cart and in the WhatsApp message (tells the owner what to pack). */
  line: "מתנה מאיתנו בקנייה מעל ₪100 · פידג'ט הפתעה בשווי מתחת ל-₪10, לפי בחירתנו",
};
