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

/**
 * Materials worth showing for a model that was designed in `want`.
 *
 * Only its own family. A TPU model is TPU — the flex is the product, and a
 * rigid copy of it is a different object that happens to share a shape. Inside
 * a family the finish is interchangeable (PLA, PLA+, matte, silk are one
 * plastic), so those stand in for each other and nothing else does.
 */
export function offeredMaterials(
  all: Material[],
  stock: StockMap,
  palette: Filament[],
  want: MaterialId,
): Material[] {
  const wantFamily = familyOf({ id: want, family: all.find((m) => m.id === want)?.family });
  const family = all.filter((m) => familyOf(m) === wantFamily);
  // An empty spool is not a choice: offering it asks the customer to pick
  // something and then apologises for it.
  const live = family.filter((m) => isMaterialInStock(stock, m.id, filamentsFor(palette, m.id)));
  if (live.length) return live;
  // Nothing in the family: keep the model's own on screen so the page can say
  // what is missing rather than showing an empty row.
  const own = family.find((m) => m.id === want) ?? all.find((m) => m.id === want);
  return own ? [own] : [];
}

/**
 * The palette colour closest to the one the model was printed in.
 *
 * The shop used to open every model on the same orange, which was index 2 of a
 * list and meant nothing. MakerWorld gives the hex of the plate the photograph
 * was printed from; the nearest spool we sell is the honest answer to "the
 * colour in the picture". No source colour means no recommendation at all —
 * better silence than an invention.
 */
export function nearestColor(palette: Filament[], hex?: string): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  let best: { id: string; d: number } | null = null;
  for (const f of palette) {
    if (!/^#[0-9a-f]{6}$/i.test(f.hex)) continue;
    const [fr, fg, fb] = rgb(f.hex);
    // Weighted so the match follows what the eye calls "the same colour".
    const d = 2 * (r - fr) ** 2 + 4 * (g - fg) ** 2 + 3 * (b - fb) ** 2;
    if (!best || d < best.d) best = { id: f.id, d };
  }
  return best?.id;
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
  // No source colour means no recommendation: the row is simply what we have.
  const rec = recommendedId ? mine.find((c) => c.id === recommendedId) : undefined;
  // Everything we have, and exactly ONE thing we do not: the colour the model
  // is shown in. A row of struck-through circles is a list of apologies; one
  // is a note that the model's own colour is on its way back.
  if (!rec || live.some((c) => c.id === rec.id)) return live.length ? live : mine.slice(0, 1);
  return [rec, ...live];
}

/** The colour to land on: the recommendation when we have it, else what we do have. */
export function startingColor(
  palette: Filament[],
  stock: StockMap,
  material: MaterialId,
  recommendedId?: string,
): string {
  const offered = offeredColors(palette, stock, material, recommendedId);
  if (recommendedId && isColorInStock(stock, material, recommendedId)) return recommendedId;
  return offered.find((c) => isColorInStock(stock, material, c.id))?.id ?? offered[0]?.id ?? palette[0]?.id ?? "";
}
