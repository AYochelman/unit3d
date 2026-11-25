"use client";
import { create } from "zustand";
import { FIDGETS } from "./data";
import { fidgetGrams } from "./products";
import { parseHours } from "./costing";
import type { useLivePricer } from "./live-price";
import type { CartItem } from "./order-store";
import type { Fidget } from "./types";

// The numbers live in lib/promos.ts (no "use client") so the help bot can quote them.
export { BF } from "./promos";
import { BF } from "./promos";

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
  items.filter((it) => it.source === "fidgets" && !isBfFree(it) && it.meta?.gift !== true).reduce((n, it) => n + it.qty, 0) >= BF.need;

/** The popup, opened from the bar, from a timer, or from anywhere else. */
export const useBfStore = create<{ open: boolean; seen: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  seen: false,
  show: () => set({ open: true, seen: true }),
  hide: () => set({ open: false }),
}));
