"use client";
import { create } from "zustand";
import type { Filament, Material, MaterialId } from "./types";
import { DEFAULT_COST_SETTINGS, type CostSettings } from "./costing";
import { stockKey, type Interest, type StockMap } from "./inventory";
import type { ImportedShelf } from "./imported";
import { readToken, writeToken } from "./admin-token";

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
  /**
   * Shelves the owner moved a product to, from the shop itself.
   *
   * `["statues", "screen"]` means the first is its home and it is listed on
   * both. Present only for products he actually moved; everything else keeps
   * the shelf it was imported onto.
   */
  shelves?: Record<string, ImportedShelf[]>;
  /** Filament families the owner added himself, beyond the seven built in. */
  materials?: Material[];
  /** Colours he added — including glow, colour-changing and dual-colour spools. */
  colors?: Filament[];
};

type AdminState = {
  unlocked: boolean;
  settings: CostSettings;
  overrides: Record<string, ItemOverride>;
  /** Only records what is OUT — a missing key means the filament is on the shelf. */
  stock: StockMap;
  interest: Interest[];
  pricing: PricingMode;
  /** Live shelf moves, applied to every listing the moment they are made. */
  shelves: Record<string, ImportedShelf[]>;
  /**
   * Spools the shop bought that the built-in lists never heard of.
   *
   * A filament shop is not a fixed menu — a glow-in-the-dark, a thermochromic
   * that turns red in the hand, a dual-colour silk. These live beside the seven
   * built-in families and the twelve built-in colours rather than replacing
   * them, so an update to the code never wipes what the owner added.
   */
  materials: Material[];
  colors: Filament[];
  /**
   * The GitHub token that lets the admin publish.
   *
   * Held here for the session and remembered on the device (see
   * lib/admin-token.ts), so saving is one click rather than a paste. It never
   * goes into the export file or a log.
   */
  ghToken: string;

  unlock(pin: string): boolean;
  lock(): void;
  setSpoolPrice(id: MaterialId, ils: number): void;
  setSetting<K extends Exclude<keyof CostSettings, "spoolPrices">>(k: K, v: CostSettings[K]): void;
  setPricing(patch: Partial<PricingMode>): void;
  setGhToken(t: string): void;
  setShelves(productId: string, shelves: ImportedShelf[]): void;
  clearShelves(productId: string): void;
  addMaterial(m: Material): void;
  removeMaterial(id: MaterialId): void;
  addColor(c: Filament): void;
  removeColor(id: string): void;
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
  shelves: {},
  materials: [],
  colors: [],
  ghToken: "",   // hydrated from the device on first render, see AdminUnlock

  unlock: (pin) => {
    const ok = pin.trim() === ADMIN_PIN;
    // Reading the device only on unlock keeps it out of the server render and
    // out of every page that is not the admin.
    if (ok) set({ unlocked: true, ghToken: get().ghToken || readToken() });
    return ok;
  },
  // Locking hides the admin but keeps the remembered token: the whole point is
  // that he does not paste it again. "שכח את הטוקן" is what erases it.
  lock: () => set({ unlocked: false }),
  setGhToken: (t) => {
    set({ ghToken: t });
    writeToken(t);
  },

  // A move with nothing left in it would hide the product everywhere, so an
  // empty list means "put it back where it was".
  setShelves: (productId, shelves) =>
    set((st) => {
      const next = { ...st.shelves };
      if (shelves.length) next[productId] = shelves;
      else delete next[productId];
      return { shelves: next };
    }),
  clearShelves: (productId) =>
    set((st) => {
      const next = { ...st.shelves };
      delete next[productId];
      return { shelves: next };
    }),

  setSpoolPrice: (id, ils) =>
    set((s) => ({
      settings: { ...s.settings, spoolPrices: { ...s.settings.spoolPrices, [id]: Math.max(0, ils) } },
    })),

  setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),

  setPricing: (patch) => set((s) => ({ pricing: { ...s.pricing, ...patch } })),

  addMaterial: (m) =>
    set((s) => ({
      // Re-adding an id replaces it rather than duplicating the row.
      materials: [...s.materials.filter((x) => x.id !== m.id), m],
      settings: { ...s.settings, spoolPrices: { ...s.settings.spoolPrices, [m.id]: m.spoolPriceILS } },
    })),
  removeMaterial: (id) => set((s) => ({ materials: s.materials.filter((x) => x.id !== id) })),
  addColor: (c) => set((s) => ({ colors: [...s.colors.filter((x) => x.id !== c.id), c] })),
  removeColor: (id) => set((s) => ({ colors: s.colors.filter((x) => x.id !== id) })),

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
    set({ settings: DEFAULT_COST_SETTINGS, overrides: {}, stock: {}, interest: [], pricing: DEFAULT_PRICING, materials: [], colors: [] }),

  exportJson: () => {
    const { settings, overrides, stock, interest, pricing, shelves, materials, colors } = get();
    const payload: AdminExport = { version: 1, settings, overrides, pricing, stock, interest, shelves, materials, colors };
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
        shelves: parsed.shelves ?? {},
        materials: parsed.materials ?? [],
        colors: parsed.colors ?? [],
      });
      return true;
    } catch {
      return false;
    }
  },
}));
