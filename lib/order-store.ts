"use client";
import { create } from "zustand";
import type { OrderConfig } from "./types";

// ─── Cart item ────────────────────────────────────────────────────────────────
export type CartItem = OrderConfig & { id: string };

let _seq = 0;
const uid = () => `ci-${Date.now()}-${_seq++}`;

// ─── Store ────────────────────────────────────────────────────────────────────
type CartState = {
  /** All items currently in the cart. */
  items: CartItem[];

  /** Add a new item to the cart (does NOT navigate). */
  addItem(item: OrderConfig): void;

  /** Remove a single item by its id. */
  removeItem(id: string): void;

  /** Empty the cart. */
  clearCart(): void;

  // ── Legacy compatibility ───────────────────────────────────────────────
  /**
   * @deprecated  Prefer `addItem` for multi-item flows.
   * Calling `setOrder(item)` is equivalent to `addItem(item)`.
   * Calling `setOrder(null)` is equivalent to `clearCart()`.
   */
  order: CartItem | null;
  setOrder(o: OrderConfig | null): void;
  clearOrder(): void;
};

export const useOrderStore = create<CartState>((set) => ({
  items: [],
  order: null,

  addItem: (item) => {
    const newItem: CartItem = { ...item, id: uid() };
    set((s) => ({ items: [...s.items, newItem], order: newItem }));
  },

  removeItem: (id) =>
    set((s) => {
      const items = s.items.filter((x) => x.id !== id);
      return { items, order: items[items.length - 1] ?? null };
    }),

  clearCart: () => set({ items: [], order: null }),

  // Legacy helpers
  setOrder: (o) => {
    if (!o) {
      set({ items: [], order: null });
      return;
    }
    const newItem: CartItem = { ...o, id: uid() };
    set((s) => ({ items: [...s.items, newItem], order: newItem }));
  },
  clearOrder: () => set({ items: [], order: null }),
}));
