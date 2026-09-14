"use client";
import { useMemo } from "react";
import { OFFERED_MATERIALS } from "./materials";
import { FILAMENTS } from "./data";
import { useAdminStore } from "./admin-store";
import type { Filament, Material, MaterialId } from "./types";

/**
 * What the shop can print with, right now.
 *
 * The built-in lists are the starting point, not the limit: the owner adds
 * spools from /admin and they appear everywhere a colour or a material is
 * offered, without a deploy. Built-ins come first so the familiar order does
 * not shuffle every time something is added, and an added id that matches a
 * built-in replaces it — that is how you correct a spool price or rename a
 * family you actually buy differently.
 */
function merge<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const added = new Set(extra.map((x) => x.id));
  return [...base.filter((x) => !added.has(x.id)), ...extra];
}

/**
 * The materials a customer can pick, and the admin can price.
 *
 * Reads OFFERED_MATERIALS rather than MATERIALS so a retired filament stops
 * being offered everywhere at once — the product page, the fidget page, the
 * designer and the admin's own colour grid all come through here. Anything
 * that merely looks a material up by id still sees the full list, so old
 * orders and saved settings never resolve to nothing.
 */
export function useMaterials(): Material[] {
  const custom = useAdminStore((s) => s.materials);
  return useMemo(() => merge(OFFERED_MATERIALS, custom), [custom]);
}

export function useFilaments(): Filament[] {
  const custom = useAdminStore((s) => s.colors);
  return useMemo(() => merge(FILAMENTS, custom), [custom]);
}

/**
 * The spools that exist in this family.
 *
 * A colour with no family list belongs to all of them; one with a list is
 * offered only there, so a glow PLA never appears under TPU.
 */
export function filamentsFor(all: Filament[], material?: MaterialId): Filament[] {
  if (!material) return all;
  return all.filter((f) => !f.materials?.length || f.materials.includes(material));
}

export function useMaterialById(): Record<string, Material> {
  const all = useMaterials();
  return useMemo(() => Object.fromEntries(all.map((m) => [m.id, m])), [all]);
}
