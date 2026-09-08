"use client";
import { useMemo } from "react";
import { MATERIALS } from "./materials";
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

export function useMaterials(): Material[] {
  const custom = useAdminStore((s) => s.materials);
  return useMemo(() => merge(MATERIALS, custom), [custom]);
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
