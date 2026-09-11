"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductArt from "@/components/ProductArt";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";
import { MATERIAL_BY_ID } from "@/lib/materials";
import { CATEGORY_LABEL } from "@/lib/products";
import { cn } from "@/lib/cn";
import { useAdminStore } from "@/lib/admin-store";
import { DEFAULT_MATERIAL } from "@/lib/inventory";
import { canPrint, startingMaterial } from "@/lib/offer";
import { useFilaments, useMaterials } from "@/lib/palette";
import { useLivePrice, useQuoteOnly } from "@/lib/live-price";
import { clipSrc } from "@/lib/assets";
import { designHref, isPersonalizable } from "@/lib/designable";
import RestockModal from "@/components/RestockModal";
import type { MaterialId, Product, ProductArtId } from "@/lib/types";

/** One card in any listing. Products, fidgets and configurator picks all map onto this. */
export type ListingCard = {
  id: string;
  /** The catalogue id used for admin overrides — `id` may be prefixed for React keys. */
  itemId?: string;
  href: string;
  name: string;
  desc: string;
  price: number;
  size: string;
  time: string;
  /** Print weight / time — needed so the card can follow automatic pricing. */
  grams: number;
  hours: number;
  hue: number;
  art?: ProductArtId;
  image?: string;
  tag?: string;
  category: string;
  materialShort?: string;
  /** Which filament family it needs — drives the out-of-stock state. */
  material?: MaterialId;
  /** Deep link into /configurator. Set on anything the customer personalises. */
  designHref?: string;
  /** true = the shop sells this with the customer's own text on it. */
  personalizable?: boolean;
  colors: number;
  rating: number;
  orders: number;
  isNew?: boolean;
};

export function productToCard(p: Product): ListingCard {
  return {
    id: p.id,
    href: `/products/${p.id}`,
    name: p.name,
    desc: p.desc,
    price: p.price,
    size: p.size,
    time: p.time,
    grams: p.grams,
    hours: p.hours,
    hue: p.hue,
    art: p.art,
    image: p.image,
    tag: p.tag,
    category: CATEGORY_LABEL[p.category],
    materialShort: p.material ? MATERIAL_BY_ID[p.material].short : undefined,
    material: p.material,
    designHref: designHref(p),
    personalizable: isPersonalizable(p),
    colors: p.colors ?? (p.ams ? 2 : 1),
    rating: p.rating ?? 4.8,
    orders: p.orders ?? 0,
    isNew: p.isNew,
  };
}

