"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useOrderStore } from "@/lib/order-store";
import { GIFT, giftMissing, giftTotal, isGift, useGiftStore } from "@/lib/gift";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Keeps the gift line in step with the cart, and raises the moments the
 * customer should see: a celebration when the gift unlocks, a short "₪X to go"
 * hint when the total moves while still short. Mounted once, in the layout.
 */
export function GiftWatcher() {
  const items = useOrderStore((s) => s.items);
  const addItem = useOrderStore((s) => s.addItem);
  const removeItem = useOrderStore((s) => s.removeItem);
  const fire = useGiftStore((s) => s.fire);
  const nudge = useGiftStore((s) => s.nudge);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const total = giftTotal(items);
    const gift = items.find(isGift);
    const before = prev.current;
    prev.current = total;
    if (total >= GIFT.threshold && !gift) {
      addItem({ title: `מתנה: ${GIFT.title}`, summary: [GIFT.line], price: 0, source: "fidgets", meta: { gift: true, qty: 1, baseUnitPrice: 0 } });
      if (before !== null && before < GIFT.threshold) fire();
    } else if (total < GIFT.threshold && gift) {
      removeItem(gift.id);
    }
    if (before !== null && total !== before && total > 0 && total < GIFT.threshold) nudge();
  }, [items, addItem, removeItem, fire, nudge]);

  return <GiftCelebration />;
}

/** The bar: how far to the gift, the gift waiting at its end. */
export function GiftProgress({ compact }: { compact?: boolean }) {
  const items = useOrderStore((s) => s.items);
  const total = giftTotal(items);
  if (total <= 0) return null;
  const missing = giftMissing(items);
  const done = missing === 0;
  const pct = Math.min(100, (total / GIFT.threshold) * 100);
  return (
    <div className={cn("gift-prog rounded-2xl border px-4", compact ? "py-2.5" : "py-3.5", done ? "border-[#3b82f6]/60 bg-[#3b82f6]/15" : "border-[#3b82f6]/35 bg-[#3b82f6]/[0.07]")}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold">
          {done
            ? <>יש! <span className="text-[#6aa8ff]">{GIFT.title} עלינו</span></>
            : <>עוד <bdi className="text-[#6aa8ff] tabular-nums">{fmtILS(Math.ceil(missing))}</bdi> ומקבלים מתנה מאיתנו</>}
        </span>
        <span className="text-[11px] text-ink-400 tabular-nums"><bdi>{fmtILS(Math.round(total))}</bdi> / <bdi>{fmtILS(GIFT.threshold)}</bdi></span>
      </div>
      <div className="relative mt-2.5 h-3 rounded-full bg-white/10">
        <div className={cn("gift-fill absolute inset-y-0 right-0 rounded-full", done ? "bg-[#3b82f6]" : "bg-gradient-to-l from-[#6aa8ff] to-[#2f6bff]")} style={{ width: `${pct}%` }}>
          {!done && <span className="gift-shine" aria-hidden />}
        </div>
        <span className={cn("absolute -left-1 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border-2", done ? "bg-[#3b82f6] border-[#3b82f6] text-white gift-got" : "bg-ink-900 border-[#6aa8ff] text-[#6aa8ff] gift-wait")}>
          <Icon name={done ? "check" : "gift"} size={15} strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}

/** A ring around the cart icon that fills toward the gift, and a hint under it. */
export function CartGiftRing() {
  const items = useOrderStore((s) => s.items);
  const hint = useGiftStore((s) => s.hint);
  const [shownHint, setShownHint] = useState(0);
  const total = giftTotal(items);
  const missing = giftMissing(items);
  const pct = Math.min(1, total / GIFT.threshold);
  const C = 2 * Math.PI * 21;

  useEffect(() => {
    if (!hint) return;
    const show = setTimeout(() => setShownHint(hint), 0);
    const hide = setTimeout(() => setShownHint(0), 2800);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [hint]);

  if (total <= 0) return null;
  return (
    <>
      <svg className="pointer-events-none absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] -rotate-90" viewBox="0 0 46 46" aria-hidden>
        <circle cx="23" cy="23" r="21" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2.5" />
        <circle cx="23" cy="23" r="21" fill="none" stroke={missing === 0 ? "#3b82f6" : "#6aa8ff"} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .6s var(--ease-out), stroke .3s" }} />
      </svg>
      {shownHint > 0 && missing > 0 && (
        <span key={shownHint} className="gift-hint pointer-events-none absolute top-full left-0 mt-2 whitespace-nowrap rounded-xl bg-ink-900 border border-[#3b82f6]/50 px-3 py-2 text-xs font-bold text-ink-100 shadow-xl z-[60]">
          עוד <bdi className="text-[#6aa8ff]">{fmtILS(Math.ceil(missing))}</bdi> למתנה
        </span>
      )}
    </>
  );
}

/** "פתחתם מתנה!" — the box shakes, the lid flies, confetti; gone after a moment. */
function GiftCelebration() {
  const celebrate = useGiftStore((s) => s.celebrate);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!celebrate) return;
    const show = setTimeout(() => setShown(celebrate), 0);
    const hide = setTimeout(() => setShown(0), 3200);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [celebrate]);
  const bits = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2 + (i % 3) * 0.2, d = 140 + ((i * 37) % 150);
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 80, r: (i * 47) % 720, c: ["#3b82f6", "#6aa8ff", "#ffd23d", "#ffffff", "#9cc4ff"][i % 5], w: 8 + (i % 4) * 3, h: 10 + ((i * 7) % 4) * 4, delay: (i % 8) * 16 };
  }), []);
  if (!shown) return null;
  return (
    <div key={shown} className="fixed inset-0 z-[80] grid place-items-center pointer-events-none" role="status" aria-live="polite">
      <div className="gift-cel pointer-events-auto relative w-[min(88vw,340px)] rounded-3xl border border-[#3b82f6]/50 bg-ink-950/95 px-6 pt-8 pb-6 text-center shadow-2xl" onClick={() => setShown(0)}>
        <div className="relative mx-auto h-36 w-36">
          <div className="bf-rays" aria-hidden />
          {bits.map((b, i) => (
            <span key={i} className="bf-bit" aria-hidden style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px`, "--r": `${b.r}deg`, background: b.c, width: b.w, height: b.h, animationDelay: `${600 + b.delay}ms` } as React.CSSProperties} />
          ))}
          <div className="bf-box gift-blue"><div className="bf-lid" /><div className="bf-body" /></div>
        </div>
        <div className="bf-unlock-text mt-4">
          <div className="text-2xl font-black">פתחתם מתנה!</div>
          <div className="text-ink-300 mt-1">{GIFT.title} עלינו, נשלח עם ההזמנה</div>
        </div>
      </div>
    </div>
  );
}
