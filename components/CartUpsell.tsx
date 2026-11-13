"use client";
import { useMemo } from "react";
import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { FIDGETS } from "@/lib/data";
import { fidgetGrams } from "@/lib/products";
import { parseHours } from "@/lib/costing";
import type { useLivePricer } from "@/lib/live-price";
import { useOrderStore, type CartItem } from "@/lib/order-store";
import type { Fidget } from "@/lib/types";
import { heName } from "@/lib/he-names";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useExit, usePauseBehind } from "@/lib/use-exit";
import { GiftProgress } from "@/components/gift/Gift";

/** Small enough to add without thinking about it. */
const MAX_PRICE = 35;
const SHOWN = 4;

export type UpsellPick = { f: Fidget; price: number };

/**
 * What to offer: cheap, popular, photographed, and not already in the cart.
 * Picked once, when the sheet opens, so the cards don't reshuffle as the
 * customer adds them. Empty means the sheet isn't shown at all.
 */
export function pickUpsell(items: CartItem[], priceOf: ReturnType<typeof useLivePricer>): UpsellPick[] {
  const inCart = new Set(items.map((it) => it.meta?.fidgetId).filter(Boolean));
  return FIDGETS.filter((f) => f.thumbnail && !inCart.has(f.id))
    .map((f) => ({ f, price: priceOf({ id: f.id, price: f.price, grams: fidgetGrams(f), hours: parseHours(f.time) }) }))
    .filter((x) => x.price > 0 && x.price <= MAX_PRICE)
    .sort((a, b) => (b.f.downloads ?? 0) - (a.f.downloads ?? 0))
    .slice(0, SHOWN);
}

/**
 * "Anything else?" — the moment before the order goes out, when the customer
 * has already decided to buy and a small extra costs them one tap. Only cheap,
 * well-liked prints with a real photograph, never something already in the
 * cart, and it travels in the same parcel, so the extra carries no shipping.
 *
 * Shown once per visit to the form: a second time is nagging.
 */
export default function CartUpsell({ picks, onContinue, onClose }: { picks: UpsellPick[]; onContinue: () => void; onClose: () => void }) {
  const { items, addItem, removeItem } = useOrderStore();
  const { closing, close } = useExit();
  usePauseBehind(true);
  const added = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) if (it.meta?.upsell && typeof it.meta.fidgetId === "string") m.set(it.meta.fidgetId, it.id);
    return m;
  }, [items]);
  const total = items.every((it) => it.price != null) ? items.reduce((s, it) => s + (it.price ?? 0), 0) : null;

  const toggle = (p: UpsellPick) => {
    const cartId = added.get(p.f.id);
    if (cartId) { removeItem(cartId); return; }
    addItem({
      title: heName(p.f.id, p.f.name),
      summary: [`פידג'ט: ${heName(p.f.id, p.f.name)}`, `גודל: ${p.f.size}`, `זמן הדפסה: ${p.f.time}`, "צבע: כמו בתמונה"],
      price: p.price,
      source: "fidgets",
      meta: { fidgetId: p.f.id, qty: 1, baseUnitPrice: p.price, upsell: true },
    });
  };

  return (
    <div
      data-closing={closing || undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
    >
      <div className="m-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => close(onClose)} />
      <div className="m-sheet m-sm-pop relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-ink-900 border border-ink-700 p-5 sm:p-6 space-y-4">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-ink-700 sm:hidden" />
        <div className="text-center">
          <div className="text-xs font-bold text-flame">רגע לפני שמסיימים</div>
          <h2 id="upsell-title" className="text-2xl font-extrabold mt-1">להוסיף משהו קטן?</h2>
          <p className="text-sm text-ink-300 mt-1">נשלח באותה חבילה, <b className="text-good">בלי משלוח נוסף</b>.</p>
        </div>

        <div className="m-stagger grid grid-cols-2 gap-3">
          {picks.map((p, i) => {
            const on = added.has(p.f.id);
            return (
              <button
                key={p.f.id}
                type="button"
                onClick={() => toggle(p)}
                aria-pressed={on}
                style={{ "--i": i + 2 } as React.CSSProperties}
                className={cn(
                  "group relative text-right rounded-2xl border-2 overflow-hidden bg-ink-950 transition-all active:scale-[0.97]",
                  on ? "border-good shadow-[0_0_0_4px_rgba(8,154,71,0.2)]" : "border-ink-800 hover:border-ink-600",
                )}
              >
                <div className="relative aspect-[4/3]">
                  <Image src={p.f.thumbnail!} alt="" fill sizes="(max-width: 640px) 45vw, 260px" className="object-cover" unoptimized />
                  <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[13px] font-bold text-white">
                    <bdi>{fmtILS(p.price)}</bdi>
                  </span>
                </div>
                <div className="p-2.5 space-y-2">
                  <div className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[2.5em]">{heName(p.f.id, p.f.name)}</div>
                  <div
                    className={cn(
                      "h-9 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold transition-colors",
                      on ? "bg-good text-ink-950" : "bg-ink-800 text-ink-100 group-hover:bg-ink-700",
                    )}
                  >
                    {/* The two icons cross-fade through a blur instead of swapping. */}
                    <span className="relative h-4 w-4">
                      <Icon name="plus" size={16} strokeWidth={3} className={cn("absolute inset-0 transition-[opacity,transform,filter] duration-200 ease-[var(--ease-out)]", on ? "opacity-0 scale-50 blur-[2px]" : "opacity-100")} />
                      <Icon name="check" size={16} strokeWidth={3} className={cn("absolute inset-0 transition-[opacity,transform,filter] duration-200 ease-[var(--ease-out)]", on ? "opacity-100" : "opacity-0 scale-50 blur-[2px]")} />
                    </span>
                    {on ? "נוסף" : "הוספה"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <GiftProgress compact />

        <div className="flex items-center justify-between rounded-xl bg-ink-950/60 border border-ink-800 px-4 py-2.5 text-sm">
          <span className="text-ink-400">בסל עכשיו · {items.length} {items.length === 1 ? "פריט" : "פריטים"}</span>
          {total != null && <span className="font-mono font-bold"><bdi>{fmtILS(total)}</bdi></span>}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full h-14 rounded-2xl bg-[#089a47] hover:bg-[#0bb455] text-white text-lg font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
        >
          {added.size ? "המשך לסיום ההזמנה" : "לא תודה, להמשיך"}
          <Icon name="arrowLeft" size={20} />
        </button>
      </div>
    </div>
  );
}
