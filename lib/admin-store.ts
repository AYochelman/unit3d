"use client";
import { create } from "zustand";
import type { MaterialId } from "./types";
import { DEFAULT_COST_SETTINGS, type CostSettings } from "./costing";
import { stockKey, type Interest, type StockMap } from "./inventory";

// The admin area is a client-side tool. Per the project rules there is no
// localStorage, so settings live for the session and can be exported /
// imported as JSON (see /admin → "ייצוא / ייבוא"). Persisting them for real
// needs a backend — see HANDOFF.md.

/** Change this to your own PIN. It only gates the UI (no server). */
export const ADMIN_PIN = "1234";

export type ItemOverride = {
  grams?: number;
  hours?: number;
  price?: number;
};

/** How the shop prices things when there is no hand-set price. */
export type PricingMode = {
  /** true = every price on the site is recomputed from cost + target margin. */
  auto: boolean;
  /** Round the computed price up to a multiple of this (₪). */
  round: number;
};

export const DEFAULT_PRICING: PricingMode = { auto: false, round: 5 };

export type AdminExport = {
  version: 1;
  settings: CostSettings;
  overrides: Record<string, ItemOverride>;
  /** Automatic pricing switch. */
  pricing?: PricingMode;
  /** Filament that is OUT of stock, plus who asked to be told when it returns. */
  stock?: StockMap;
  interest?: Interest[];
};

type AdminState = {
  unlocked: boolean;
  settings: CostSettings;
  overrides: Record<string, ItemOverride>;
  /** Only records what is OUT — a missing key means the filament is on the shelf. */
  stock: StockMap;
  interest: Interest[];
  pricing: PricingMode;

  unlock(pin: string): boolean;
  lock(): void;
  setSpoolPrice(id: MaterialId, ils: number): void;
  setSetting<K extends Exclude<keyof CostSettings, "spoolPrices">>(k: K, v: CostSettings[K]): void;
  setPricing(patch: Partial<PricingMode>): void;
  setStock(material: MaterialId, color: string, available: boolean): void;
  setMaterialStock(material: MaterialId, colors: string[], available: boolean): void;
  addInterest(i: Omit<Interest, "id" | "at">): void;
  clearInterest(): void;
  setOverride(itemId: string, patch: ItemOverride): void;
  clearOverride(itemId: string): void;
  resetAll(): void;
  exportJson(): string;
  importJson(json: string): boolean;
};

export const useAdminStore = create<AdminState>((set, get) => ({
  unlocked: false,
  settings: DEFAULT_COST_SETTINGS,
  overrides: {},
  stock: {},
  interest: [],
  pricing: DEFAULT_PRICING,

  unlock: (pin) => {
    const ok = pin.trim() === ADMIN_PIN;
    if (ok) set({ unlocked: true });
    return ok;
  },
  lock: () => set({ unlocked: false }),

  setSpoolPrice: (id, ils) =>
    set((s) => ({
      settings: { ...s.settings, spoolPrices: { ...s.settings.spoolPrices, [id]: Math.max(0, ils) } },
    })),

  setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),

  setPricing: (patch) => set((s) => ({ pricing: { ...s.pricing, ...patch } })),

  setStock: (material, color, available) =>
    set((s) => {
      const next = { ...s.stock };
      // Only out-of-stock is recorded, so putting something back removes the key.
      if (available) delete next[stockKey(material, color)];
      else next[stockKey(material, color)] = false;
      return { stock: next };
    }),

  setMaterialStock: (material, colors, available) =>
    set((s) => {
      const next = { ...s.stock };
      for (const c of colors) {
        if (available) delete next[stockKey(material, c)];
        else next[stockKey(material, c)] = false;
      }
      return { stock: next };
    }),

  addInterest: (i) =>
    set((s) => ({
      interest: [
        ...s.interest,
        { ...i, id: `${Date.now()}-${s.interest.length}`, at: new Date().toISOString() },
      ],
    })),

  clearInterest: () => set({ interest: [] }),

  setOverride: (itemId, patch) =>
    set((s) => ({ overrides: { ...s.overrides, [itemId]: { ...s.overrides[itemId], ...patch } } })),

  clearOverride: (itemId) =>
    set((s) => {
      const next = { ...s.overrides };
      delete next[itemId];
      return { overrides: next };
    }),

  resetAll: () =>
    set({ settings: DEFAULT_COST_SETTINGS, overrides: {}, stock: {}, interest: [], pricing: DEFAULT_PRICING }),

  exportJson: () => {
    const { settings, overrides, stock, interest, pricing } = get();
    const payload: AdminExport = { version: 1, settings, overrides, pricing, stock, interest };
    return JSON.stringify(payload, null, 2);
  },

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json) as Partial<AdminExport>;
      if (!parsed || parsed.version !== 1 || !parsed.settings) return false;
      set({
        settings: { ...DEFAULT_COST_SETTINGS, ...parsed.settings, spoolPrices: { ...DEFAULT_COST_SETTINGS.spoolPrices, ...parsed.settings.spoolPrices } },
        overrides: parsed.overrides ?? {},
        pricing: { ...DEFAULT_PRICING, ...parsed.pricing },
        stock: parsed.stock ?? {},
        interest: parsed.interest ?? [],
      });
      return true;
    } catch {
      return false;
    }
  },
}));
