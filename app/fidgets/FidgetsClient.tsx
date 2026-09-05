"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import Emblem from "@/components/Emblem";
import { FIDGETS } from "@/lib/data";
import { fidgetStats } from "@/lib/products";
import ProductToolbar from "@/components/ProductToolbar";
import { applyListing, DEFAULT_LISTING, fmtOrders, type ListingState } from "@/lib/listing";
import { fidgetKind, FIDGET_KIND_TABS, FIDGET_KIND_LABEL, type FidgetKindFilter } from "@/lib/fidget-kind";
import { useOrderStore } from "@/lib/order-store";
import { fmtILS } from "@/lib/format";
import { useLivePrice } from "@/lib/live-price";
import { fidgetGrams } from "@/lib/products";
import { parseHours } from "@/lib/costing";
import { cn } from "@/lib/cn";
import type { Fidget, FidgetSource } from "@/lib/types";

// Display names for the upstream model sources.
const SOURCE_LABEL: Record<FidgetSource, string> = {
  makerworld: "MakerWorld",
  thingiverse: "Thingiverse",
  printables: "Printables",
  myminifactory: "MyMiniFactory",
};

function FidgetCard({
  f,
  onAdd,
}: {
  f: Fidget;
  onAdd: (id: string, variantId?: string) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [variantId, setVariantId] = useState<string | undefined>(
    f.variants && f.variants.length > 0 ? f.variants[0].id : undefined,
  );

  const variant =
    f.variants && variantId
      ? f.variants.find((v) => v.id === variantId) ?? f.variants[0]
      : undefined;

  const displayThumb = variant?.thumbnail ?? f.thumbnail;
  const basePrice = useLivePrice({ id: f.id, price: f.price, grams: fidgetGrams(f), hours: parseHours(f.time) });
  const displayPrice = basePrice + (variant?.surcharge ?? 0);
  const displayTime = variant?.time ?? f.time;
  const displayColors = variant?.colors ?? 1;
  const showImage = displayThumb && !imgFailed;
  const hasVariants = !!f.variants && f.variants.length > 1;

  return (
    <article className="group flex flex-col rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth overflow-hidden">
      <div
        className="relative aspect-square overflow-hidden"
        style={
          showImage
            ? undefined
            : {
                background: `radial-gradient(circle at 50% 40%, hsla(${f.hue}, 70%, 50%, 0.22), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
              }
        }
      >
        {showImage ? (
          <Image
            key={displayThumb}
            src={displayThumb!}
            alt={f.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 stripes flex items-center justify-center">
            <Emblem shape={f.shape} hue={f.hue} size={110} className="spin-y" />
          </div>
        )}

        {/* License badge — top right */}
        {f.license && (
          <span
            className={cn(
              "absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border backdrop-blur",
              f.license === "CC0"
                ? "bg-good/20 text-good border-good/40"
                : "bg-ink-950/70 text-ink-100 border-ink-50/20",
            )}
            dir="ltr"
            title={
              f.license === "CC0"
                ? "Public Domain"
                : f.license === "Bambu-Open"
                  ? "Bambu Creator's Open License"
                  : "Creative Commons Attribution"
            }
          >
            {f.license === "Bambu-Open" ? "OPEN" : f.license}
          </span>
        )}

        {/* AMS / colors badge — top left, below tag */}
        {(f.ams || displayColors > 1) && (
          <span
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border backdrop-blur bg-cyan2/15 text-cyan2 border-cyan2/40"
            dir="ltr"
            title="Multi-color AMS print"
          >
            AMS · {displayColors}C
          </span>
        )}

        {/* Custom tag — top left */}
        {f.tag && (
          <span className="absolute top-2 left-2">
            <Pill tone="flame" className="text-[10px] px-1.5 py-0.5">
              {f.tag}
            </Pill>
          </span>
        )}

        {/* Hover overlay → our own product page */}
        <Link
          href={`/fidgets/${f.id}`}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-ink-950/70 flex flex-col items-center justify-center gap-1.5 text-ink-100"
          aria-label={`לעמוד המוצר של ${f.name}`}
        >
          <Icon name="expand" size={20} className="text-flame" />
          <span className="font-mono text-[10px] tracking-widest uppercase">צבע · חומר · AMS</span>
        </Link>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-sm leading-tight line-clamp-1" dir="ltr" title={f.name}>
          <Link href={`/fidgets/${f.id}`} className="hover:text-flame transition-colors">{f.name}</Link>
        </h3>
        <p className="text-ink-400 text-xs leading-snug mt-1 line-clamp-2 min-h-[2.5rem]">
          {f.desc}
        </p>

        {/* Spec strip */}
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-ink-500" dir="ltr">
          <span>{f.size}</span>
          <span>·</span>
          <span>{displayTime}</span>
          {typeof f.downloads === "number" && (
            <>
              <span>·</span>
              <span title="downloads">
                {f.downloads >= 1000 ? `${(f.downloads / 1000).toFixed(1)}k` : f.downloads}↓
              </span>
            </>
          )}
        </div>

        {/* Shelf · rating · orders */}
        {(() => {
          const st = fidgetStats(f);
          return (
            <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-ink-400">
              <span className="px-1.5 py-0.5 rounded bg-ink-800 text-ink-300 font-sans font-semibold">
                {FIDGET_KIND_LABEL[fidgetKind(f)]}
              </span>
              <span className="inline-flex items-center gap-0.5 text-flame">
                <Icon name="star" size={10} className="fill-current" />
                <bdi dir="ltr">{st.rating.toFixed(1)}</bdi>
              </span>
              <span>·</span>
              <span><bdi dir="ltr">{fmtOrders(st.orders)}</bdi> הזמנות</span>
            </div>
          );
        })()}

        {/* Variant dropdown */}
        {hasVariants && f.variants && (
          <div className="mt-2 relative">
            <select
              value={variantId}
              onChange={(e) => {
                setVariantId(e.target.value);
                setImgFailed(false);
              }}
              aria-label="בחר וריאנט הדפסה"
              className="w-full h-8 pr-2 pl-7 rounded-md bg-ink-950 border border-ink-700 text-ink-100 text-xs focus:border-flame outline-none transition-colors appearance-none cursor-pointer"
              dir="rtl"
            >
              {f.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {v.surcharge > 0 ? ` (+${v.surcharge}₪)` : ""}
                </option>
              ))}
            </select>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-ink-400">
              <Icon name="chevDown" size={12} />
            </div>
          </div>
        )}

        {/* Creator credit (attribution only — the source link is on the product page) */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {f.creator ? (
            <span className="text-[10px] text-ink-500 truncate min-w-0" dir="ltr" title={`by ${f.creator}${f.source ? ` on ${SOURCE_LABEL[f.source]}` : ""}`}>
              by {f.creator}{f.license ? ` · ${f.license}` : ""}
            </span>
          ) : (
            <span />
          )}
        </div>

        {/* Price + add */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-flame text-sm" dir="ltr">
              {fmtILS(displayPrice)}
            </span>
            {variant && variant.surcharge > 0 && (
              <span className="font-mono text-[10px] text-ink-500 line-through" dir="ltr">
                {fmtILS(basePrice)}
              </span>
            )}
          </div>
          <button
            onClick={() => onAdd(f.id, variantId)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-ink-800 hover:bg-flame hover:text-white text-xs font-semibold transition-colors"
          >
            <Icon name="plus" size={12} />
            הוסף
          </button>
        </div>
      </div>
    </article>
  );
}

export default function FidgetsClient() {
  const [listing, setListing] = useState<ListingState>(DEFAULT_LISTING);
  const [kind, setKind] = useState<FidgetKindFilter>("all");
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);

  // Split the shelf before filtering, so the toolbar's counter reflects the
  // tab you are actually looking at.
  const pool = useMemo(() => {
    // A card with no photograph is not shown — see productsByCategory.
    const withPhoto = FIDGETS.filter((f) => !!(f.thumbnail ?? f.images?.[0]));
    return kind === "all" ? withPhoto : withPhoto.filter((f) => fidgetKind(f) === kind);
  }, [kind]);

  const items = useMemo(() => {
    const withStats = pool.map((f) => ({
      ...f,
      ...fidgetStats(f),
      // Sort/filter on the price the card actually shows (default variant).
      price: f.price + (f.variants?.[0]?.surcharge ?? 0),
      isNew: f.tag === "חדש",
    }));
    return applyListing(withStats, listing);
  }, [pool, listing]);

  const addToOrder = (id: string, variantId?: string) => {
    const f = FIDGETS.find((x) => x.id === id);
    if (!f) return;
    const variant = variantId && f.variants ? f.variants.find((v) => v.id === variantId) : undefined;
    const finalPrice = f.price + (variant?.surcharge ?? 0);
    const finalTime = variant?.time ?? f.time;
    const lines = [
      `פידג'ט: ${f.name}`,
      `גודל: ${f.size}`,
      `זמן הדפסה: ${finalTime}`,
    ];
    if (variant) {
      lines.push(`וריאנט: ${variant.label}`);
      if (variant.colors > 1) {
        lines.push(`הדפסה ב-${variant.colors} צבעים (AMS)`);
      }
    }
    if (f.creator && f.source) {
      lines.push(`עיצוב מקורי: ${f.creator} · ${SOURCE_LABEL[f.source]}${f.license ? ` (${f.license})` : ""}`);
    }
    setOrder({
      title: f.name + (variant && f.variants && f.variants.length > 1 ? ` · ${variant.label}` : ""),
      summary: lines,
      price: finalPrice,
      source: "fidgets",
      meta: { fidgetId: id, variantId, license: f.license, sourceUrl: f.sourceUrl },
    });
    router.push("/contact");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">
          פלקסי ופידג&apos;טים · ANTI-BOREDOM
        </Pill>
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.15] mb-3">
          שני מדפים. אותה מדפסת.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          <strong className="text-ink-100">פלקסי</strong> — יצורים מפרקיים שיוצאים מהמדפסת כשהם כבר זזים, בלי דבק ובלי הרכבה.
          <strong className="text-ink-100"> פידג&apos;טים</strong> — ספינרים, קוביות אינסוף, סליידרים וכפתורים.
          כל הדגמים מבוססים על קבצים פתוחים (CC0 או CC-BY), עם קרדיט ליוצרים.
        </p>
      </header>

      {/* ── Flexi / fidget shelves ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FIDGET_KIND_TABS.map((t) => {
          const withPhoto = FIDGETS.filter((f) => !!(f.thumbnail ?? f.images?.[0]));
          const count = t.id === "all" ? withPhoto.length : withPhoto.filter((f) => fidgetKind(f) === t.id).length;
          const active = kind === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setKind(t.id)}
              title={t.hint}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold border transition-colors",
                active
                  ? "bg-flame text-white border-flame"
                  : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
              )}
            >
              {t.label}
              <span className={cn("mr-1.5 font-mono text-[11px]", active ? "text-white/70" : "text-ink-500")} dir="ltr">
                {count}
              </span>
            </button>
          );
        })}
        <span className="text-xs text-ink-500 mr-2 hidden sm:inline">
          {FIDGET_KIND_TABS.find((t) => t.id === kind)?.hint}
        </span>
      </div>

      <ProductToolbar state={listing} onChange={setListing} shown={items.length} total={pool.length} />

      {/* Custom fidget banner */}
      <Link
        href="/configurator"
        className="block mb-8 p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2">
            <Icon name="sparkles" size={20} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">פידג&apos;ט בהזמנה אישית</div>
            <div className="text-sm text-ink-300">
              חשבת על משהו ספציפי? עיצוב מותאם תוך 48 שעות.
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">
            כנס למעצב
            <Icon name="arrowLeft" size={14} />
          </span>
        </div>
      </Link>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((f) => (
          <FidgetCard key={f.id} f={f} onAdd={addToOrder} />
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-ink-400">
          אין דגמים תואמים לסינון הזה.
        </div>
      )}

      {/* Why fidgets */}
      <section className="mt-16 p-6 md:p-8 rounded-2xl bg-ink-900 border border-ink-800">
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-3">
          למה פידג&apos;טים
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">
          למה זה עובד.
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { t: "הדפסה אחת", d: "כל פיגורה מודפסת בחתיכה אחת — בלי דבק, בלי הרכבה, בלי חלקים שנופלים." },
            { t: "מתנה מנצחת", d: "פיגורה שיוצרת שיחה. סטוקינג סטאפר. גימיק לשולחן בעבודה." },
            { t: "זמן הדפסה קצר", d: "פיגורות יוצאות תוך 1-4 שעות. שולחים תוך יומיים." },
          ].map((b) => (
            <div key={b.t} className="p-4 rounded-xl border border-ink-800 bg-ink-950/40">
              <div className="font-bold mb-1.5">{b.t}</div>
              <div className="text-sm text-ink-400 leading-relaxed">{b.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Attribution / credits */}
      <section className="mt-10 p-5 rounded-2xl border border-ink-800 bg-ink-900/60">
        <div className="flex items-start gap-3">
          <Icon name="info" size={18} className="text-cyan2 shrink-0 mt-0.5" />
          <div className="text-sm text-ink-300 leading-relaxed">
            <strong className="text-ink-100">קרדיט ליוצרים.</strong> כל הדגמים
            כאן מבוססים על קבצים פתוחים שעלו ע&quot;י מעצבים מהקהילה — Thingiverse,
            Printables, MyMiniFactory. דגמי <span className="font-mono text-good">CC0</span> בנחלת הכלל,
            דגמי <span className="font-mono">CC-BY</span> חופשיים בכפוף לקרדיט (שמופיע ליד כל דגם).
            לחץ על שם היוצר כדי להגיע לעמוד המקור.
          </div>
        </div>
      </section>
    </div>
  );
}
