"use client";
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAdminStore } from "@/lib/admin-store";
import { estimateCost } from "@/lib/costing";
import { MATERIALS } from "@/lib/materials";
import type { MaterialId } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * A quick quote for a print that is not in the shop yet.
 *
 * Grams, material, time and colours in; cost and a price out. It runs the
 * same estimateCost as every shelf, with the spool prices and parameters set in
 * the other tabs, so a number here is the number the shop would charge.
 */
/** Agorot matter on a cost line: ₪4.75, not ₪4.751234. */
const fmtILS = (n: number): string =>
  "₪" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function CalculatorTab() {
  const settings = useAdminStore((s) => s.settings);
  const pricing = useAdminStore((s) => s.pricing);

  const [grams, setGrams] = useState("50");
  const [material, setMaterial] = useState<MaterialId>("pla");
  const [hrs, setHrs] = useState("2");
  const [mins, setMins] = useState("0");
  const [colors, setColors] = useState("1");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  const num = (v: string) => Math.max(0, parseFloat(v) || 0);
  const hours = num(hrs) + num(mins) / 60;
  const q = Math.max(1, Math.round(num(qty)) || 1);
  const sale = price.trim() ? num(price) : undefined;

  const r = estimateCost(
    { grams: num(grams), hours, material, colors: Math.max(1, Math.round(num(colors)) || 1), qty: q, price: sale },
    settings,
  );
  const step = Math.max(1, Math.round(pricing.round) || 1);
  const suggested = Math.ceil(r.recommendedPrice / step) * step;

  const rows: [string, number][] = [
    [`חומר · ${r.gramsUsed} גרם${r.gramsUsed !== num(grams) ? " כולל פחת החלפת צבעים" : ""}`, r.materialCost],
    ["זמן מכונה", r.machineCost],
    ["חשמל", r.electricityCost],
    ["עבודה", r.laborCost],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2 max-w-5xl">
      <div className="p-5 rounded-2xl border border-ink-800 bg-ink-900 grid gap-4">
        <div>
          <h2 className="font-black text-lg">מחשבון עלות</h2>
          <p className="text-sm text-ink-400">ממלאים את הנתונים מהסלייסר ומקבלים עלות ומחיר מומלץ.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="משקל (גרם)">
            <Input type="number" inputMode="decimal" min={0} value={grams} onChange={(e) => setGrams(e.target.value)} dir="ltr" />
          </Field>
          <Field label="סוג חומר">
            <Select value={material} onChange={(e) => setMaterial(e.target.value as MaterialId)}>
              {MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="שעות">
            <Input type="number" inputMode="numeric" min={0} value={hrs} onChange={(e) => setHrs(e.target.value)} dir="ltr" />
          </Field>
          <Field label="דקות">
            <Input type="number" inputMode="numeric" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} dir="ltr" />
          </Field>
          <Field label="כמות צבעים">
            <Input type="number" inputMode="numeric" min={1} max={16} value={colors} onChange={(e) => setColors(e.target.value)} dir="ltr" />
          </Field>
          <Field label="כמות יחידות">
            <Input type="number" inputMode="numeric" min={1} value={qty} onChange={(e) => setQty(e.target.value)} dir="ltr" />
          </Field>
        </div>
        <Field label="מחיר מכירה (לא חובה)" hint="כדי לראות כמה נשאר לך">
          <Input type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₪" dir="ltr" />
        </Field>
        <p className="text-[11px] text-ink-500">
          מחיר הגליל, תעריף המכונה, החשמל והעבודה נלקחים מהלשוניות &quot;גלילים&quot; ו&quot;פרמטרים&quot;.
        </p>
      </div>

      <div className="p-5 rounded-2xl border border-flame/40 bg-flame/5 grid gap-3 content-start">
        <div className="grid gap-1.5 text-sm">
          {rows.map(([label, v]) => (
            <div key={label} className="flex justify-between gap-3">
              <span className="text-ink-300">{label}</span>
              <bdi className="font-mono">{fmtILS(v)}</bdi>
            </div>
          ))}
        </div>
        <div className="border-t border-ink-800 pt-3 flex justify-between items-baseline">
          <span className="font-bold">עלות ליחידה</span>
          <bdi className="font-mono text-xl font-black">{fmtILS(r.unitCost)}</bdi>
        </div>
        {q > 1 && (
          <div className="flex justify-between text-sm">
            <span className="text-ink-300">עלות ל-<bdi>{q}</bdi> יחידות</span>
            <bdi className="font-mono">{fmtILS(r.totalCost)}</bdi>
          </div>
        )}
        <div className="rounded-xl bg-ink-900 border border-ink-800 p-3 flex justify-between items-baseline">
          <span>
            מחיר מומלץ
            <span className="block text-[11px] text-ink-500">
              מרווח יעד <bdi>{Math.round(settings.targetMargin * 100)}%</bdi>, מעוגל ל-<bdi>{step}</bdi>
            </span>
          </span>
          <bdi className="font-mono text-2xl font-black text-flame">{fmtILS(suggested)}</bdi>
        </div>
        {r.profit != null && (
          <div className={cn("rounded-xl p-3 flex justify-between items-baseline border", r.profit >= 0 ? "border-good/40 bg-good/10 text-good" : "border-bad/40 bg-bad/10 text-bad")}>
            <span>{r.profit >= 0 ? "רווח ליחידה" : "הפסד ליחידה"}</span>
            <span className="font-mono font-bold">
              <bdi>{fmtILS(Math.abs(r.profit))}</bdi>
              {r.margin != null && <> · <bdi>{Math.round(r.margin * 100)}%</bdi></>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
