"use client";
import { create } from "zustand";
import { FIDGETS } from "./data";
import { fidgetGrams } from "./products";
import { parseHours } from "./costing";
import type { useLivePricer } from "./live-price";
import type { CartItem } from "./order-store";
import type { Fidget } from "./types";

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

export type BfPhase = "before" | "live" | "over";

/** `?bf=live` (or `before`/`over`) forces a phase, for checking the sale before it opens. */
export function bfPhase(now: number, forced?: string | null): BfPhase {
  if (forced === "live" || forced === "before" || forced === "over") return forced;
  if (now < BF.start.getTime()) return "before";
  if (now < BF.end.getTime()) return "live";
  return "over";
}

/** Read once and kept for the visit, so the preview survives moving between pages. */
let forced: string | null | undefined;
export const bfForced = (): string | null => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("bf");
  if (q) forced = q;
  return forced ?? null;
};

export type BfPick = { f: Fidget; price: number };

const priced = (priceOf: ReturnType<typeof useLivePricer>) =>
  FIDGETS.filter((f) => f.thumbnail)
    .map((f) => ({ f, price: priceOf({ id: f.id, price: f.price, grams: fidgetGrams(f), hours: parseHours(f.time) }) }))
    .filter((x) => x.price > 0)
    .sort((a, b) => (b.f.downloads ?? 0) - (a.f.downloads ?? 0));

/** What to pick the two paid fidgets from: the most liked, any price. */
export const bfPaidChoices = (priceOf: ReturnType<typeof useLivePricer>, n = 24): BfPick[] => priced(priceOf).slice(0, n);

/** Every fidget that can be the free one. */
export const bfFreeChoices = (priceOf: ReturnType<typeof useLivePricer>): BfPick[] =>
  priced(priceOf).filter((x) => x.price <= BF.freeMax);

export const isBfFree = (it: CartItem) => it.meta?.bfFree === true;
export const isBfPaid = (it: CartItem) => it.meta?.bfPaid === true;

/** The free fidget stays only while the two it was earned with are still in the cart. */
export const bfFreeEarned = (items: CartItem[]) =>
  items.filter((it) => it.source === "fidgets" && !isBfFree(it)).reduce((n, it) => n + it.qty, 0) >= BF.need;

/** The popup, opened from the bar, from a timer, or from anywhere else. */
export const useBfStore = create<{ open: boolean; seen: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  seen: false,
  show: () => set({ open: true, seen: true }),
  hide: () => set({ open: false }),
}));
