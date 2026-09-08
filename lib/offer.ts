"use client";
import { familyOf } from "./materials";
import { isColorInStock, isMaterialInStock } from "./inventory";
import { filamentsFor } from "./palette";
import type { Filament, Material, MaterialId } from "./types";
import type { StockMap } from "./inventory";

/**
 * What to actually offer a customer, given what is on the shelf.
 *
 * Two different rules, because two different mistakes:
 *
 * Showing an empty spool as a choice wastes the customer's decision and ends
 * in an apology. So a colour or a finish that ran out comes off the list.
 *
 * But substituting ACROSS materials would be worse than the empty shelf.
 * PLA, PLA+, matte and silk are the same plastic with a different finish — a
 * model that asks for silk prints fine in plain PLA. PETG, TPU and ABS are
 * chosen for heat, flex or strength; offering PLA "instead" of ABS sells
 * something that fails at the job it was bought for. So substitution stays
 * inside a family, and other families are left exactly as they are.
 *
 * The model's own default survives either way, marked as the recommendation.
 * It is what the designer intended and what the photograph shows, and a
 * customer who wants exactly that should be able to ask for it and be told
 * "that one is a few days out" rather than never see it.
 */

/** Materials worth showing for a model that was designed in `want`. */
export function offeredMaterials(
  all: Material[],
  stock: StockMap,
  palette: Filament[],
  want: MaterialId,
): Material[] {
  // Only what is on the shelf. An empty spool is not a choice — offering it
  // asks the customer to pick something and then apologises for it.
  const live = all.filter((m) => isMaterialInStock(stock, m.id, filamentsFor(palette, m.id)));
  // Nothing at all: keep the model's own material on screen so the page can
  // say what is missing rather than showing an empty row.
  if (!live.length) {
    const own = all.find((m) => m.id === want);
    return own ? [own] : [];
  }
  return live;
}

/** The material to land on: the one the model asks for, or a sibling we have. */
export function startingMaterial(
  all: Material[],
  stock: StockMap,
  palette: Filament[],
  want: MaterialId,
): MaterialId {
  const have = (id: MaterialId) => isMaterialInStock(stock, id, filamentsFor(palette, id));
  if (have(want)) return want;
  const wantFamily = familyOf({ id: want, family: all.find((m) => m.id === want)?.family });
  return all.find((m) => familyOf(m) === wantFamily && have(m.id))?.id ?? want;
}

/**
 * Can we print this model at all today?
 *
 * Not "is its own spool loaded" — a model designed in silk is printable while
 * any PLA is on the shelf. Outside a family the answer is still the strict
 * one: no ABS means no ABS.
 */
export function canPrint(
  all: Material[],
  stock: StockMap,
  palette: Filament[],
  want: MaterialId,
): boolean {
  const use = startingMaterial(all, stock, palette, want);
  return isMaterialInStock(stock, use, filamentsFor(palette, use));
}

/** Colours worth showing for this material, recommendation first. */
export function offeredColors(
  palette: Filament[],
  stock: StockMap,
  material: MaterialId,
  recommendedId?: string,
): Filament[] {
  const mine = filamentsFor(palette, material);
  const live = mine.filter((c) => isColorInStock(stock, material, c.id));
  const rec = mine.find((c) => c.id === recommendedId) ?? mine[0];
  // Everything we have, and exactly ONE thing we do not: the colour the model
  // is shown in. A row of struck-through circles is a list of apologies; one
  // is a note that the model's own colour is on its way back.
  if (!rec || live.some((c) => c.id === rec.id)) return live.length ? live : rec ? [rec] : [];
  return [rec, ...live];
}

/** The colour to land on: the recommendation when we have it, else what we do have. */
export function startingColor(
  palette: Filament[],
  stock: StockMap,
  material: MaterialId,
  recommendedId: string,
): string {
  const offered = offeredColors(palette, stock, material, recommendedId);
  if (isColorInStock(stock, material, recommendedId)) return recommendedId;
  return offered.find((c) => isColorInStock(stock, material, c.id))?.id ?? recommendedId;
}
