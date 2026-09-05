"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FIDGETS, FILAMENTS } from "@/lib/data";
import { useOrderStore } from "@/lib/order-store";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import Emblem from "@/components/Emblem";
import { MATERIALS, MATERIAL_BY_ID } from "@/lib/materials";
import { fidgetGrams } from "@/lib/products";
import { parseHours } from "@/lib/costing";
import AdminCostPanel from "@/components/AdminCostPanel";
import AdminUnlock from "@/components/AdminUnlock";
import ShippingEstimate from "@/components/ShippingEstimate";
import ReviewForm from "@/components/ReviewForm";
import { useAdminStore } from "@/lib/admin-store";
import type { MaterialId } from "@/lib/types";

// ─── AMS multi-colour options ─────────────────────────────────────────────────
const AMS_OPTIONS = [
  { colors: 2, label: "2 צבעים", surcharge: 20 },
  { colors: 3, label: "3 צבעים", surcharge: 35 },
  { colors: 4, label: "4 צבעים", surcharge: 50 },
] as const;

// Filaments that look better without multiply blend
const LIGHT_FILAMENTS = new Set(["white", "silver", "glow"]);

// ─── Component ────────────────────────────────────────────────────────────────
export default function FidgetDetailClient({ id }: { id: string }) {
  const addItem = useOrderStore((s) => s.addItem);
  const cartCount = useOrderStore((s) => s.items.length);

  const f = FIDGETS.find((x) => x.id === id);

  const [imgIdx, setImgIdx]       = useState(0);
  const [colorId, setColorId]     = useState(FILAMENTS[0].id);
  const [amsOn, setAmsOn]         = useState(false);
  const [amsColors, setAmsColors] = useState<2 | 3 | 4>(2);
  const [qty, setQty]             = useState(1);
  const [material, setMaterial] = useState<MaterialId>("pla_plus");
  const adminUnlocked = useAdminStore((s) => s.unlocked);
  const override = useAdminStore((s) => s.overrides[id]);
  const [variantId, setVariantId] = useState(f?.variants?.[0]?.id);
  const [added, setAdded]         = useState(false);

  if (!f) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center text-ink-400">
        מוצר לא נמצא.{" "}
        <Link href="/fidgets" className="text-flame underline">
          חזור לפידג&apos;טים
        </Link>
      </div>
    );
  }

  // ── derived state ─────────────────────────────────────────────────────────
  const variant       = f.variants && variantId ? f.variants.find((v) => v.id === variantId) : undefined;
  const amsSurcharge  = amsOn ? (AMS_OPTIONS.find((o) => o.colors === amsColors)?.surcharge ?? 0) : 0;
  const mat           = MATERIAL_BY_ID[material];
  // Fidget list prices assume PLA+, so only the delta above it is a surcharge.
  const baseMatAdd    = MATERIAL_BY_ID.pla_plus.priceAdd;
  const matSurcharge  = Math.max(0, mat.priceAdd - baseMatAdd);
  const unitPrice     = (override?.price ?? f.price) + (variant?.surcharge ?? 0) + amsSurcharge + matSurcharge;
  const totalPrice    = unitPrice * qty;
  const displayTime   = variant?.time ?? f.time;
  const displayColors = amsOn ? amsColors : variant?.colors ?? 1;

  const images: string[] = variant?.thumbnail
    ? [variant.thumbnail]
    : f.images && f.images.length > 0 ? f.images
    : f.thumbnail ? [f.thumbnail]
    : [];

  const selectedFilament = FILAMENTS.find((c) => c.id === colorId);
  const tintHex          = selectedFilament?.hex ?? "#888";
  // Multiply blend: white/silver/glow look odd — use "color" blend instead
  const blendMode    = LIGHT_FILAMENTS.has(colorId) ? "color" : "multiply";
  const tintOpacity  = colorId === "black" ? 0 : LIGHT_FILAMENTS.has(colorId) ? 0.18 : 0.30;

  const weightG       = override?.grams ?? fidgetGrams(f);
  const hours         = override?.hours ?? parseHours(displayTime);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    const lines: string[] = [
      `גודל: ${f.size}`,
      `זמן הדפסה: ${displayTime}`,
      `צבע: ${selectedFilament?.name ?? colorId}`,
      `חומר: ${mat.name}`,
    ];
    if (variant) lines.push(`גרסה: ${variant.label}`);
    if (amsOn) lines.push(`AMS ${amsColors} צבעים (+${fmtILS(amsSurcharge)})`);
    if (qty > 1) lines.push(`כמות: ${qty}`);

    addItem({
      title: f.name + (qty > 1 ? ` × ${qty}` : ""),
      summary: lines,
      price: totalPrice,
      source: "fidgets",
      meta: { fidgetId: id, colorId, material, amsOn, amsColors, qty, variantId, baseUnitPrice: unitPrice },
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12" dir="rtl">

      {/* Toast */}
      {added && (
        <div className="fixed top-20 inset-x-0 flex justify-center z-50 pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-good text-white px-5 py-2.5 rounded-full shadow-xl font-semibold text-sm">
            <Icon name="check" size={16} strokeWidth={3} />
            נוסף לסל · {cartCount} {cartCount === 1 ? "פריט" : "פריטים"}
            <Link href="/contact" className="pointer-events-auto underline opacity-80 hover:opacity-100 mr-1">
              לסל
            </Link>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <Link
        href="/fidgets"
        className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-100 transition-colors mb-8 group"
      >
        <Icon name="arrowRight" size={14} className="group-hover:translate-x-0.5 transition-transform" />
        חזרה לפידג&apos;טים
      </Link>

      {/* ── Two-column grid ──────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-14 items-start">

        {/* ── LEFT: gallery ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-24">

          {/* Main image with color tint overlay */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-ink-900 border border-ink-800 group">
            {images.length > 0 ? (
              <>
                {images.map((src, i) => (
                  <Image
                    key={src}
                    src={src}
                    alt={`${f.name} — תמונה ${i + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={cn(
                      "object-cover transition-opacity duration-300",
                      i === imgIdx ? "opacity-100" : "opacity-0 pointer-events-none",
                    )}
                    priority={i === 0}
                    unoptimized
                  />
                ))}

                {/* ── Color tint overlay ── */}
                <div
                  className="absolute inset-0 pointer-events-none transition-all duration-500 rounded-2xl"
                  style={{
                    backgroundColor: tintHex,
                    opacity: tintOpacity,
                    mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
                  }}
                />

                {/* Nav buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImgIdx((p) => (p - 1 + images.length) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-ink-950/70 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-flame transition-all z-10"
                      aria-label="קודם"
                    >
                      <Icon name="chevRight" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgIdx((p) => (p + 1) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-ink-950/70 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-flame transition-all z-10"
                      aria-label="הבא"
                    >
                      <Icon name="chevLeft" size={18} />
                    </button>
                    <div
                      className="absolute top-3 left-3 font-mono text-[10px] text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1 rounded-full z-10"
                      dir="ltr"
                    >
                      {imgIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950">
                <Emblem shape={f.shape} hue={f.hue} size={180} />
              </div>
            )}

            {/* Tags */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
              {f.tag && (
                <Pill tone="flame" className="text-[10px] px-1.5 py-0.5 shadow-lg">
                  {f.tag}
                </Pill>
              )}
              {displayColors > 1 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border backdrop-blur bg-cyan2/15 text-cyan2 border-cyan2/40 shadow-lg"
                  dir="ltr"
                >
                  AMS · {displayColors}C
                </span>
              )}
            </div>

            {/* Selected color chip */}
            {selectedFilament && (
              <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-ink-950/70 backdrop-blur px-2 py-1 rounded-full">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: tintHex }}
                />
                <span className="text-[10px] font-mono text-ink-200">{selectedFilament.name}</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {images.slice(0, 14).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  className={cn(
                    "relative shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all",
                    i === imgIdx
                      ? "border-flame shadow-[0_0_0_2px_rgba(255,107,26,0.25)]"
                      : "border-ink-800 opacity-50 hover:opacity-90 hover:border-ink-600",
                  )}
                  aria-label={`תמונה ${i + 1}`}
                >
                  <Image src={src} alt={`thumb ${i + 1}`} fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: config panel ─────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Heading */}
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tightest leading-tight">
              {f.name}
            </h1>
            <p className="mt-2 text-ink-300 text-sm leading-relaxed">{f.desc}</p>
          </div>

          {/* Specs strip */}
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-ink-400 border-y border-ink-800 py-3"
            dir="ltr"
          >
            <span className="flex items-center gap-1.5"><Icon name="expand" size={11} />{f.size}</span>
            <span className="text-ink-700">·</span>
            <span className="flex items-center gap-1.5"><Icon name="clock" size={11} />{displayTime}</span>
            {displayColors > 1 && (
              <>
                <span className="text-ink-700">·</span>
                <span className="text-cyan2 font-bold">AMS · {displayColors}C</span>
              </>
            )}
            {f.downloads && (
              <>
                <span className="text-ink-700">·</span>
                <span className="flex items-center gap-1">
                  <Icon name="heart" size={11} />
                  {(f.downloads / 1000).toFixed(0)}K downloads
                </span>
              </>
            )}
          </div>

          {/* Variant selector */}
          {f.variants && f.variants.length > 1 && (
            <div>
              <div className="text-xs font-bold text-ink-300 mb-2">גרסה</div>
              <div className="flex flex-wrap gap-2">
                {f.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      variantId === v.id
                        ? "bg-flame text-white border-flame"
                        : "border-ink-700 text-ink-300 hover:border-ink-500",
                    )}
                  >
                    {v.label}{v.surcharge > 0 ? ` (+${fmtILS(v.surcharge)})` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Material ───────────────────────────────────────────────── */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2">
              חומר: <span className="text-ink-100 font-normal">{mat.name}</span>
              <span className="text-ink-500 font-normal"> · {mat.desc}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.filter((m) => m.id !== "tpu").map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterial(m.id)}
                  title={m.desc}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors",
                    material === m.id ? "bg-flame/15 text-flame border-flame" : "border-ink-700 text-ink-300 hover:border-ink-500",
                  )}
                  dir="ltr"
                >
                  {m.short}{Math.max(0, m.priceAdd - baseMatAdd) > 0 ? ` +${Math.max(0, m.priceAdd - baseMatAdd)}` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* ── Color picker ───────────────────────────────────────────── */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2.5">
              בחירת צבע:{" "}
              <span className="text-ink-100 font-normal">{selectedFilament?.name}</span>
              {selectedFilament && (
                <span className="text-ink-500 font-normal"> · {selectedFilament.desc}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {FILAMENTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  title={`${c.name} — ${c.desc}`}
                  aria-label={c.name}
                  aria-pressed={colorId === c.id}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 relative",
                    colorId === c.id
                      ? "border-white scale-110 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]"
                      : "border-ink-700/50",
                  )}
                  style={{ backgroundColor: c.hex }}
                >
                  {colorId === c.id && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Icon
                        name="check"
                        size={14}
                        className={
                          c.hex.toLowerCase() === "#f2f2ef" || c.hex.toLowerCase() === "#a8a9ad"
                            ? "text-ink-900"
                            : "text-white"
                        }
                      />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── AMS multi-colour toggle ─────────────────────────────────── */}
          <div
            className={cn(
              "rounded-xl border transition-colors overflow-hidden",
              amsOn ? "border-cyan2/40 bg-cyan2/5" : "border-ink-800 bg-ink-900/40",
            )}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                  amsOn ? "bg-cyan2/20 text-cyan2" : "bg-ink-800 text-ink-400",
                )}>
                  <Icon name="layers" size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm">הדפסת AMS — ריבוי צבעים</div>
                  <div className="text-[11px] text-ink-400 mt-0.5">Bambu X1C · 4 גלילים במקביל</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={amsOn}
                onClick={() => setAmsOn((p) => !p)}
                dir="ltr"
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors flex-shrink-0",
                  amsOn ? "bg-cyan2" : "bg-ink-700",
                )}
              >
                <span className={cn(
                  "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-transform",
                  amsOn ? "translate-x-[23px]" : "translate-x-[3px]",
                )} />
              </button>
            </div>
            {amsOn && (
              <div className="px-4 pb-4 border-t border-cyan2/20 pt-3">
                <div className="text-xs text-ink-400 mb-2.5">מספר צבעים:</div>
                <div className="grid grid-cols-3 gap-2">
                  {AMS_OPTIONS.map((opt) => (
                    <button
                      key={opt.colors}
                      onClick={() => setAmsColors(opt.colors)}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-semibold border transition-all",
                        amsColors === opt.colors
                          ? "bg-cyan2/20 border-cyan2 text-cyan2 shadow-[0_0_0_2px_rgba(0,194,199,0.2)]"
                          : "border-ink-700 text-ink-400 hover:border-ink-500",
                      )}
                    >
                      {opt.label}
                      <div className="font-mono text-[10px] mt-0.5 opacity-80">+{fmtILS(opt.surcharge)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Quantity ───────────────────────────────────────────────── */}
          <div>
            <div className="text-xs font-bold text-ink-300 mb-2.5">כמות</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="h-10 w-10 rounded-xl border border-ink-700 flex items-center justify-center text-ink-300 hover:border-ink-500 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="minus" size={16} />
              </button>
              <span className="font-mono text-xl font-black w-8 text-center select-none">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                disabled={qty >= 20}
                className="h-10 w-10 rounded-xl border border-ink-700 flex items-center justify-center text-ink-300 hover:border-ink-500 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="plus" size={16} />
              </button>
              {qty > 1 && (
                <span className="text-[11px] text-ink-400 font-mono">
                  {qty} × <span className="text-ink-300">{fmtILS(unitPrice)}</span>
                  {" = "}
                  <span className="text-ink-100 font-bold">{fmtILS(totalPrice)}</span>
                </span>
              )}
            </div>
          </div>

          {/* ── Price + admin ───────────────────────────────────────────── */}
          <div className="flex items-end justify-between pt-2 border-t border-ink-800">
            <div>
              <div className="text-[11px] text-ink-500 mb-0.5">מחיר סופי</div>
              <div className="text-3xl md:text-4xl font-black font-mono text-flame" dir="ltr">
                {fmtILS(totalPrice)}
              </div>
              {qty > 1 && (
                <div className="text-[11px] text-ink-500 font-mono mt-0.5" dir="ltr">
                  {fmtILS(unitPrice)} ליחידה
                </div>
              )}
            </div>
            <AdminUnlock />
          </div>

          {/* ── Admin cost panel ────────────────────────────────────────── */}
          <p className="text-[11px] text-ink-500 leading-relaxed border-r-2 border-amber-500/40 pr-2.5">
            התמונות הן של המעצב המקורי, לא של ההדפסה שלנו. אנחנו מדפיסים בצבע שתבחר —
            <span className="text-ink-300"> לא כל דגם אפשרי בכל צבע או חומר</span>, ואם משהו לא
            מסתדר אני אומר לך לפני שמתחילים.
          </p>

          <ShippingEstimate grams={weightG} qty={qty} />

          {adminUnlocked && (
            <AdminCostPanel
              itemId={id}
              grams={weightG}
              hours={hours}
              material={material}
              colors={displayColors}
              qty={qty}
              price={unitPrice}
            />
          )}

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={cn(
              "w-full h-12 rounded-xl font-black text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg",
              added
                ? "bg-good text-white shadow-good/20"
                : "bg-flame text-white hover:bg-flame/90 shadow-flame/20",
            )}
          >
            {added ? (
              <>
                <Icon name="check" size={18} strokeWidth={3} />
                נוסף לסל!
              </>
            ) : (
              <>
                <Icon name="plus" size={18} />
                הוסף לסל
              </>
            )}
          </button>

          {cartCount > 0 && (
            <Link
              href="/contact"
              className="w-full h-10 rounded-xl border border-flame text-flame font-semibold text-sm hover:bg-flame/10 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="package" size={14} />
              לסל הקנייה · {cartCount} {cartCount === 1 ? "פריט" : "פריטים"}
            </Link>
          )}

          <p className="text-center text-[11px] text-ink-500">
            לחץ &quot;לסל הקנייה&quot; כדי לסיים את ההזמנה ·  24H response
          </p>

          {/* Source attribution (CC-BY) — discreet, under the fold */}
          {f.creator && (
            <p className="text-[11px] text-ink-400 text-center" dir="ltr">
              {f.nameEn && f.nameEn !== f.name ? `${f.nameEn} · ` : ""}Model by {f.creator}
              {f.license ? ` · ${f.license}` : ""}
              {f.sourceUrl && (
                <>
                  {" · "}
                  <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-100">
                    source file
                  </a>
                </>
              )}
            </p>
          )}

          {/* Trust strip */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-ink-800">
            {[
              { icon: "check" as const, label: "הדפסה בארץ" },
              { icon: "truck" as const, label: "משלוח מהיר" },
              { icon: "rotate" as const, label: "אחריות 30 יום" },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-ink-900/50 border border-ink-800">
                <Icon name={b.icon} size={14} className="text-flame" />
                <span className="text-[10px] text-ink-400 text-center">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rate what you bought ─────────────────────────────────────── */}
      <section className="mt-12 max-w-2xl">
        <h2 className="text-xl font-extrabold tracking-tight mb-1">כבר הזמנת את זה?</h2>
        <p className="text-sm text-ink-400 mb-4">
          דירוג וביקורת עוזרים ללקוח הבא להחליט, ולי לדעת מה לשפר.
        </p>
        <ReviewForm itemName={f.name} compact />
      </section>
    </div>
  );
}
