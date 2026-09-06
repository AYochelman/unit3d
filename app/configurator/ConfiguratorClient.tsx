"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/Field";
import ProductArt from "@/components/ProductArt";
import ProductPreview, { faceKindFor } from "@/components/ProductPreview";
import DesignCanvas from "@/components/designer/DesignCanvas";
import { SHAPES, FONTS, FILAMENTS, SIZES, FIDGETS } from "@/lib/data";
import { CONFIG_PRODUCTS, CONFIG_PRODUCT_BY_ID, PRODUCT_BY_ID } from "@/lib/products";
import { MATERIAL_BY_ID, materialFromFilamentDesc } from "@/lib/materials";
import { designColorCount, designElementPrice, designSummary, designToSvg, emptyDesign, facePath } from "@/lib/design";
import { EXTRA_COLOR_PRICE, PERSONALIZE_PRICE } from "@/lib/personalize";
import { BULK_NOTE, bulkDiscount, lineTotal } from "@/lib/pricing";
import { estimateCost, parseHours } from "@/lib/costing";
import { useAdminStore } from "@/lib/admin-store";
import { useLivePrice, useLivePricer } from "@/lib/live-price";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useOrderStore } from "@/lib/order-store";
import type { ConfigProduct, ConfigProductId, Design, ShapeId, SizeId } from "@/lib/types";

type Mode = "text" | "design";

type Config = {
  product: ConfigProductId;
  model: string;
  shape: ShapeId;
  text: string;
  number: string;
  font: string;
  color: string;
  size: SizeId;
  qty: number;
  mode: Mode;
  design: Design;
};

type StepId = "product" | "model" | "shape" | "text" | "color" | "size" | "qty";

const STEP_LABEL: Record<StepId, string> = {
  product: "מוצר",
  model: "דגם",
  shape: "צורה",
  text: "טקסט / עיצוב",
  color: "צבע",
  size: "גודל",
  qty: "כמות",
};

// Same two numbers the rest of the shop quotes: putting your own thing on a
// product, and a second filament for it.
const DESIGN_SURCHARGE = PERSONALIZE_PRICE;
const DESIGN_EXTRA_COLOR = EXTRA_COLOR_PRICE;
const TPU_COLORS = new Set(["black", "white", "red", "blue", "orange", "green"]);

/** "50×35mm" / "Ø90mm" / "Ø90mm ×4" → [w, h] in mm. */
function parseFace(dim: string, fallback: [number, number]): [number, number] {
  const wh = dim.match(/(\d+)\s*×\s*(\d+)\s*mm/);
  if (wh) return [Number(wh[1]), Number(wh[2])];
  const d = dim.match(/Ø\s*(\d+)/);
  if (d) return [Number(d[1]), Number(d[1])];
  return fallback;
}

/** Keep the drawing proportional when the face size changes. */
function rescaleDesign(d: Design, w: number, h: number): Design {
  if (d.w === w && d.h === h) return d;
  const sx = w / d.w, sy = h / d.h, s = Math.min(sx, sy);
  return {
    w,
    h,
    elements: d.elements.map((e) =>
      e.kind === "text"
        ? { ...e, x: e.x * sx, y: e.y * sy, size: e.size * s }
        : { ...e, x: e.x * sx, y: e.y * sy, w: e.w * s, h: e.h * s },
    ),
  };
}

/**
 * The catalogue row the customer clicked, when they came from a product card.
 *
 * The designer works on ten generic bases, so opening one of those straight
 * from a product card names the CATEGORY ("דיסקית") rather than the thing that
 * was clicked. This lets the base keep the drawing, the face and the steps
 * while the product supplies the name, the price and the print figures.
 */
