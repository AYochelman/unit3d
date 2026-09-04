import type { MaterialId } from "./types";
import { MATERIALS } from "./materials";

// ─── Admin-tunable cost model ─────────────────────────────────────────────────
export type CostSettings = {
  /** ILS per 1kg spool, per material family. */
  spoolPrices: Record<MaterialId, number>;
  /** Printer depreciation + maintenance + nozzles, ILS per print hour. */
  machineRatePerHour: number;
  /** Average printer draw while printing, watts. */
  printerWatts: number;
  /** Electricity tariff, ILS per kWh. */
  kwhPriceILS: number;
  /** Hands-on time per item (removal, cleanup, packing), ILS. */
  laborPerItem: number;
  /** Extra filament wasted per additional AMS colour (purge/prime tower), as a fraction of the part weight. */
  amsWastePerColor: number;
  /** Target gross margin used for the "recommended price" column. */
  targetMargin: number;
};

export const DEFAULT_COST_SETTINGS: CostSettings = {
  spoolPrices: Object.fromEntries(MATERIALS.map((m) => [m.id, m.spoolPriceILS])) as Record<MaterialId, number>,
  machineRatePerHour: 6,
  printerWatts: 120,
  kwhPriceILS: 0.64,
  laborPerItem: 8,
  amsWastePerColor: 0.12,
  targetMargin: 0.6,
};

export type CostInput = {
  grams: number;
  hours: number;
  material: MaterialId;
  /** Number of colours on the part (1 = single colour). */
  colors?: number;
  qty?: number;
  /** Customer price per unit, to compute margin. */
  price?: number;
};

export type CostBreakdown = {
  gramsUsed: number;
  materialCost: number;
  machineCost: number;
  electricityCost: number;
  laborCost: number;
  unitCost: number;
  totalCost: number;
  /** Per-unit profit and margin (only when `price` given). */
  profit: number | null;
  margin: number | null;
  /** Price that hits `targetMargin`. */
  recommendedPrice: number;
};

export function estimateCost(input: CostInput, s: CostSettings): CostBreakdown {
  const qty = Math.max(1, input.qty ?? 1);
  const colors = Math.max(1, input.colors ?? 1);
  const waste = 1 + s.amsWastePerColor * (colors - 1);
  const gramsUsed = input.grams * waste;
  const spool = s.spoolPrices[input.material] ?? 100;

  const materialCost = (gramsUsed / 1000) * spool;
  const machineCost = input.hours * s.machineRatePerHour;
  const electricityCost = input.hours * (s.printerWatts / 1000) * s.kwhPriceILS;
  const laborCost = s.laborPerItem;
  const unitCost = materialCost + machineCost + electricityCost + laborCost;

  const profit = input.price != null ? input.price - unitCost : null;
  const margin = input.price != null && input.price > 0 ? (input.price - unitCost) / input.price : null;
  // Clamp: a 100% target would divide by zero and yield Infinity.
  const recommendedPrice = Math.ceil(unitCost / (1 - Math.min(0.95, Math.max(0, s.targetMargin))));

  return {
    gramsUsed: Math.round(gramsUsed * 10) / 10,
    materialCost,
    machineCost,
    electricityCost,
    laborCost,
    unitCost,
    totalCost: unitCost * qty,
    profit,
    margin,
    recommendedPrice,
  };
}

/** "2.5h" / "45min" / "1h 20min" → hours. */
export function parseHours(t: string): number {
  let h = 0;
  const hm = t.match(/([\d.]+)\s*h/);
  const mm = t.match(/([\d.]+)\s*min/);
  if (hm) h += parseFloat(hm[1]);
  if (mm) h += parseFloat(mm[1]) / 60;
  if (!hm && !mm) {
    const n = t.match(/([\d.]+)/);
    if (n) h = parseFloat(n[1]);
  }
  return h || 1;
}

export const fmtHours = (h: number): string => {
  if (h < 1) return `${Math.round(h * 60)}min`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins ? `${whole}h ${mins}min` : `${whole}h`;
};
