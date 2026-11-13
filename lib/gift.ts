"use client";
import { create } from "zustand";
import type { CartItem } from "./order-store";
import type { useLivePricer } from "./live-price";
import type { Fidget } from "./types";
import { FIDGETS } from "./data";
import { fidgetGrams } from "./products";
import { parseHours } from "./costing";

/**
 * Spend over a threshold, get a gift on us.
 *
 * The cart total that counts is what the customer pays for: priced lines only
 * (a quote-only line has no price yet), and never the gifts themselves. The
 * gift line is added and removed by components/gift/GiftWatcher as the total
 * crosses the threshold, so the order always says whether it was earned.
 */
export const GIFT = {
  threshold: 100,
  title: "פידג'ט הפתעה",
  /** The surprise is picked from fidgets that sell for less than this. */
  maxValue: 10,
  /** One line in the cart and in the WhatsApp message (tells the owner what to pack). */
  line: "מתנה מאיתנו בקנייה מעל ₪100 · פידג'ט הפתעה בשווי מתחת ל-₪10, לפי בחירתנו",
};

export const isGift = (it: CartItem) => it.meta?.gift === true;

/** What counts toward the gift: priced lines that are not gifts of any kind. */
export const giftTotal = (items: CartItem[]) =>
  items.filter((it) => !isGift(it) && it.meta?.bfFree !== true).reduce((s, it) => s + (it.price ?? 0), 0);

export const giftMissing = (items: CartItem[]) => Math.max(0, GIFT.threshold - giftTotal(items));

/** The celebration and the "₪X to go" hint, raised by GiftWatcher. */
export const useGiftStore = create<{
  celebrate: number;   // bumps each time the gift unlocks
  hint: number;        // bumps each time the total moves while still short
  fire: () => void;
  nudge: () => void;
}>((set) => ({
  celebrate: 0,
  hint: 0,
  fire: () => set((s) => ({ celebrate: s.celebrate + 1 })),
  nudge: () => set((s) => ({ hint: s.hint + 1 })),
}));

export type GiftChoice = { f: Fidget; price: number };

/** What the customer may pick as the gift: photographed fidgets under GIFT.maxValue, most liked first. */
export const giftChoices = (priceOf: ReturnType<typeof useLivePricer>): GiftChoice[] =>
  FIDGETS.filter((f) => f.thumbnail)
    .map((f) => ({ f, price: priceOf({ id: f.id, price: f.price, grams: fidgetGrams(f), hours: parseHours(f.time) }) }))
    .filter((x) => x.price > 0 && x.price < GIFT.maxValue)
    .sort((a, b) => (b.f.downloads ?? 0) - (a.f.downloads ?? 0));

/** The gift line, as a surprise or as the fidget the customer picked. */
export function giftLine(pick?: { id: string; name: string } | null) {
  return pick
    ? { title: `מתנה: ${pick.name}`, summary: [`מתנה מאיתנו בקנייה מעל ₪${GIFT.threshold}`, `פידג'ט: ${pick.name}`, "צבע: כמו בתמונה"], price: 0, source: "fidgets" as const, meta: { gift: true, giftFidgetId: pick.id, qty: 1, baseUnitPrice: 0 } }
    : { title: `מתנה: ${GIFT.title}`, summary: [GIFT.line], price: 0, source: "fidgets" as const, meta: { gift: true, qty: 1, baseUnitPrice: 0 } };
}