function itemOverride(id?: string): Partial<ConfigProduct> & { href?: string; image?: string } | undefined {
  if (!id) return undefined;
  const p = PRODUCT_BY_ID[id];
  if (p) {
    return {
      label: p.name,
      desc: p.desc,
      basePrice: p.price,
      grams: p.grams,
      hours: p.hours,
      ...(p.material ? { material: p.material } : {}),
      href: `/products/${p.id}`,
      image: p.image,
    };
  }
  const f = FIDGETS.find((x) => x.id === id);
  if (!f) return undefined;
  return { label: f.name, desc: f.desc, basePrice: f.price, href: `/fidgets/${f.id}`, image: f.thumbnail ?? f.images?.[0] };
}

export default function ConfiguratorClient({
  initialProduct,
  fromItem,
}: {
  initialProduct?: ConfigProductId;
  fromItem?: string;
}) {
  // Dropped as soon as the customer picks a different base in the picker —
  // from that point on they are designing that base, not the product.
  const [itemId, setItemId] = useState(fromItem);
  const override = useMemo(() => itemOverride(itemId), [itemId]);
  const fromName = override?.label;
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);
  const adminUnlocked = useAdminStore((s) => s.unlocked);
  const settings = useAdminStore((s) => s.settings);

  const startProduct = initialProduct && Object.hasOwn(CONFIG_PRODUCT_BY_ID, initialProduct) ? initialProduct : "keychain";
  const [step, setStep] = useState(startProduct === "keychain" ? 0 : 1);
  const [config, setConfig] = useState<Config>({
    product: startProduct,
    model: CONFIG_PRODUCT_BY_ID[startProduct].models?.items[0]?.id ?? "",
    shape: "round",
    text: "יואב",
    number: "12345",
    font: "sans",
    color: CONFIG_PRODUCT_BY_ID[startProduct].material === "tpu" ? "black" : "orange",
    size: startProduct === "keychain" ? "md" : "sm",
    qty: 1,
    mode: "text",
    design: emptyDesign(CONFIG_PRODUCT_BY_ID[startProduct].face[0], CONFIG_PRODUCT_BY_ID[startProduct].face[1]),
  });

  const update = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => ({ ...c, [k]: v }));

  const base = CONFIG_PRODUCT_BY_ID[config.product];
  const product: ConfigProduct = useMemo(() => (override ? { ...base, ...override } : base), [base, override]);
  const shapes = product.shapes ?? SHAPES;
  const shape: ShapeId = shapes.some((sh) => sh.id === config.shape) ? config.shape : shapes[0].id;
  const sizes = product.sizes ?? SIZES;
  const sizeObj = product.hasSize ? (sizes.find((s) => s.id === config.size) ?? sizes[0]) : null;
  const colorObj = FILAMENTS.find((f) => f.id === config.color)!;
  const fontObj = FONTS.find((f) => f.id === config.font)!;
  const materialId = product.material === "tpu" ? "tpu" : materialFromFilamentDesc(colorObj.desc);
  const material = MATERIAL_BY_ID[materialId];
  const modelLabel = product.models?.items.find((m) => m.id === config.model)?.label;

  const face: [number, number] = sizeObj ? parseFace(sizeObj.dim, product.face) : product.face;
  const design = rescaleDesign(config.design, face[0], face[1]);
  const hasDesign = config.mode === "design" && design.elements.length > 0;
  const designColors = hasDesign ? designColorCount(design) : 0;

  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ["product"];
    if (product.models) s.push("model");
    if (product.hasShape) s.push("shape");
    if (product.hasText) s.push("text");
    s.push("color");
    if (product.hasSize) s.push("size");
    s.push("qty");
    return s;
  }, [product]);
  const current = steps[Math.min(step, steps.length - 1)];

  // Only the DELTA above the product's own default material is a surcharge, so
  // the configurator can actually reach the price advertised in the listings.
  const matSurcharge = Math.max(0, material.priceAdd - MATERIAL_BY_ID[product.material].priceAdd);
  const priceOf = useLivePricer();
  // Follows /admin like every other price on the site.
  const baseProductPrice = useLivePrice({
    id: `cfg-${product.id}`,
    price: product.basePrice,
    grams: product.grams,
    hours: product.hours,
    material: product.material,
  });
  const unitPrice =
    baseProductPrice +
    (sizeObj?.priceAdd ?? 0) +
    matSurcharge +
    (product.hasShape && shape === "emblem" ? 10 : 0) +
    (hasDesign ? DESIGN_SURCHARGE + Math.max(0, designColors - 1) * DESIGN_EXTRA_COLOR : 0);
  const discount = bulkDiscount(config.qty);
  const totalPrice = lineTotal(unitPrice, config.qty);

  // Production estimate: scales with the face area against the product's reference face.
  const areaRatio = (face[0] * face[1]) / (product.face[0] * product.face[1]);
  const hours = sizeObj ? parseHours(sizeObj.time) : product.hours;
  // "Ø90mm ×4" is four printed pieces, not one — count them for the material cost.
  const pieces = Number(sizeObj?.dim.match(/×\s*(\d+)\s*$/)?.[1] ?? 1);
  const grams = Math.round(product.grams * Math.max(0.4, areaRatio) * pieces);
  const cost = estimateCost(
    { grams, hours, material: materialId, colors: hasDesign ? designColors : 1, qty: config.qty, price: totalPrice / config.qty },
    settings,
  );
  const timeLabel = sizeObj?.time ?? `${product.hours}h`;

  const selectProduct = (id: ConfigProductId) => {
    setItemId(undefined);
    const p = CONFIG_PRODUCT_BY_ID[id];
    setConfig((c) => ({
      ...c,
      product: id,
      model: p.models?.items[0]?.id ?? "",
      size: "sm",
      mode: p.hasDesigner ? c.mode : "text",
      design: emptyDesign(p.face[0], p.face[1]),
      color: p.material === "tpu" && !TPU_COLORS.has(c.color) ? "black" : c.color,
    }));
    setStep(1);
  };

  const goNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const proceed = () => {
    const lines: string[] = [`מוצר: ${product.label}`];
    if (override?.href) lines.push(`מתוך הקטלוג: ${product.label}`);
    if (modelLabel) lines.push(`${product.models!.label}: ${modelLabel}`);
    if (product.hasShape) lines.push(`צורה: ${shapes.find((s) => s.id === shape)?.label ?? ""}`);
    if (product.hasText) {
      if (hasDesign) lines.push(...designSummary(design));
      else lines.push(`טקסט: "${config.text}${config.number ? " " + config.number : ""}" · ${fontObj.name}`);
    }
    lines.push(`צבע: ${colorObj.name} · ${material.name}`);
    if (sizeObj) lines.push(`גודל: ${sizeObj.label} (${sizeObj.dim})`);
    else lines.push(`מידה: ${face[0]}×${face[1]}mm`);
    lines.push(`כמות: ${config.qty}${discount ? ` · ${BULK_NOTE}` : ""}`);

    const { design: _design, ...rest } = config;
    setOrder({
      title: `${product.label} מותאם`,
      summary: lines,
      price: totalPrice,
      source: "configurator",
      meta: {
        ...rest,
        face,
        material: materialId,
        baseUnitPrice: unitPrice,
        designSvg: hasDesign
          ? designToSvg(design, colorObj.hex, facePath(faceKindFor(product, shape), face[0], face[1]))
          : undefined,
        designElements: hasDesign ? design.elements : undefined,
      },
    });
    router.push("/contact");
  };

  const showCanvas = current === "text" && config.mode === "design" && product.hasDesigner;
  const colorChoices = product.material === "tpu" ? FILAMENTS.filter((f) => TPU_COLORS.has(f.id)) : FILAMENTS;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <header className="mb-6 md:mb-10">
        <Pill tone="cyan" className="mb-3">CONFIGURATOR · LIVE PREVIEW</Pill>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tightest mb-2">מעצב אישי</h1>
        <p className="text-ink-300">
          בוחרים מוצר, כותבים טקסט או מציירים עיצוב חופשי, בוחרים צבע. הכל מתעדכן בזמן אמת ונוסע איתך לטופס.
        </p>
        {fromName && (
          <div className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-xl border border-cyan2/40 bg-cyan2/5 text-sm">
            <Icon name="sparkles" size={14} className="text-cyan2 shrink-0" />
            <span className="text-ink-200">
              מעצבים את <b>{fromName}</b>. בחירת מוצר אחר למטה תחליף אותו.
            </span>
            {override?.href && (
              <Link href={override.href} className="text-cyan2 font-semibold underline underline-offset-2">
                לעמוד המוצר
              </Link>
            )}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Preview / canvas */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <div className="sticky top-20">
            {/* The designer works on ten generic bases, so a customer who came
                from a specific shelf product needs to see that product here or
                the page reads as "a basic keychain". */}
            {override?.image && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900 p-2.5">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-950">
                  <Image src={override.image} alt={product.label} fill sizes="56px" className="object-cover" unoptimized />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-ink-400">המוצר שבחרת</div>
                  <div className="truncate text-sm font-semibold">{product.label}</div>
                </div>
                {override.href && (
                  <Link href={override.href} className="shrink-0 text-xs font-semibold text-cyan2 hover:underline">
                    לעמוד המוצר
                  </Link>
                )}
              </div>
            )}
            {showCanvas ? (
              <DesignCanvas
                design={design}
                onChange={(d) => update("design", d)}
                faceKind={faceKindFor(product, shape)}
                baseColor={colorObj.hex}
                priceFor={(elId) =>
                  designElementPrice(design, elId, { design: DESIGN_SURCHARGE, extraColor: DESIGN_EXTRA_COLOR })
                }
              />
            ) : (
              <div className="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden">
                <div className="relative aspect-square md:aspect-[4/3] timelapse printer-grid flex items-center justify-center overflow-hidden">
                  <ProductPreview
                    product={product}
                    shape={shape}
                    text={config.text}
                    number={config.number}
                    colorObj={colorObj}
                    fontObj={fontObj}
                    design={config.mode === "design" ? design : null}
                    face={face}
                    modelLabel={modelLabel}
                  />
                  <div className="absolute top-4 right-4 font-mono text-[10px] tracking-widest text-ink-400 flex items-center gap-2" dir="ltr">
                    <span className="w-1.5 h-1.5 bg-cyan2 rounded-full live-dot" />
                    LIVE PREVIEW
                  </div>
                  <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between font-mono text-[10px] text-ink-400" dir="ltr">
                    <span>{face[0]}×{face[1]}mm · ~{timeLabel}</span>
                    <span>FILAMENT · {material.short}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-ink-800 rtl:divide-x-reverse border-t border-ink-800 font-mono text-[11px]" dir="ltr">
                  {/* The name of the thing being designed, not the id of its base. */}
                  <Stat label="מוצר" value={product.label} rtl />
                  <Stat label="מידה" value={`${face[0]}×${face[1]}mm`} />
                  <Stat label="זמן" value={`~${timeLabel}`} />
                  <Stat label="כמות" value={`×${config.qty}`} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5 md:p-6">
            {/* Stepper */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto">
              {steps.map((id, i) => (
                <button key={id} onClick={() => setStep(i)} className="flex-1 min-w-[56px] text-right group">
                  <div className={cn("h-1 rounded-full mb-2 transition-colors", i <= step ? "bg-flame" : "bg-ink-800")} />
                  <div className={cn("font-mono text-[10px] tracking-wider truncate", i === step ? "text-flame" : "text-ink-500")} dir="ltr">
                    {String(i + 1).padStart(2, "0")} · {STEP_LABEL[id]}
                  </div>
                </button>
              ))}
            </div>

            <div className="min-h-[280px]">
              {current === "product" && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">מה מעצבים?</h3>
                  <p className="text-sm text-ink-400 mb-5">בחר מוצר. המחיר הבסיסי כולל טקסט.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CONFIG_PRODUCTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectProduct(p.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3",
                          config.product === p.id ? "border-flame bg-flame/5" : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        {/* The drawing is the icon — every card the same size,
                            the same style, readable at a glance. The real
                            photo rides along in the corner as proof that the
                            thing exists, it does not replace the drawing. */}
                        <span className="relative h-11 w-11 shrink-0">
                          <ProductArt art={p.art} hue={config.product === p.id ? 145 : 210} size={44} />
                          {p.image && (
                            <span className="absolute -bottom-1 -right-1 h-6 w-6 overflow-hidden rounded-md border border-ink-700 bg-ink-950 shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                              <Image src={p.image} alt="" fill sizes="24px" className="object-cover" unoptimized />
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm leading-tight">{p.label}</div>
                          <div className="text-[11px] text-ink-400 leading-snug line-clamp-1">{p.desc}</div>
                          <div className="font-mono text-[11px] text-flame mt-0.5">מ-{fmtILS(priceOf({ id: `cfg-${p.id}`, price: p.basePrice, grams: p.grams, hours: p.hours, material: p.material }))}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {current === "model" && product.models && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">{product.models.label}</h3>
                  <p className="text-sm text-ink-400 mb-5">הקייס מודפס לפי המידות המדויקות של הדגם.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {product.models.items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => update("model", m.id)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border-2 text-right text-sm font-semibold transition-all",
                          config.model === m.id ? "border-flame bg-flame/5" : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {current === "shape" && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">בחר צורת בסיס</h3>
                  <p className="text-sm text-ink-400 mb-5">
                    {product.id === "pet_tag" ? "איזו צורה תלויה על הקולר?" : "מה הצורה הכללית של המחזיק?"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {shapes.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => update("shape", s.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-right transition-all",
                          shape === s.id ? "border-flame bg-flame/5" : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        {/* Draw the real silhouette, not an emoji: on a pet tag
                            the shape IS the product, so the button should look
                            like what comes out of the printer. */}
                        <div className={cn("mb-2", shape === s.id ? "text-flame" : "text-ink-400")}>
                          {product.hasShape && product.shapes ? (
                            <svg viewBox="0 0 64 40" className="h-9 w-16" aria-hidden="true">
                              <path d={facePath(faceKindFor(product, s.id), 64, 40)} fill="currentColor" />
                            </svg>
                          ) : (
                            <span className="text-3xl">{s.icon}</span>
                          )}
                        </div>
                        <div className="font-semibold">{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {current === "text" && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="text-xl font-extrabold">{config.mode === "design" ? "עיצוב חופשי" : "טקסט מותאם"}</h3>
                    {product.hasDesigner && (
                      <div className="inline-flex rounded-lg border border-ink-700 p-0.5 bg-ink-950 shrink-0">
                        {(["text", "design"] as Mode[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => update("mode", m)}
                            className={cn(
                              "px-3 h-8 rounded-md text-xs font-semibold transition-colors",
                              config.mode === m ? "bg-flame text-white" : "text-ink-300 hover:text-ink-50",
                            )}
                          >
                            {m === "text" ? "טקסט מהיר" : "עיצוב חופשי"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {config.mode === "design" && product.hasDesigner ? (
                    <div>
                      <p className="text-sm text-ink-400 mb-4">
                        כמו בפאוורפוינט: טקסט בפונטים שונים, צורות, צבעים. גרור, שנה גודל, סובב. הקנבס הוא בגודל האמיתי של המוצר ({face[0]}×{face[1]}mm).
                      </p>
                      <div className="rounded-xl border border-cyan2/30 bg-cyan2/5 p-3 text-xs text-ink-300 leading-relaxed">
                        <div className="font-semibold text-cyan2 mb-1">איך זה מודפס</div>
                        כל צבע בעיצוב הוא פילמנט נפרד ב-AMS, עד 4 צבעים על מוצר. קווים דקים מ-1mm ואותיות קטנות מ-4mm לא יוצאים חדים, ואני אתאים אותם איתך לפני ההדפסה.
                      </div>
                      <div className="mt-4 font-mono text-[11px] text-ink-400 flex flex-wrap gap-x-3 gap-y-1" dir="ltr">
                        <span>elements: {design.elements.length}</span>
                        <span>colors: {designColors}</span>
                        <span>surcharge: {hasDesign ? `+${fmtILS(DESIGN_SURCHARGE + Math.max(0, designColors - 1) * DESIGN_EXTRA_COLOR)}` : "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-ink-400 mb-5">שם, מספר אישי, או שניהם. עד 12 תווים בכל שדה.</p>
                      <div className="space-y-3 mb-5">
                        <Field label="שורה ראשונה (שם)">
                          <Input value={config.text} onChange={(e) => update("text", e.target.value.slice(0, 12))} placeholder="יואב" />
                        </Field>
                        <Field label="שורה שנייה" optional>
                          <Input value={config.number} onChange={(e) => update("number", e.target.value.slice(0, 14))} placeholder="מספר אישי, יחידה, טלפון" />
                        </Field>
                      </div>
                      <div className="text-sm font-semibold mb-2">פונט</div>
                      <div className="grid grid-cols-3 gap-2">
                        {FONTS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => update("font", f.id)}
                            className={cn(
                              "p-3 rounded-xl border-2 text-center transition-all",
                              config.font === f.id ? "border-flame bg-flame/5" : "border-ink-800 bg-ink-950 hover:border-ink-700",
                            )}
                          >
                            <div
                              style={{ fontFamily: f.css, fontWeight: f.weight, letterSpacing: f.letter || "normal", textTransform: f.upper ? "uppercase" : "none" }}
                              className="text-xl mb-1"
                            >
                              {f.preview}
                            </div>
                            <div className="text-[10px] text-ink-400 font-mono">{f.name}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {current === "color" && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">צבע פילמנט</h3>
                  <p className="text-sm text-ink-400 mb-5">
                    {product.material === "tpu"
                      ? "קייסים מודפסים ב-TPU גמיש. הצבעים שיש לי ב-TPU כרגע:"
                      : `בחר מתוך ${FILAMENTS.length} צבעים שיש לי במלאי כרגע. החומר נקבע לפי הצבע.`}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {colorChoices.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => update("color", f.id)}
                        className={cn("p-2 rounded-xl border-2 transition-all", config.color === f.id ? "border-flame" : "border-ink-800 hover:border-ink-700")}
                      >
                        <div className="aspect-square rounded-lg mb-1.5 relative overflow-hidden" style={{ backgroundColor: f.hex }}>
                          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)" }} />
                          {config.color === f.id && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-flame text-white flex items-center justify-center">
                              <Icon name="check" size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold leading-tight truncate">{f.name}</div>
                        <div className="text-[9px] font-mono text-ink-500 truncate" dir="ltr">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-ink-400">
                    חומר: <span className="text-ink-100 font-semibold">{material.name}</span>
                    {matSurcharge > 0 && <span className="font-mono text-flame"> (+{fmtILS(matSurcharge)})</span>}
                    <span className="text-ink-500"> · {material.desc}</span>
                  </div>
                </div>
              )}

              {current === "size" && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">גודל</h3>
                  <p className="text-sm text-ink-400 mb-5">המידות וזמן ההדפסה משוערים. המחיר משתנה בהתאם.</p>
                  <div className="space-y-2">
                    {sizes.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => update("size", s.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 flex items-center gap-4 text-right transition-all",
                          config.size === s.id ? "border-flame bg-flame/5" : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold", config.size === s.id ? "border-flame bg-flame text-white" : "border-ink-700 text-ink-400")}>
                          {s.label.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{s.label}</div>
                          <div className="font-mono text-xs text-ink-400" dir="ltr">{s.dim} · ~{s.time}</div>
                        </div>
                        <div className="font-mono font-bold text-flame">{s.priceAdd > 0 ? `+${fmtILS(s.priceAdd)}` : "כלול"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {current === "qty" && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">כמה לעשות?</h3>
                  <p className="text-sm text-ink-400 mb-5">הזמנות מעל 5: הנחה של 10% אוטומטית. הזמנות לטקסים או לעסק, דבר איתי בוואטסאפ.</p>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => update("qty", Math.max(1, config.qty - 1))} aria-label="הפחת" className="w-12 h-12 rounded-xl bg-ink-800 hover:bg-ink-700 flex items-center justify-center">
                      <Icon name="minus" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="font-mono text-6xl font-bold tabular-nums" dir="ltr">{config.qty}</div>
                      <div className="text-xs text-ink-400">יחידות</div>
                    </div>
                    <button onClick={() => update("qty", config.qty + 1)} aria-label="הוסף" className="w-12 h-12 rounded-xl bg-ink-800 hover:bg-ink-700 flex items-center justify-center">
                      <Icon name="plus" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 5, 10].map((n) => (
                      <button key={n} onClick={() => update("qty", n)} className={cn("h-9 rounded-lg font-mono font-semibold", config.qty === n ? "bg-flame text-white" : "bg-ink-800 text-ink-300 hover:bg-ink-700")}>
                        ×{n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-ink-800">
              <Btn variant="ghost" icon="arrowRight" onClick={goPrev} disabled={step === 0}>הקודם</Btn>
              {step < steps.length - 1 ? (
                <Btn variant="primary" iconRight="arrowLeft" onClick={goNext} className="flex-1">המשך</Btn>
              ) : (
                <Btn variant="primary" iconRight="arrowLeft" onClick={proceed} className="flex-1">המשך לטופס</Btn>
              )}
            </div>
          </div>

          {/* Price summary */}
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-bl from-flame/10 to-cyan2/5 border border-flame/20">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold text-ink-300">מחיר משוער</span>
              <span className="font-mono text-[11px] text-ink-400" dir="ltr">
                {unitPrice} × {config.qty}{discount ? " − 10%" : ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight">{fmtILS(totalPrice)}</span>
              <div className="flex gap-1.5">
                {hasDesign && <Pill tone="cyan">עיצוב חופשי</Pill>}
                {config.qty >= 5 && <Pill tone="good">הנחת כמות</Pill>}
              </div>
            </div>
            <div className="text-xs text-ink-400 mt-2">משלוח ייחושב בשיחה. הזמנות מעל ₪200, חינם.</div>
          </div>

          {adminUnlocked && (
            <div className="mt-3 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 font-mono text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] tracking-wider mb-1">
                <Icon name="settings" size={11} />
                ADMIN · עלות ייצור ליחידה
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">{material.short} · ~{cost.gramsUsed}g · ~{hours}h</span>
                <span>{fmtILS(Math.round(cost.unitCost * 10) / 10)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-amber-400">מרווח</span>
                <span className={cn((cost.margin ?? 0) >= 0.6 ? "text-emerald-400" : (cost.margin ?? 0) >= 0.4 ? "text-amber-300" : "text-red-400")}>
                  {((cost.margin ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** `rtl` for a Hebrew value inside the LTR measurements strip. */
function Stat({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return (
    <div className="px-4 py-3 min-w-0" dir={rtl ? "rtl" : undefined}>
      <div className="text-ink-500">{label}</div>
      <div className="text-ink-100 font-semibold truncate">{value}</div>
    </div>
  );
}
