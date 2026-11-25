import type { ItemOverride, PricingMode } from "./admin-store";
import { estimateCost, type CostSettings } from "./costing";
import { DEFAULT_MATERIAL } from "./inventory";
import type { MaterialId } from "./types";

/**
 * What price a customer sees, as a pure function: a hand-set price from
 * /admin, else cost + target margin when automatic pricing is on, else the
 * catalogue price. lib/live-price.ts feeds it from the admin store in the
 * browser; lib/site-price.ts feeds it from admin-settings.json at build time.
 */
export type Priceable = {
  id: string;
  /** Catalogue price — the fallback. */
  price: number;
  grams: number;
  hours: number;
  material?: MaterialId;
  colors?: number;
  /** Separate printed pieces in one product — see CostInput.pieces. */
  pieces?: number;
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
      pieces: item.pieces ?? 1,
    },
    settings,
  );
  const step = Math.max(1, Math.round(pricing.round) || 1);
  return Math.ceil(recommendedPrice / step) * step;
}
