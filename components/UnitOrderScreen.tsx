"use client";
import { useEffect, useMemo, useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import ColorSwatch from "@/components/ui/ColorSwatch";
import Image from "next/image";
import ProductArt from "@/components/ProductArt";
import EmblemImage from "@/components/EmblemImage";
import { Field, Input } from "@/components/ui/Field";
import { useAdminStore } from "@/lib/admin-store";
import { isColorInStock } from "@/lib/inventory";
import { offeredColors, startingColor } from "@/lib/offer";
import { filamentsFor, useFilaments } from "@/lib/palette";
import { MATERIAL_BY_ID } from "@/lib/materials";
import { EXTRA_COLOR_PRICE, PERSONALIZE_PRICE } from "@/lib/personalize";
import { useLivePricer, MADE_TO_ORDER_FROM } from "@/lib/live-price";
import { BULK_NOTE, bulkDiscount, lineTotal } from "@/lib/pricing";
import { UNIT_FORMS, UNIT_FORM_GROUP, unitFormItemId, type UnitForm, type UnitFormGroup, type UnitFormId } from "@/lib/unitForms";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

export type UnitPick = {
  slug: string;
  title: string;
  brigade: string;
  corps: string;
  branch: string;
};

const GROUPS: UnitFormGroup[] = ["emblem", "everyday"];

/**
 * The drawing takes the chosen filament's colour — except when that colour is
 * black, which on this theme is a card with nothing in it. Dark spools are
 * lifted towards grey for the illustration only; the swatch above still shows
 * the real colour.
 */
function artColor(hex?: string): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= 0.3) return hex;
  const lift = (c: number) => Math.round(c + (175 - c) * (1 - lum / 0.3));
  return `#${[r, g, b].map((c) => lift(c).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * "אין בעיה. איפה אתה רוצה את הגדוד שלך?"
 *
 * Tapping a battalion used to jump to the contact form with a keychain and a
 * size already decided for the customer — the shop chose, then asked for a
 * phone number. This asks the two questions that actually change the object:
 * what body the emblem sits on, and how it is finished.
 *
 * It takes the whole screen rather than a dialog because the emblem is the
 * subject of the decision: the unit stays in front of the customer at the size
 * it will be printed, and each body is a card with its own drawing in the
 * colour being chosen. The choices themselves are the designer's own — colour,
 * a second colour, one line of text — so a customer who lands here and one who
 * came through /configurator are offered the same thing in the same words.
 */
export default function UnitOrderScreen({
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
    // The page behind must not scroll under a full-screen view.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [unit, onClose]);

  const form = UNIT_FORMS.find((f) => f.id === formId) ?? UNIT_FORMS[0];

  /** Is any colour of this body's filament actually on the shelf? */
  const onShelf = (material: UnitForm["material"]) =>
    filamentsFor(palette, material).some((c) => isColorInStock(stock, material, c.id));

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
  const filament = palette.find((c) => c.id === color);
  const colorName = filament?.name ?? "";

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
      `חומר: ${MATERIAL_BY_ID[form.material].name}`,
      `צבע: ${colorName}${twoTone ? ` + יותר מצבע אחד (${fmtILS(EXTRA_COLOR_PRICE)})` : ""}`,
      text.trim() ? `כיתוב: ${text.trim()} (${fmtILS(PERSONALIZE_PRICE)})` : "ללא כיתוב",
      form.recommends ? `החומר המומלץ: ${MATERIAL_BY_ID[form.recommends.material].name} (${form.recommends.why}) - לא במלאי` : null,
      `זמן הדפסה: ${form.hours}h`,
      qty > 1 ? `כמות: ${qty}${bulkDiscount(qty) ? ` · ${BULK_NOTE}` : ""}` : null,
      quoteOnly ? "מחיר: לפי הזמנה" : null,
    ].filter(Boolean) as string[];
    onConfirm({ form, summary, price: total, qty });
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-ink-950 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 h-14 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-50"
        >
          <Icon name="arrowRight" size={16} />
          חזרה לקטלוג
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onClose} aria-label="סגור" className="text-ink-500 hover:text-ink-100">
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-32 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* The unit — the subject of every choice on this screen */}
        <aside className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          {/* On a phone the emblem is a header, not a hero: a full-width square
              pushes every choice below the fold, which is the one thing this
              screen exists to show. */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden flex lg:block items-center gap-4 p-3 lg:p-0">
            {/* No inset: several insignia are scans with a white ground of their
                own, and a margin around them reads as a picture of a badge
                pinned to a wall rather than as the badge. Filling the frame lets
                the emblem BE the frame; contain still keeps it uncropped. */}
            <div className="relative h-24 w-24 shrink-0 rounded-xl lg:rounded-none lg:h-auto lg:w-auto lg:aspect-square bg-ink-950 overflow-hidden">
              <EmblemImage slug={unit.slug} label={unit.title} paddingRatio={0} />
            </div>
            <div className="min-w-0 lg:p-5 lg:border-t lg:border-ink-800">
              <Pill tone="flame" className="mb-2">הגדוד שבחרת</Pill>
              <h2 className="text-lg lg:text-2xl font-black tracking-tight leading-tight truncate lg:whitespace-normal">{unit.title}</h2>
              <dl className="mt-2 lg:mt-3 space-y-1 text-xs lg:text-sm">
                <div className="flex gap-2"><dt className="text-ink-500 w-12 lg:w-14 shrink-0">חטיבה</dt><dd className="text-ink-200 truncate">{unit.brigade}</dd></div>
                <div className="hidden sm:flex gap-2"><dt className="text-ink-500 w-12 lg:w-14 shrink-0">חיל</dt><dd className="text-ink-200 truncate">{unit.corps}</dd></div>
                <div className="hidden sm:flex gap-2"><dt className="text-ink-500 w-12 lg:w-14 shrink-0">זרוע</dt><dd className="text-ink-200 truncate">{unit.branch}</dd></div>
              </dl>
            </div>
          </div>
        </aside>

        {/* The choices */}
        <div className="lg:col-span-3 space-y-8">
          <header>
            <h1 className="text-2xl md:text-4xl font-black tracking-tightest leading-tight">
              אין בעיה. איפה אתה רוצה את הגדוד שלך?
            </h1>
            <p className="text-ink-400 mt-2">
              אותו סמל, על גוף אחר. בחר איפה הוא יושב ואיך הוא נגמר.
            </p>
          </header>

          {GROUPS.map((g) => (
            <section key={g}>
              <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase mb-3">
                {UNIT_FORM_GROUP[g]}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {UNIT_FORMS.filter((f) => f.group === g).map((f) => {
                  const p = priceOf({ id: unitFormItemId(f.id), price: f.price, grams: f.grams, hours: f.hours, material: f.material });
                  const picked = f.id === formId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormId(f.id)}
                      aria-pressed={picked}
                      className={cn(
                        "group text-right rounded-xl border overflow-hidden transition-all",
                        picked
                          ? "border-flame bg-flame/10 ring-1 ring-flame/40"
                          : "border-ink-800 bg-ink-900 hover:border-ink-700 hover:-translate-y-0.5",
                      )}
                    >
                      <span className="block relative aspect-[4/3] bg-ink-950/60 flex items-center justify-center overflow-hidden">
                        {f.photo ? (
                          <Image
                            src={f.photo}
                            alt={f.label}
                            fill
                            sizes="(max-width: 640px) 50vw, 200px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <ProductArt art={f.art} color={artColor(filament?.hex)} size={86} />
                        )}
                        {picked && (
                          <span className="absolute top-2 left-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-flame-600 text-white">
                            <Icon name="check" size={12} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="block p-3 border-t border-ink-800/70">
                        <span className="block font-bold text-sm text-ink-50 truncate">{f.label}</span>
                        <span className="block text-[11px] text-ink-400 leading-snug h-8 overflow-hidden">{f.desc}</span>
                        {f.recommends && (
                          <span className="block text-[10px] text-cyan2/90 mt-1">
                            מומלץ: {MATERIAL_BY_ID[f.recommends.material].name} · {f.recommends.why}
                          </span>
                        )}
                        {!onShelf(f.material) && (
                          <span className="block text-[10px] text-amber-400/90 mt-1">בהזמנה · הגליל אינו במלאי</span>
                        )}
                        <span className="flex items-baseline justify-between mt-1.5">
                          <span className="font-bold text-sm text-flame">
                            {p >= MADE_TO_ORDER_FROM ? "לפי הזמנה" : fmtILS(p)}
                          </span>
                          <span className="font-mono text-[10px] text-ink-500" dir="ltr">{f.dim}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Finish */}
          <section className="space-y-5">
            <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase">העיצוב</div>

            <div>
              <div className="text-sm font-bold text-ink-200 mb-1">
                צבע: <span className="text-ink-50 font-normal">{colorName}</span>
              </div>
              {/* The list changes between products and that looks like a bug
                  until you know why: a colour belongs to a filament, and the
                  ashtray is printed in another one. Say which, rather than
                  leaving the customer to notice swatches appearing and
                  disappearing as they tap. */}
              {noneInStock ? (
                // Striking out every swatch marks nothing — the exception has
                // become the rule. One sentence carries it, and the colours stay
                // ordinary so the customer can still say which one they want.
                <div className="text-[11px] text-amber-400/90 mb-2.5">
                  {MATERIAL_BY_ID[form.material].name} לא על המדף כרגע. נזמין גליל בצבע שתבחר —
                  זמן האספקה מתארך בכמה ימים.
                </div>
              ) : (
                <div className="text-[11px] text-ink-500 mb-2.5">
                  {form.label} מודפס ב-{MATERIAL_BY_ID[form.material].name}
                  {form.material !== "pla" && " — ולכן הגוונים שונים משאר המוצרים"}
                  {` · ${colors.length} גוונים על המדף`}
                  {form.recommends && (
                    <span className="block text-cyan2/90 mt-0.5">
                      החומר המומלץ ל{form.label} הוא {MATERIAL_BY_ID[form.recommends.material].name} ({form.recommends.why}).
                      אינו במלאי כרגע — כתוב לנו בשורת הטקסט או בהודעה ונזמין גליל.
                    </span>
                  )}
                </div>
              )}
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
                      "h-10 w-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 relative",
                      color === c.id ? "border-white scale-110 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]" : "border-ink-700/50",
                      !noneInStock && !isColorInStock(stock, form.material, c.id) && "opacity-35",
                    )}
                  >
                    <ColorSwatch filament={c} fill />
                    {!noneInStock && !isColorInStock(stock, form.material, c.id) && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="block w-8 h-[2px] bg-white/80 rotate-45 rounded-full" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-ink-800 bg-ink-900 cursor-pointer hover:border-ink-700">
              <input
                type="checkbox"
                checked={twoTone}
                onChange={(e) => setTwoTone(e.target.checked)}
                className="h-4 w-4 accent-flame"
              />
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-ink-50">יותר מצבע אחד</span>
                <span className="block text-xs text-ink-400">גליל נוסף על אותה הדפסה — הרקע והסמל בגוונים שונים.</span>
              </span>
              <span className="shrink-0 text-sm font-bold">+{fmtILS(EXTRA_COLOR_PRICE)}</span>
            </label>

            <Field label="שורת טקסט (לא חובה)" hint={`שם, מספר אישי או תאריך. +${fmtILS(PERSONALIZE_PRICE)}`}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 24))}
                placeholder="לדוגמה: אלון · מחזור נובמבר"
                maxLength={24}
              />
            </Field>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-ink-200">כמות</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="פחות"
                  className="h-10 w-10 rounded-lg border border-ink-700 hover:bg-ink-800"
                >
                  −
                </button>
                <span className="w-12 text-center font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label="עוד"
                  className="h-10 w-10 rounded-lg border border-ink-700 hover:bg-ink-800"
                >
                  +
                </button>
              </div>
              {bulkDiscount(qty) > 0 && <span className="text-xs text-good">{BULK_NOTE}</span>}
            </div>
          </section>
        </div>
      </div>

      {/* Total */}
      <div className="fixed bottom-0 inset-x-0 border-t border-ink-800 bg-ink-950/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {total == null ? (
              <>
                <div className="font-black text-xl leading-none">לפי הזמנה</div>
                <div className="text-[11px] text-ink-400 mt-1">חתיכה בגודל הזה מתומחרת אישית</div>
              </>
            ) : (
              <>
                <div className="font-black text-xl leading-none">{fmtILS(total)}</div>
                <div className="text-[11px] text-ink-400 mt-1 truncate">
                  {unit.title} · {form.label}{qty > 1 ? ` · ${qty} יחידות` : ""}{extras ? " · כולל תוספות" : ""}
                </div>
              </>
            )}
          </div>
          <Btn size="lg" onClick={confirm}>המשך להזמנה</Btn>
        </div>
      </div>
    </div>
  );
}
