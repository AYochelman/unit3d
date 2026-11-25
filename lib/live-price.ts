"use client";
import { useCallback } from "react";
import { useAdminStore } from "./admin-store";

// One place decides what price a customer sees, so the shelf, the product page,
// the catalogue and the cart can never disagree.
//
// Order of authority:
//   1. a price the owner typed by hand in /admin  (override)
//   2. cost + target margin, when automatic pricing is switched on
//   3. the catalogue price written in lib/products.ts
//
// Nothing here reads storage: the numbers come from the admin store, which is
// seeded at boot from public/admin-settings.json (see AdminSettingsBoot) so a
// saved price list applies to every visitor, not only to the owner's session.

// The rule itself lives in lib/price-rule.ts, outside this "use client"
// module, so the server-built help-bot knowledge file can price the same way.
export { resolvePrice, type Priceable } from "./price-rule";
import { resolvePrice, type Priceable } from "./price-rule";

/**
 * Above this, a shelf price stops being useful.
 *
 * A 1.2kg hydroponic tower is thirty-five hours of machine time; the cost
 * model prices it honestly at several hundred shekels, and a number like that
 * on a card reads as a mistake rather than as a quote. These are real products
 * and worth showing — they are just not products you buy by tapping a price.
 * So they show "לפי הזמנה" and lead to a conversation instead.
 *
 * A price the owner typed himself always wins: if he decided a heavy piece
 * sells for a number, that number is the answer and this rule steps aside.
 */
export const MADE_TO_ORDER_FROM = 300;

/** Is this item quoted rather than priced? */
export function useQuoteOnly(item: Priceable): boolean {
  const overrides = useAdminStore((s) => s.overrides);
  const price = useLivePrice(item);
  return overrides[item.id]?.price == null && price >= MADE_TO_ORDER_FROM;
}

/** Live price for one item. Re-renders when the owner changes a setting. */
export function useLivePrice(item: Priceable): number {
  const overrides = useAdminStore((s) => s.overrides);
  const settings = useAdminStore((s) => s.settings);
  const pricing = useAdminStore((s) => s.pricing);
  return resolvePrice(item, overrides, settings, pricing);
}

/**
 * Same, for a list — one subscription instead of one per row. The function
 * keeps its identity until a setting changes, so a list memoised on it is
 * computed once, not on every render.
 */
export function useLivePricer(): (item: Priceable) => number {
  const overrides = useAdminStore((s) => s.overrides);
  const settings = useAdminStore((s) => s.settings);
  const pricing = useAdminStore((s) => s.pricing);
  return useCallback((item: Priceable) => resolvePrice(item, overrides, settings, pricing), [overrides, settings, pricing]);
}
