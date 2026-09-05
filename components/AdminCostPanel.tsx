"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { MATERIALS, MATERIAL_BY_ID } from "@/lib/materials";
import { estimateCost, fmtHours } from "@/lib/costing";
import { useAdminStore } from "@/lib/admin-store";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MaterialId } from "@/lib/types";

type Props = {
  /** Key used for the per-item overrides in the admin store. */
  itemId: string;
  grams: number;
  hours: number;
  material: MaterialId;
  /** Colours on the part (1 = single colour). Drives the AMS purge waste. */
  colors: number;
  qty: number;
  /** Customer-facing unit price, for margin and profit. */
  price: number;
};

/**
 * The manager's view inside a product page: what this item COSTS to make,
 * how long it occupies the printer, and what every other filament family
 * would do to that cost.
 *
 * It reads the same cost model as /admin, so a spool price edited there is
 * reflected here immediately. Overrides typed in the two inputs (weight and
 * print time) are stored per item and also feed /admin.
 *
 * Only rendered when the admin session is unlocked — customers never see it.
 */
export default function AdminCostPanel({ itemId, grams, hours, material, colors, qty, price }: Props) {
  const settings = useAdminStore((s) => s.settings);
  const setOverride = useAdminStore((s) => s.setOverride);
  const clearOverride = useAdminStore((s) => s.clearOverride);
  const override = useAdminStore((s) => s.overrides[itemId]);
  const [openMaterials, setOpenMaterials] = useState(false);

  const cost = estimateCost({ grams, hours, material, colors, qty, price }, settings);
  const mat = MATERIAL_BY_ID[material];
  const marginTone = (m: number) =>
    m >= 0.6 ? "text-emerald-400" : m >= 0.4 ? "text-amber-300" : "text-red-400";

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 font-mono text-xs">
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] tracking-wider">
            <Icon name="settings" size={11} />
            עלות ייצור (ליחידה)
          </div>
          {override && (
            <button
              type="button"
              onClick={() => clearOverride(itemId)}
              className="text-[10px] text-ink-500 hover:text-bad transition-colors"
            >
              אפס עריכה
            </button>
          )}
        </div>

        <Row label={`חומר ${mat.short} · ${cost.gramsUsed}g${colors > 1 ? ` (AMS ${colors}C)` : ""}`} value={fmtILS(r1(cost.materialCost))} />
        <Row label={`מכונה · ${fmtHours(hours)}`} value={fmtILS(r1(cost.machineCost))} muted />
        <Row label="חשמל" value={fmtILS(r2(cost.electricityCost))} muted />
        <Row label="עבודה" value={fmtILS(cost.laborCost)} muted />

        <div className="border-t border-amber-500/20 pt-1.5 flex justify-between font-bold">
          <span className="text-amber-400">עלות ליחידה</span>
          <span>{fmtILS(r1(cost.unitCost))}</span>
        </div>
        {qty > 1 && <Row label={`עלות ל-${qty} יחידות`} value={fmtILS(r1(cost.totalCost))} muted />}
        <div className="flex justify-between font-bold">
          <span className="text-amber-400">רווח גולמי</span>
          <span className={cn(marginTone(cost.margin ?? 0))}>
            {((cost.margin ?? 0) * 100).toFixed(0)}% · {fmtILS(Math.round(cost.profit ?? 0))}
          </span>
        </div>
        <Row label={`מחיר מומלץ (${Math.round(settings.targetMargin * 100)}% רווח)`} value={fmtILS(cost.recommendedPrice)} muted />
      </div>

      {/* ── Per-item overrides ───────────────────────────────────────────── */}
      <div className="px-3.5 pb-3 grid grid-cols-2 gap-2">
        <NumField
          label="משקל (גרם)"
          value={grams}
          onChange={(v) => setOverride(itemId, { grams: v })}
        />
        <NumField
          label="זמן הדפסה (שעות)"
          value={hours}
          step={0.1}
          onChange={(v) => setOverride(itemId, { hours: v })}
        />
      </div>

      {/* ── What every other filament would cost ─────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpenMaterials((o) => !o)}
        className="w-full px-3.5 py-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-amber-400 hover:bg-amber-500/5 transition-colors"
      >
        <span className="font-bold tracking-wider">השוואת חומרים</span>
        <Icon name="chevDown" size={12} className={cn("transition-transform", openMaterials && "rotate-180")} />
      </button>

      {openMaterials && (
        <div className="px-3.5 pb-3.5 overflow-x-auto">
          <table className="w-full text-[10.5px] border-collapse" dir="rtl">
            <thead>
              <tr className="text-ink-500">
                <th className="text-right font-normal py-1.5">חומר</th>
                <th className="text-left font-normal py-1.5">גליל/ק&quot;ג</th>
                <th className="text-left font-normal py-1.5">עלות</th>
                <th className="text-left font-normal py-1.5">מומלץ</th>
                <th className="text-left font-normal py-1.5">רווח</th>
              </tr>
            </thead>
            <tbody>
              {MATERIALS.map((m) => {
                const c = estimateCost({ grams, hours, material: m.id, colors, qty, price }, settings);
                const active = m.id === material;
                return (
                  <tr
                    key={m.id}
                    className={cn("border-t border-ink-800/70", active && "bg-amber-500/10")}
                  >
                    <td className="py-1.5 pl-2">
                      <span className={cn("font-bold", active ? "text-amber-300" : "text-ink-200")}>{m.short}</span>
                      {m.priceAdd > 0 && <span className="text-ink-600"> +{m.priceAdd}₪</span>}
                    </td>
                    <td className="py-1.5 text-left text-ink-400" dir="ltr">{fmtILS(settings.spoolPrices[m.id])}</td>
                    <td className="py-1.5 text-left text-ink-200" dir="ltr">{fmtILS(r1(c.unitCost))}</td>
                    <td className="py-1.5 text-left text-ink-400" dir="ltr">{fmtILS(c.recommendedPrice)}</td>
                    <td className={cn("py-1.5 text-left font-bold", marginTone(c.margin ?? 0))} dir="ltr">
                      {((c.margin ?? 0) * 100).toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-ink-500 leading-relaxed font-sans">
            העלות מחושבת לפי {grams} גרם ו-{fmtHours(hours)} על המדפסת, במחיר מכירה של {fmtILS(price)}.
            מחירי הגלילים נערכים בעמוד <span className="text-amber-400">ניהול</span>.
          </p>
        </div>
      )}
    </div>
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-ink-500" : "text-ink-400"}>{label}</span>
      <span className={muted ? "text-ink-300" : "text-ink-200"}>{value}</span>
    </div>
  );
}

function NumField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] text-ink-500 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v) && v >= 0) onChange(v);
        }}
        className="w-full h-8 px-2 rounded-lg bg-ink-950 border border-ink-700 text-ink-100 text-xs font-mono focus:border-amber-500/60 focus:outline-none"
        dir="ltr"
      />
    </label>
  );
}
