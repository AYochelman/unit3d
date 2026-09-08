"use client";
import { useEffect, useMemo, useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import ColorSwatch from "@/components/ui/ColorSwatch";
import EmblemImage from "@/components/EmblemImage";
import { Field, Input } from "@/components/ui/Field";
import { useAdminStore } from "@/lib/admin-store";
import { isColorInStock } from "@/lib/inventory";
import { offeredColors, startingColor } from "@/lib/offer";
import { filamentsFor, useFilaments } from "@/lib/palette";
import { EXTRA_COLOR_PRICE, PERSONALIZE_PRICE } from "@/lib/personalize";
import { useLivePricer, MADE_TO_ORDER_FROM } from "@/lib/live-price";
import { BULK_NOTE, bulkDiscount, lineTotal } from "@/lib/pricing";
import { UNIT_FORMS, unitFormItemId, type UnitForm, type UnitFormId } from "@/lib/unitForms";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

export type UnitPick = {
  slug: string;
  title: string;
  brigade: string;
  corps: string;
  branch: string;
};

/**
 * "אין בעיה. איפה אתה רוצה את הגדוד שלך?"
 *
 * Tapping a battalion used to jump to the contact form with a keychain and a
 * size already decided for the customer — the shop chose, then asked for a
 * phone number. This asks the two questions that actually change the object:
 * what body the emblem sits on, and how it is finished. The choices are the
 * designer's own — colour, a second colour, one line of text — so a customer
 * who lands here and one who came through /configurator are offered the same
 * thing in the same words.
 */
export default function UnitOrderModal({
  unit,
  onClose,
  onConfirm,
}: {
  unit: UnitPick | null;
  onClose: () => void;
  onConfirm: (order: { form: UnitForm; summary: string[]; price: number | null; qty: number }) => void;
}) {
  const palette = useFilaments();
  const stock = useAdminStore((s) => s.stock);
  const priceOf = useLivePricer();

  // A fresh unit is a fresh decision, so the caller keys this on the slug and
  // React gives it new state — keeping the last one's answers would quietly
  // order the wrong thing.
  const [formId, setFormId] = useState<UnitFormId>("keychain");
  const [colorId, setColorId] = useState<string | null>(null);
  const [twoTone, setTwoTone] = useState(false);
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!unit) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unit, onClose]);

  const form = UNIT_FORMS.find((f) => f.id === formId) ?? UNIT_FORMS[0];

  // A product page offers only what can be printed today, and says so when the
  // shelf is empty. This is an enquiry, not a checkout — it ends in a message to
  // Ariel — so when nothing in the family is in stock the customer still gets to
  // say which colour they want, with every swatch struck through so the answer
  // is "that one is a few days out", not a promise.
  const family = useMemo(() => filamentsFor(palette, form.material), [palette, form.material]);
  const inStock = useMemo(
    () => offeredColors(palette, stock, form.material).filter((c) => isColorInStock(stock, form.material, c.id)),
    [palette, stock, form.material],
  );
  const colors = inStock.length ? inStock : family;
  const noneInStock = inStock.length === 0;
  const color = colorId ?? (inStock[0]?.id ?? startingColor(palette, stock, form.material));
  const colorName = palette.find((c) => c.id === color)?.name ?? "";

  const base = priceOf({ id: unitFormItemId(form.id), price: form.price, grams: form.grams, hours: form.hours, material: form.material });
  const quoteOnly = base >= MADE_TO_ORDER_FROM;
  const extras = (twoTone ? EXTRA_COLOR_PRICE : 0) + (text.trim() ? PERSONALIZE_PRICE : 0);
  const unitPrice = base + extras;
  const total = quoteOnly ? null : lineTotal(unitPrice, qty);

  if (!unit) return null;

  const confirm = () => {
    const summary = [
      `סמל יחידה: ${unit.title}`,
      `חטיבה: ${unit.brigade}`,
      `חיל: ${unit.corps}`,
      `זרוע: ${unit.branch}`,
      `מוצר: ${form.label} · ${form.dim}`,
      `צבע: ${colorName}${twoTone ? ` + צבע שני (${fmtILS(EXTRA_COLOR_PRICE)})` : ""}`,
      text.trim() ? `כיתוב: ${text.trim()} (${fmtILS(PERSONALIZE_PRICE)})` : "ללא כיתוב",
      `זמן הדפסה: ${form.hours}h`,
      qty > 1 ? `כמות: ${qty}${bulkDiscount(qty) ? ` · ${BULK_NOTE}` : ""}` : null,
      quoteOnly ? "מחיר: לפי הזמנה" : null,
    ].filter(Boolean) as string[];
    onConfirm({ form, summary, price: total, qty });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-950/80 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="בחירת מוצר לסמל היחידה"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-ink-900 border border-ink-700 shadow-2xl overflow-hidden"
      >
        <header className="flex items-center gap-3 p-4 border-b border-ink-800 shrink-0">
          <span className="relative h-11 w-11 shrink-0 rounded-xl bg-ink-950 border border-ink-800 overflow-hidden">
            <EmblemImage slug={unit.slug} label={unit.title} paddingRatio={0.1} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm">אין בעיה. איפה אתה רוצה את הגדוד שלך?</div>
            <div className="text-[11px] text-ink-400 truncate">{unit.title} · {unit.brigade}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור" className="text-ink-500 hover:text-ink-100">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Where it goes */}
          <div className="space-y-2">
            {UNIT_FORMS.map((f) => {
              const p = priceOf({ id: unitFormItemId(f.id), price: f.price, grams: f.grams, hours: f.hours, material: f.material });
              const picked = f.id === formId;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormId(f.id)}
                  aria-pressed={picked}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-colors",
                    picked ? "border-flame bg-flame/10" : "border-ink-800 hover:border-ink-700 hover:bg-ink-800/50",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border-2",
                      picked ? "border-flame bg-flame" : "border-ink-600",
                    )}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-ink-50">{f.label}</span>
                    <span className="block text-xs text-ink-400">{f.desc}</span>
                  </span>
                  <span className="shrink-0 text-left">
                    <span className="block font-bold text-sm">
                      {p >= MADE_TO_ORDER_FROM ? "לפי הזמנה" : fmtILS(p)}
                    </span>
                    <span className="block text-[11px] font-mono text-ink-500" dir="ltr">{f.dim}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Colour */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2.5">
              צבע: <span className="text-ink-100 font-normal">{colorName}</span>
              {noneInStock && (
                <span className="text-ink-500 font-normal"> · הגליל לא על המדף כרגע, נזמין אותו</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === c.id}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 relative",
                    color === c.id ? "border-white scale-110 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]" : "border-ink-700/50",
                    !isColorInStock(stock, form.material, c.id) && "opacity-35",
                  )}
                >
                  <ColorSwatch filament={c} fill />
                  {!isColorInStock(stock, form.material, c.id) && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="block w-7 h-[2px] bg-white/80 rotate-45 rounded-full" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Second colour */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-ink-800 cursor-pointer hover:bg-ink-800/50">
            <input
              type="checkbox"
              checked={twoTone}
              onChange={(e) => setTwoTone(e.target.checked)}
              className="h-4 w-4 accent-flame"
            />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-ink-50">הסמל בשני צבעים</span>
              <span className="block text-xs text-ink-400">גליל שני על אותה הדפסה — הרקע והסמל בגוונים שונים.</span>
            </span>
            <span className="shrink-0 text-sm font-bold">+{fmtILS(EXTRA_COLOR_PRICE)}</span>
          </label>

          {/* One line of text */}
          <Field label="שורת טקסט (לא חובה)" hint={`שם, מספר אישי או תאריך. +${fmtILS(PERSONALIZE_PRICE)}`}>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 24))}
              placeholder="לדוגמה: אלון · מחזור נובמבר"
              maxLength={24}
            />
          </Field>

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-ink-300">כמות</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="פחות"
                className="h-9 w-9 rounded-lg border border-ink-700 hover:bg-ink-800"
              >
                −
              </button>
              <span className="w-10 text-center font-bold tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="עוד"
                className="h-9 w-9 rounded-lg border border-ink-700 hover:bg-ink-800"
              >
                +
              </button>
            </div>
            {bulkDiscount(qty) > 0 && <span className="text-xs text-good">{BULK_NOTE}</span>}
          </div>
        </div>

        <footer className="flex items-center gap-3 p-4 border-t border-ink-800 bg-ink-950/40 shrink-0">
          <div className="flex-1 min-w-0">
            {total == null ? (
              <>
                <div className="font-black text-lg leading-none">לפי הזמנה</div>
                <div className="text-[11px] text-ink-400 mt-1">חתיכה בגודל הזה מתומחרת אישית</div>
              </>
            ) : (
              <>
                <div className="font-black text-lg leading-none">{fmtILS(total)}</div>
                <div className="text-[11px] text-ink-400 mt-1">
                  {form.label}{qty > 1 ? ` · ${qty} יחידות` : ""}{extras ? ` · כולל תוספות` : ""}
                </div>
              </>
            )}
          </div>
          <Btn onClick={confirm}>המשך להזמנה</Btn>
        </footer>
      </div>
    </div>
  );
}
