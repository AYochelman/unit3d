"use client";
import { create } from "zustand";
import type { OrderConfig } from "./types";

// ─── Cart item ────────────────────────────────────────────────────────────────
export type CartItem = OrderConfig & {
  id: string;
  /** Units of this line. */
  qty: number;
  /** Price per unit (null when the item has no price yet). */
  unitPrice: number | null;
  /** Title without the "× n" suffix. */
  baseTitle: string;
};

/** Build a cart line from an OrderConfig: derive qty/unit price and strip the "× n" title suffix. */
function toCartItem(item: OrderConfig): CartItem {
  const metaQty = typeof item.meta?.qty === "number" && item.meta.qty > 0 ? Math.round(item.meta.qty as number) : 1;
  const baseTitle = item.title.replace(/\s*×\s*\d+\s*$/, "");
  const unitPrice = item.price == null ? null : Math.round((item.price / metaQty) * 100) / 100;
  return { ...item, id: uid(), qty: metaQty, unitPrice, baseTitle, title: metaQty > 1 ? `${baseTitle} × ${metaQty}` : baseTitle };
}

function withQty(it: CartItem, qty: number): CartItem {
  const q = Math.max(1, Math.min(99, Math.round(qty)));
  const summary = it.summary.filter((l) => !/^כמות:/.test(l));
  if (q > 1) summary.push(`כמות: ${q}`);
  return {
    ...it,
    qty: q,
    summary,
    title: q > 1 ? `${it.baseTitle} × ${q}` : it.baseTitle,
    price: it.unitPrice == null ? it.price : Math.round(it.unitPrice * q),
    meta: { ...it.meta, qty: q },
  };
}

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

  /** Change the quantity of a line (1–99); price and summary follow. */
  setQty(id: string, qty: number): void;

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
    const newItem = toCartItem(item);
    set((s) => ({ items: [...s.items, newItem], order: newItem }));
  },

  setQty: (id, qty) =>
    set((s) => {
      const items = s.items.map((x) => (x.id === id ? withQty(x, qty) : x));
      return { items, order: items[items.length - 1] ?? null };
    }),

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
    const newItem = toCartItem(o);
    set((s) => ({ items: [...s.items, newItem], order: newItem }));
  },
  clearOrder: () => set({ items: [], order: null }),
}));
