"use client";
import { useAdminStore, type ItemOverride, type PricingMode } from "./admin-store";
import { estimateCost, type CostSettings } from "./costing";
import { DEFAULT_MATERIAL } from "./inventory";
import type { MaterialId } from "./types";

// One place decides what price a customer sees, so the shelf, the product page,
// the catalogue and the cart can never disagree.
//
// Order of authority:
//   1. a price the owner typed by hand in /admin  (override)
//   2. cost + target margin, when automatic pricing is switched on
//   3. the catalogue price written in lib/products.ts
//
// Nothing here reads storage: the numbers come from the admin store, which is
// seeded at boot from public/admin-settings.json (see AdminSettingsBoot) so a
// saved price list applies to every visitor, not only to the owner's session.

export type Priceable = {
  id: string;
  /** Catalogue price — the fallback. */
  price: number;
  grams: number;
  hours: number;
  material?: MaterialId;
  colors?: number;
};

export function resolvePrice(
  item: Priceable,
  overrides: Record<string, ItemOverride>,
  settings: CostSettings,
  pricing: PricingMode,
): number {
  const o = overrides[item.id];
  if (o?.price != null) return o.price;
  if (!pricing.auto) return item.price;

  const { recommendedPrice } = estimateCost(
    {
      grams: o?.grams ?? item.grams,
      hours: o?.hours ?? item.hours,
      material: item.material ?? DEFAULT_MATERIAL,
      colors: item.colors ?? 1,
    },
    settings,
  );
  const step = Math.max(1, Math.round(pricing.round) || 1);
  return Math.ceil(recommendedPrice / step) * step;
}

/** Live price for one item. Re-renders when the owner changes a setting. */
export function useLivePrice(item: Priceable): number {
  const overrides = useAdminStore((s) => s.overrides);
  const settings = useAdminStore((s) => s.settings);
  const pricing = useAdminStore((s) => s.pricing);
  return resolvePrice(item, overrides, settings, pricing);
}

/** Same, for a list — one subscription instead of one per row. */
export function useLivePricer(): (item: Priceable) => number {
  const overrides = useAdminStore((s) => s.overrides);
  const settings = useAdminStore((s) => s.settings);
  const pricing = useAdminStore((s) => s.pricing);
  return (item) => resolvePrice(item, overrides, settings, pricing);
}
