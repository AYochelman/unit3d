"use client";
import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import ProductArt from "@/components/ProductArt";
import { Field, Input } from "@/components/ui/Field";
import { FILAMENTS } from "@/lib/data";
import { MATERIALS, MATERIAL_BY_ID } from "@/lib/materials";
import { PRODUCT_BY_ID, CATEGORY_LABEL } from "@/lib/products";
import AdminCostPanel from "@/components/AdminCostPanel";
import AdminUnlock from "@/components/AdminUnlock";
import { useAdminStore } from "@/lib/admin-store";
import { useOrderStore } from "@/lib/order-store";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MaterialId } from "@/lib/types";

const AMS_OPTIONS = [
  { colors: 2, label: "2 צבעים", surcharge: 15 },
  { colors: 3, label: "3 צבעים", surcharge: 25 },
  { colors: 4, label: "4 צבעים", surcharge: 35 },
] as const;

export default function ProductDetailClient({ id }: { id: string }) {
  const p = PRODUCT_BY_ID[id];
  const addItem = useOrderStore((s) => s.addItem);
  const cartCount = useOrderStore((s) => s.items.length);
  const adminUnlocked = useAdminStore((s) => s.unlocked);
  const override = useAdminStore((s) => s.overrides[id]);

  const [colorId, setColorId] = useState(FILAMENTS[2].id);
  const [material, setMaterial] = useState<MaterialId>(p?.material ?? "pla_plus");
  const [amsOn, setAmsOn] = useState(false);
  const [amsColors, setAmsColors] = useState<2 | 3 | 4>(2);
  const [engrave1, setEngrave1] = useState("");
  const [engrave2, setEngrave2] = useState("");
  const [optionId, setOptionId] = useState(p?.options?.items[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!p) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center text-ink-400">
        מוצר לא נמצא.{" "}
        <Link href="/pets" className="text-flame underline">חזרה לחנות</Link>
      </div>
    );
  }

  const color = FILAMENTS.find((f) => f.id === colorId) ?? FILAMENTS[0];
  const mat = MATERIAL_BY_ID[material];
  const option = p.options?.items.find((o) => o.id === optionId);
  const amsSurcharge = amsOn ? AMS_OPTIONS.find((o) => o.colors === amsColors)!.surcharge : 0;
  // Only the DELTA from the product's own default material is a surcharge —
  // the listed catalogue price already includes that default.
  const baseMatAdd = MATERIAL_BY_ID[p.material ?? "pla"].priceAdd;
  const matSurcharge = Math.max(0, mat.priceAdd - baseMatAdd);
  const unitPrice = (override?.price ?? p.price) + matSurcharge + (option?.priceAdd ?? 0) + amsSurcharge;
  const total = unitPrice * qty;

  const grams = override?.grams ?? p.grams;
  const hours = override?.hours ?? p.hours;

  const backHref = p.category === "pets" ? "/pets" : p.category === "statues" ? "/statues" : "/home-office";
  const source = p.category === "pets" ? "pets" : "office";

  const handleAdd = () => {
    const lines = [
      `גודל: ${p.size}`,
      `זמן הדפסה: ${p.time}`,
      `חומר: ${mat.name}`,
      `צבע: ${color.name}`,
    ];
    if (option) lines.push(`${p.options!.label}: ${option.label}`);
    if (p.engraving && engrave1) lines.push(`${p.engraving.label}: "${engrave1}"`);
    if (p.engraving?.second && engrave2) lines.push(`${p.engraving.second.label}: "${engrave2}"`);
    if (amsOn) lines.push(`AMS ${amsColors} צבעים (+${fmtILS(amsSurcharge)})`);
    if (qty > 1) lines.push(`כמות: ${qty}`);
    addItem({
      title: p.name + (qty > 1 ? ` × ${qty}` : ""),
      summary: lines,
      price: total,
      source,
      meta: { productId: id, colorId, material, amsOn, amsColors, engrave1, engrave2, optionId, qty, baseUnitPrice: unitPrice },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      {added && (
        <div className="fixed top-20 inset-x-0 flex justify-center z-50 pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-good text-white px-5 py-2.5 rounded-full shadow-xl font-semibold text-sm">
            <Icon name="check" size={16} strokeWidth={3} />
            נוסף לסל · {cartCount} {cartCount === 1 ? "פריט" : "פריטים"}
            <Link href="/contact" className="pointer-events-auto underline opacity-80 hover:opacity-100 mr-1">לסל</Link>
          </div>
        </div>
      )}

      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-100 transition-colors mb-8 group">
        <Icon name="arrowRight" size={14} className="group-hover:translate-x-0.5 transition-transform" />
        חזרה ל{p.category === "pets" ? "תגים לחיות" : "בית ומשרד"}
      </Link>

      <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-14 items-start">
        {/* Illustration, tinted live by the chosen colour */}
        <div className="lg:sticky lg:top-24">
          <div
            className="relative aspect-square rounded-2xl overflow-hidden border border-ink-800 flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 50% 40%, ${color.hex}33, #111114 65%)` }}
          >
            <ProductArt art={p.art} color={color.hex} size={360} className="max-w-[80%] h-auto drop-shadow-2xl" />
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <Pill tone="neutral" className="text-[10px]">{CATEGORY_LABEL[p.category]}</Pill>
              {p.tag && <Pill tone="flame" className="text-[10px]">{p.tag}</Pill>}
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-ink-950/70 backdrop-blur px-2 py-1 rounded-full">
              <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
              <span className="text-[10px] font-mono text-ink-200">{color.name} · {mat.short}</span>
            </div>
            {(p.engraving && engrave1) && (
              <div className="absolute bottom-3 left-3 font-mono text-[11px] text-ink-100 bg-ink-950/70 backdrop-blur px-2 py-1 rounded-full">
                „{engrave1}”
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-ink-500 text-center">איור סכמטי. תמונות של הדפסות אמיתיות יתווספו לכל מוצר.</p>
        </div>

        {/* Config panel */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tightest leading-tight">{p.name}</h1>
            <p className="mt-2 text-ink-300 text-sm leading-relaxed">{p.desc}</p>

            {/* Credit for an imported design. CC-BY asks for the designer's
                name next to the work, and the link is also how you check the
                licence before selling a print of it. */}
            {p.sourceUrl && (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-500">
                <span>
                  עיצוב מקורי: <span className="text-ink-300">{p.creator ?? "MakerWorld"}</span>
                  {p.license && <span className="text-ink-400"> · {p.license}</span>}
                </span>
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan2 hover:underline"
                >
                  לדף המקור
                  <Icon name="arrowLeft" size={10} />
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-ink-400 border-y border-ink-800 py-3" dir="ltr">
            <span className="flex items-center gap-1.5"><Icon name="expand" size={11} />{p.size}</span>
            <span className="text-ink-700">·</span>
            <span className="flex items-center gap-1.5"><Icon name="clock" size={11} />{p.time}</span>
            <span className="text-ink-700">·</span>
            <span className="flex items-center gap-1.5"><Icon name="layers" size={11} />{grams}g</span>
          </div>

          {/* Options */}
          {p.options && (
            <div>
              <div className="text-xs font-bold text-ink-300 mb-2">{p.options.label}</div>
              <div className="flex flex-wrap gap-2">
                {p.options.items.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOptionId(o.id)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", optionId === o.id ? "bg-flame text-white border-flame" : "border-ink-700 text-ink-300 hover:border-ink-500")}
                  >
                    {o.label}{o.priceAdd > 0 ? ` (+${fmtILS(o.priceAdd)})` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Engraving */}
          {p.engraving && (
            <div className="grid gap-3">
              <Field label={p.engraving.label} optional>
                <Input value={engrave1} onChange={(e) => setEngrave1(e.target.value.slice(0, p.engraving!.max))} placeholder={p.engraving.placeholder} />
              </Field>
              {p.engraving.second && (
                <Field label={p.engraving.second.label} optional>
                  <Input value={engrave2} onChange={(e) => setEngrave2(e.target.value.slice(0, p.engraving!.second!.max))} placeholder={p.engraving.second.placeholder} dir="ltr" />
                </Field>
              )}
            </div>
          )}

          {/* Material */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2">
              חומר: <span className="text-ink-100 font-normal">{mat.name}</span>
              <span className="text-ink-500 font-normal"> · {mat.desc}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterial(m.id)}
                  title={m.desc}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors", material === m.id ? "bg-flame/15 text-flame border-flame" : "border-ink-700 text-ink-300 hover:border-ink-500")}
                  dir="ltr"
                >
                  {m.short}{Math.max(0, m.priceAdd - baseMatAdd) > 0 ? ` +${Math.max(0, m.priceAdd - baseMatAdd)}` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Colour */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2.5">
              צבע: <span className="text-ink-100 font-normal">{color.name}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {FILAMENTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={colorId === c.id}
                  className={cn("h-9 w-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95", colorId === c.id ? "border-white scale-110 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]" : "border-ink-700/50")}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* AMS */}
          {p.ams && (
            <div className={cn("rounded-xl border transition-colors overflow-hidden", amsOn ? "border-cyan2/40 bg-cyan2/5" : "border-ink-800 bg-ink-900/40")}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", amsOn ? "bg-cyan2/20 text-cyan2" : "bg-ink-800 text-ink-400")}>
                    <Icon name="layers" size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">הדפסת AMS — ריבוי צבעים</div>
                    <div className="text-[11px] text-ink-400 mt-0.5">טקסט או פרט בצבע שני, שלישי ורביעי</div>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={amsOn} onClick={() => setAmsOn((v) => !v)} dir="ltr" className={cn("relative h-6 w-11 rounded-full transition-colors flex-shrink-0", amsOn ? "bg-cyan2" : "bg-ink-700")}>
                  <span className={cn("absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-transform", amsOn ? "translate-x-[23px]" : "translate-x-[3px]")} />
                </button>
              </div>
              {amsOn && (
                <div className="px-4 pb-4 border-t border-cyan2/20 pt-3 grid grid-cols-3 gap-2">
                  {AMS_OPTIONS.map((o) => (
                    <button key={o.colors} type="button" onClick={() => setAmsColors(o.colors)} className={cn("py-2.5 rounded-xl text-xs font-semibold border transition-all", amsColors === o.colors ? "bg-cyan2/20 border-cyan2 text-cyan2" : "border-ink-700 text-ink-400 hover:border-ink-500")}>
                      {o.label}
                      <div className="font-mono text-[10px] mt-0.5 opacity-80">+{fmtILS(o.surcharge)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Qty */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2.5">כמות</div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="h-10 w-10 rounded-xl border border-ink-700 flex items-center justify-center text-ink-300 hover:border-ink-500 disabled:opacity-30">
                <Icon name="minus" size={16} />
              </button>
              <span className="font-mono text-xl font-black w-8 text-center">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} className="h-10 w-10 rounded-xl border border-ink-700 flex items-center justify-center text-ink-300 hover:border-ink-500">
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between pt-2 border-t border-ink-800">
            <div>
              <div className="text-[11px] text-ink-500 mb-0.5">מחיר סופי</div>
              <div className="text-3xl md:text-4xl font-black font-mono text-flame" dir="ltr">{fmtILS(total)}</div>
              {qty > 1 && <div className="text-[11px] text-ink-500 font-mono mt-0.5" dir="ltr">{fmtILS(unitPrice)} ליחידה</div>}
            </div>
            <AdminUnlock />
          </div>

          {adminUnlocked && (
            <AdminCostPanel
              itemId={id}
              grams={grams}
              hours={hours}
              material={material}
              colors={amsOn ? amsColors : 1}
              qty={qty}
              price={unitPrice}
            />
          )}

          <button
            type="button"
            onClick={handleAdd}
            className={cn("w-full h-12 rounded-xl font-black text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg", added ? "bg-good text-white" : "bg-flame text-white hover:bg-flame/90")}
          >
            {added ? (<><Icon name="check" size={18} strokeWidth={3} />נוסף לסל!</>) : (<><Icon name="plus" size={18} />הוסף לסל</>)}
          </button>
          {cartCount > 0 && (
            <Link href="/contact" className="w-full h-10 rounded-xl border border-flame text-flame font-semibold text-sm hover:bg-flame/10 transition-colors flex items-center justify-center gap-2">
              <Icon name="package" size={14} />
              לסל הקנייה · {cartCount} {cartCount === 1 ? "פריט" : "פריטים"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

