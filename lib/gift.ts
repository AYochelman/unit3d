"use client";
import { create } from "zustand";
import type { CartItem } from "./order-store";

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