export function ListingCardView({ c }: { c: ListingCard }) {
  const stock = useAdminStore((s) => s.stock);
  const [askRestock, setAskRestock] = useState(false);
  // Personalised products only: a click picks the card, and the footer button
  // then opens the designer. Landing inside an editor because you tapped a
  // photograph is a jump worth asking about first — an ordinary product page
  // is not, and opens on the first click.
  const [picked, setPicked] = useState(false);
  // The designer's clip, where one exists. It plays while the pointer is on
  // the card and rewinds when it leaves — the way MakerWorld shows a fidget
  // actually clicking, which no still photograph manages.
  const clip = clipSrc(c.itemId ?? c.id);
  const clipEl = useRef<HTMLVideoElement>(null);
  const hover = clip
    ? {
        onMouseEnter: () => clipEl.current?.play().catch(() => {}),
        onMouseLeave: () => {
          const v = clipEl.current;
          if (!v) return;
          v.pause();
          v.currentTime = 0;
        },
      }
    : {};
  const materials = useMaterials();
  const palette = useFilaments();
  const material = c.material ?? DEFAULT_MATERIAL;
  // A silk model is not out of stock while plain PLA is on the shelf.
  const inStock = canPrint(materials, stock, palette, material);
  // What the waiting list should actually name if it IS out.
  const wouldUse = startingMaterial(materials, stock, palette, material);
  // The shelf price follows /admin, so a margin change moves every card at once.
  const priceable = { id: c.itemId ?? c.id, price: c.price, grams: c.grams, hours: c.hours, material, colors: c.colors };
  const price = useLivePrice(priceable);
  // Heavy pieces are quoted, not priced — see MADE_TO_ORDER_FROM.
  const quoteOnly = useQuoteOnly(priceable);

  const shell =
    "group flex flex-col rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth overflow-hidden text-right";

  /** Pick the card without leaving the page. */
  const pick = { onClick: () => setPicked(true), role: "button", tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(true); }
    } } as const;
  const ring = picked ? "border-flame/60 ring-1 ring-flame/40" : "";

  const body = (
    <>
      <div
        className="relative aspect-square flex items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 40%, hsla(${c.hue}, 70%, 50%, 0.22), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
        }}
      >
        {c.image ? (
          /* Full bleed. Letterboxed photos left the shop looking like a row of
             stamps on a striped board — the owner wants the picture and not
             its edges, so the image fills the square and is cropped from the
             centre, where the model sits in a product shot. */
          <>
            <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover object-center transition-transform duration-500 group-hover:scale-105" unoptimized />
            {clip && (
              <>
                <video
                  ref={clipEl}
                  className="absolute inset-0 h-full w-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  src={clip}
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-hidden
                />
                {/* Says there is something to hover over, on a touch screen too. */}
                <span className="absolute bottom-2 left-2 z-[1] inline-flex items-center gap-1 rounded-md bg-ink-950/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-semibold text-ink-100 group-hover:opacity-0 transition-opacity">
                  <Icon name="play" size={9} />
                  וידאו
                </span>
              </>
            )}
          </>
        ) : (
          <ProductArt art={c.art ?? "keychain"} hue={c.hue} size={150} className="transition-transform duration-500 group-hover:scale-105" />
        )}
        {c.tag && (
          <span className="absolute top-2 left-2">
            <Pill tone="flame" className="text-[10px] px-1.5 py-0.5">{c.tag}</Pill>
          </span>
        )}
        <span className="absolute top-2 right-2">
          <Pill tone="neutral" className="text-[10px] px-1.5 py-0.5">{c.category}</Pill>
        </span>
        {c.colors > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border backdrop-blur bg-cyan2/15 text-cyan2 border-cyan2/40" dir="ltr">
            AMS · {c.colors}C
          </span>
        )}
        {c.personalizable && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border backdrop-blur bg-flame/20 text-flame border-flame/50">
            <Icon name="sparkles" size={9} />
            עיצוב אישי
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-sm leading-tight" dir={/[א-ת]/.test(c.name) ? "rtl" : "ltr"}>{c.name}</h3>
        <p className="text-ink-400 text-xs leading-snug mt-1 line-clamp-2 min-h-[2.5rem]">{c.desc}</p>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-ink-500" dir="ltr">
          <span>{c.size}</span>
          <span>·</span>
          <span>{c.time}</span>
          {c.materialShort && (
            <>
              <span>·</span>
              <span>{c.materialShort}</span>
            </>
          )}
        </div>
        <div className="mt-auto" />
      </div>
    </>
  );

  const priceRow = quoteOnly ? (
    <span className="text-flame text-sm font-bold">לפי הזמנה</span>
  ) : (
    <span className="font-mono text-flame text-sm" dir="ltr">{fmtILS(price)}</span>
  );

  // Out of filament: the card greys out, says so, and opens the waiting list
  // instead of a product page you cannot order from.
  if (!inStock) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAskRestock(true)}
          className={cn(shell, "h-full relative grayscale opacity-60 hover:opacity-90")}
        >
          {body}
          <div className="px-3 pb-3 flex items-center justify-between">
            {priceRow}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-400">
              <Icon name="clock" size={12} />
              עדכנו אותי
            </span>
          </div>
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center px-2">
            <span className="inline-block px-2.5 py-1 rounded-lg bg-ink-950/85 border border-ink-700 text-[11px] font-bold text-ink-100 backdrop-blur">
              המוצר אינו זמין כרגע
            </span>
          </span>
        </button>
        <RestockModal
          open={askRestock}
          onClose={() => setAskRestock(false)}
          itemId={c.itemId ?? c.id}
          itemName={c.name}
          material={wouldUse}
        />
      </>
    );
  }

  // Personalised products open the designer, because writing the name on it IS
  // the purchase. The product page stays one click away on the "פרטים" link —
  // it can't be nested inside the card link, so the footer sits outside it.
  if (c.personalizable && c.designHref) {
    return (
      <div className={cn(shell, "h-full", ring)} {...hover}>
        <div className="flex flex-col flex-1 cursor-pointer" {...pick}>
          {body}
        </div>
        <div className="px-3 pb-3 flex items-center justify-between gap-1.5">
          {priceRow}
          <div className="flex items-center gap-1">
            <Link
              href={c.href}
              className="px-2 py-1 rounded-md text-[11px] font-semibold text-ink-400 border border-ink-800 hover:border-ink-600 hover:text-ink-200 transition-colors"
            >
              פרטים
            </Link>
            <Link
              href={c.designHref}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors",
                picked
                  ? "bg-flame-600 text-white border-flame"
                  : "bg-flame/15 text-flame border-flame/40 hover:bg-flame-600 hover:text-white",
              )}
            >
              <span className="hidden sm:inline">{picked ? "המשך לעיצוב" : "עצב עכשיו"}</span>
              <span className="sm:hidden">עצב</span>
              <Icon name="arrowLeft" size={11} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // An ordinary product opens on one click. Only the designer asks first —
  // being dropped into an editor is a bigger jump than opening a page.
  return (
    <Link href={c.href} className={cn(shell, "h-full")} {...hover}>
      {body}
      <div className="px-3 pb-3 flex items-center justify-between">
        {priceRow}
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-300 group-hover:text-flame transition-colors">
          {quoteOnly ? "בקש הצעה" : "לפרטים"}
          <Icon name="arrowLeft" size={12} />
        </span>
      </div>
    </Link>
  );
}

/** Six full rows on a wide screen — enough to browse, few enough to load. */
const PER_PAGE = 24;

export default function ProductGrid({ cards }: { cards: ListingCard[] }) {
  const [page, setPage] = useState(0);

  if (!cards.length) {
    return <div className="text-center py-16 text-ink-400">אין מוצרים שמתאימים לסינון הזה.</div>;
  }

  // Clamped rather than reset in an effect: narrowing a filter must not leave
  // the grid parked on a page that no longer exists.
  const pages = Math.ceil(cards.length / PER_PAGE);
  const at = Math.min(page, pages - 1);
  const shown = cards.slice(at * PER_PAGE, at * PER_PAGE + PER_PAGE);

  const go = (to: number) => {
    setPage(to);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {shown.map((c) => (
          <ListingCardView key={c.id} c={c} />
        ))}
      </div>

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="דפדוף">
          <button
            type="button"
            onClick={() => go(at - 1)}
            disabled={at === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100 disabled:opacity-35 disabled:hover:border-ink-800 transition-colors"
          >
            הקודם
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-current={i === at ? "page" : undefined}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-bold transition-colors",
                i === at ? "bg-flame-600 text-white" : "text-ink-400 border border-ink-800 hover:border-ink-600 hover:text-ink-100",
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(at + 1)}
            disabled={at === pages - 1}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100 disabled:opacity-35 disabled:hover:border-ink-800 transition-colors"
          >
            הבא
          </button>
        </nav>
      )}
    </>
  );
}
