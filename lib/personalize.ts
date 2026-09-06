import { suggestPrice } from "./imported";

// Two add-ons that every product in the shop offers, on the same terms.
//
// They were previously per-product: some items had an engraving field, most
// had none, and only the models a designer happened to publish in several
// plates could be made bigger. Both are now uniform — a customer sees the same
// two choices on every page, and the shop quotes them the same way everywhere.

/** Flat price for putting the customer's own text on anything. */
export const PERSONALIZE_PRICE = 15;

/** How much material a "make it bigger" step adds. */
export const SCALE_STEPS = [0, 10, 20, 30] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

export const SCALE_LABEL: Record<number, string> = {
  0: "רגיל",
  10: "+10 גרם",
  20: "+20 גרם",
  30: "+30 גרם",
};

/**
 * What another `add` grams of the same model is worth.
 *
 * Print time scales with the material: a model twice the weight is a model
 * twice as long on the plate, near enough for a quote. Pricing the delta
 * through suggestPrice keeps it on the same cost model as everything else.
 */
export function scaleExtra(grams: number, hours: number, add: number): number {
  if (add <= 0 || grams <= 0) return 0;
  const ratio = (grams + add) / grams;
  return Math.max(0, suggestPrice(grams + add, hours * ratio, 1) - suggestPrice(grams, hours, 1));
}
