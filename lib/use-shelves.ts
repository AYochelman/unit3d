"use client";
import { useAdminStore } from "./admin-store";
import { PRODUCTS } from "./products";
import { SHELF_TO_CATEGORY, type ImportedShelf } from "./imported";
import type { Product, ProductCategory } from "./types";

/**
 * Every listing, with the owner's live moves applied.
 *
 * Moving a product between columns should be visible the moment it is done,
 * from the shop itself — not after an export, a commit and a rebuild. The moves
 * live in the admin store, so a listing that reads them here re-renders as soon
 * as one is made, for the owner, on the page he is standing on. Saving them to
 * the site is a separate, deliberate step; until then nobody else sees a thing.
 */
export function shelvesOf(p: Product, moves: Record<string, ImportedShelf[]>): ProductCategory[] {
  const moved = moves[p.id];
  if (moved?.length) return moved.map((sh) => SHELF_TO_CATEGORY[sh as keyof typeof SHELF_TO_CATEGORY]).filter(Boolean);
  return p.categories ?? [p.category];
}

/**
 * Products on these shelves, honouring anything the owner has just moved.
 * A plain filter over a few hundred rows — cheap enough that memoising it
 * would cost more (a fresh `cats` array every render) than it saves.
 */
export function useProductsByCategory(...cats: ProductCategory[]): Product[] {
  const moves = useAdminStore((s) => s.shelves);
  return PRODUCTS.filter((p) => !!p.image && shelvesOf(p, moves).some((c) => cats.includes(c)));
}

/** Where a single product currently sits — its home first. */
export function useShelvesOf(productId: string, fallback: ImportedShelf[]): ImportedShelf[] {
  const moves = useAdminStore((s) => s.shelves);
  return moves[productId] ?? fallback;
}
