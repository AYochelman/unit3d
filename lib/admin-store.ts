"use client";
import { create } from "zustand";
import type { MaterialId } from "./types";
import { DEFAULT_COST_SETTINGS, type CostSettings } from "./costing";

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

export type AdminExport = {
  version: 1;
  settings: CostSettings;
  overrides: Record<string, ItemOverride>;
};

type AdminState = {
  unlocked: boolean;
  settings: CostSettings;
  overrides: Record<string, ItemOverride>;

  unlock(pin: string): boolean;
  lock(): void;
  setSpoolPrice(id: MaterialId, ils: number): void;
  setSetting<K extends Exclude<keyof CostSettings, "spoolPrices">>(k: K, v: CostSettings[K]): void;
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

  setOverride: (itemId, patch) =>
    set((s) => ({ overrides: { ...s.overrides, [itemId]: { ...s.overrides[itemId], ...patch } } })),

  clearOverride: (itemId) =>
    set((s) => {
      const next = { ...s.overrides };
      delete next[itemId];
      return { overrides: next };
    }),

  resetAll: () => set({ settings: DEFAULT_COST_SETTINGS, overrides: {} }),

  exportJson: () => {
    const { settings, overrides } = get();
    const payload: AdminExport = { version: 1, settings, overrides };
    return JSON.stringify(payload, null, 2);
  },

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json) as Partial<AdminExport>;
      if (!parsed || parsed.version !== 1 || !parsed.settings) return false;
      set({
        settings: { ...DEFAULT_COST_SETTINGS, ...parsed.settings, spoolPrices: { ...DEFAULT_COST_SETTINGS.spoolPrices, ...parsed.settings.spoolPrices } },
        overrides: parsed.overrides ?? {},
      });
      return true;
    } catch {
      return false;
    }
  },
}));
