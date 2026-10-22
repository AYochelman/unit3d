"use client";
import { useState } from "react";
import Pill from "@/components/ui/Pill";
import { useAdminStore } from "@/lib/admin-store";
import { PARTS, canMake, usersOf, PART_NEEDS } from "@/lib/parts";
import { PRODUCT_BY_ID, CONFIG_PRODUCT_BY_ID } from "@/lib/products";
import { FIDGETS } from "@/lib/data";
import { UNIT_FORM_BY_ID, type UnitFormId } from "@/lib/unitForms";
import { heName } from "@/lib/he-names";
import { IMPORTED } from "@/lib/imported";
import { cn } from "@/lib/cn";

/** A product id from any shelf, by the name the shop shows. */
function nameOf(id: string): string {
  if (id.startsWith("cfg:")) return `${CONFIG_PRODUCT_BY_ID[id.slice(4) as keyof typeof CONFIG_PRODUCT_BY_ID]?.label ?? id} (מעצב)`;
  if (id.startsWith("unit:")) return `${UNIT_FORM_BY_ID[id.slice(5) as UnitFormId]?.label ?? id} (לחיילים)`;
  return PRODUCT_BY_ID[id]?.name ?? FIDGETS.find((f) => f.id === id)?.name
    ?? (IMPORTED.find((m) => m.id === id) ? heName(id, IMPORTED.find((m) => m.id === id)!.name) : id);
}

/**
 * Parts on hand — rings, chains, magnets, keycaps — next to the filament.
 *
 * A count per part, the products that use it, and how many of each the shelf
 * allows. Saved with the rest of the stock by "סיים ועדכן".
 */
export default function PartsStock() {
  const parts = useAdminStore((s) => s.parts);
  const setPartCount = useAdminStore((s) => s.setPartCount);
  const [open, setOpen] = useState<string | null>(null);

  const low = PARTS.filter((p) => parts[p.id] != null && parts[p.id] <= p.low);
  const shortProducts = Object.keys(PART_NEEDS).filter((id) => canMake(id, parts) === 0);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-black text-base">חלקים ואביזרים</h3>
        <p className="text-xs text-ink-500">
          כל מה שנכנס לקופסה מלבד הפילמנט. רושמים כמה יש, ורואים אילו מוצרים צריכים מה וכמה עוד אפשר לייצר.
          שדה ריק = לא נספר.
        </p>
        {(low.length > 0 || shortProducts.length > 0) && (
          <p className="text-xs text-amber-300 mt-1">
            {low.length > 0 && `נמוך: ${low.map((p) => p.name).join(", ")}. `}
            {shortProducts.length > 0 && `${shortProducts.length} מוצרים אי אפשר לייצר כרגע בגלל חלק חסר.`}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-ink-800 divide-y divide-ink-800">
        {PARTS.map((p) => {
          const n = parts[p.id];
          const users = usersOf(p.id);
          const isLow = n != null && n <= p.low;
          return (
            <div key={p.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{p.name}</span>
                {p.note && <span className="text-[11px] text-ink-500">{p.note}</span>}
                {n === 0 ? <Pill tone="flame" className="text-[10px]">נגמר</Pill> : isLow ? <Pill tone="neutral" className="text-[10px]">נמוך</Pill> : null}
                <span className="flex-1" />
                <input
                  type="number" min={0} inputMode="numeric" dir="ltr"
                  value={n ?? ""}
                  placeholder="—"
                  aria-label={`כמה ${p.name} יש`}
                  onChange={(e) => setPartCount(p.id, e.target.value === "" ? null : Number(e.target.value))}
                  className={cn(
                    "h-9 w-24 px-2 rounded-lg bg-ink-950 border text-sm font-mono text-ink-100 focus:outline-none focus:border-flame/60",
                    n === 0 ? "border-flame/60" : isLow ? "border-amber-500/50" : "border-ink-800",
                  )}
                />
                <span className="text-[11px] text-ink-500 w-8">{p.unit}</span>
              </div>
              {users.length > 0 ? (
                <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="mt-1 text-[11px] text-ink-400 hover:text-ink-100">
                  {open === p.id ? "▾" : "◂"} {users.length} מוצרים משתמשים בזה
                </button>
              ) : (
                <div className="mt-1 text-[11px] text-ink-600">עדיין לא מחובר למוצר</div>
              )}
              {open === p.id && (
                <ul className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {users.map((id) => {
                    const need = PART_NEEDS[id].find((x) => x.part === p.id)!;
                    const can = canMake(id, parts);
                    return (
                      <li key={id} className="flex items-center gap-2 text-[12px]">
                        <span className="truncate">{nameOf(id)}</span>
                        <span className="text-ink-500 whitespace-nowrap">×{need.qty}</span>
                        <span className="flex-1" />
                        {can != null && (
                          <span className={cn("font-mono whitespace-nowrap", can === 0 ? "text-bad" : "text-ink-400")}>
                            {can === 0 ? "אי אפשר" : `עוד ${can}`}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
