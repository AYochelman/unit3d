"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Countdown, useNow, usePhase } from "@/components/bf/BlackFridayBar";
import { BF, bfFreeChoices, bfPaidChoices, isBfFree, useBfStore, type BfPick } from "@/lib/black-friday";
import { useLivePricer } from "@/lib/live-price";
import { useOrderStore } from "@/lib/order-store";
import { heName } from "@/lib/he-names";
import { assetSrc } from "@/lib/assets";
import { FIDGETS } from "@/lib/data";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useExit } from "@/lib/use-exit";

type View = "intro" | "pick" | "unlock" | "free" | "done";

/** Where the popup never opens on its own: the owner's screens and the order form. */
const NO_AUTO = ["/admin", "/contact"];
const AUTO_AFTER_MS = 6000;

const name = (p: BfPick) => heName(p.f.id, p.f.name);

/**
 * Black Friday, as one popup: what the deals are, then a quick way through the
 * main one — pick two fidgets, the gift opens, pick a third for free from
 * everything up to BF.freeMax. Opens by itself once per visit, and from the bar.
 */
export default function BlackFridayPopup() {
  const now = useNow();
  const phase = usePhase(now);
  const { open, seen, show, hide } = useBfStore();
  const path = usePathname() ?? "";
  const { items, addItem, removeItem } = useOrderStore();
  const priceOf = useLivePricer();
  const { closing, close } = useExit();
  const [view, setView] = useState<View>("intro");
  const [freeId, setFreeId] = useState<string | null>(null);

  // Once per visit, a few seconds in, while the sale is coming or on.
  useEffect(() => {
    if (seen || !phase || phase === "over" || NO_AUTO.some((p) => path.startsWith(p))) return;
    const id = setTimeout(show, AUTO_AFTER_MS);
    return () => clearTimeout(id);
  }, [seen, phase, path, show]);

  const paidChoices = useMemo(() => (open ? bfPaidChoices(priceOf) : []), [open, priceOf]);
  const freeChoices = useMemo(() => (open ? bfFreeChoices(priceOf) : []), [open, priceOf]);
  const freeCount = useMemo(() => bfFreeChoices(priceOf).length, [priceOf]);

  const paidInCart = items.filter((it) => it.meta?.bfPaid === true);
  const freeInCart = items.find(isBfFree);
  const picked = new Set(paidInCart.map((it) => it.meta?.fidgetId as string));

  // Two picked → the gift opens by itself.
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (unlockTimer.current) clearTimeout(unlockTimer.current); }, []);

  if (!open || !phase || now == null) return null;
  const live = phase === "live";

  const dismiss = () => close(() => { hide(); setView("intro"); setFreeId(null); });

  const start = () => setView(freeInCart ? "done" : paidInCart.length >= BF.need ? "free" : "pick");

  const togglePaid = (p: BfPick) => {
    const inCart = paidInCart.find((it) => it.meta?.fidgetId === p.f.id);
    if (inCart) { removeItem(inCart.id); return; }
    if (paidInCart.length >= BF.need) return;
    addItem({
      title: name(p),
      summary: [`פידג'ט: ${name(p)}`, `גודל: ${p.f.size}`, `זמן הדפסה: ${p.f.time}`, "צבע: כמו בתמונה", "בלאק פריידי · 2+1"],
      price: p.price,
      source: "fidgets",
      meta: { fidgetId: p.f.id, qty: 1, baseUnitPrice: p.price, bfPaid: true },
    });
    if (paidInCart.length + 1 >= BF.need) {
      unlockTimer.current = setTimeout(() => {
        setView("unlock");
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        unlockTimer.current = setTimeout(() => setView("free"), reduced ? 300 : 1900);
      }, 450);
    }
  };

  const takeFree = (p: BfPick) => {
    if (freeInCart) removeItem(freeInCart.id);
    addItem({
      title: name(p),
      summary: [`פידג'ט: ${name(p)}`, `גודל: ${p.f.size}`, `זמן הדפסה: ${p.f.time}`, "צבע: כמו בתמונה", `מתנת בלאק פריידי (במקום ${fmtILS(p.price)})`],
      price: 0,
      source: "fidgets",
      meta: { fidgetId: p.f.id, qty: 1, baseUnitPrice: 0, bfFree: true, bfWorth: p.price },
    });
    setFreeId(p.f.id);
    setTimeout(() => setView("done"), 650);
  };

  const step = view === "pick" ? Math.min(paidInCart.length, BF.need) : view === "intro" ? 0 : BF.need;

  return (
    <div data-closing={closing || undefined} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="bf-title">
      <div className="m-backdrop absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismiss} />
      <div className="m-sheet m-sm-pop bf-panel relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#ff3d5a]/30 bg-[#07090a] text-white overflow-hidden">
        <button type="button" onClick={dismiss} aria-label="סגור" className="absolute top-3 left-3 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center">
          <Icon name="x" size={18} />
        </button>

        {/* Header: the sale and its clock, on every step. */}
        <div className="bf-head relative px-5 sm:px-7 pt-6 pb-4 shrink-0">
          <div className="text-xs font-bold text-[#ff3d5a]">{live ? "עכשיו באתר" : "מגיע בקרוב"}</div>
          <h2 id="bf-title" className="text-3xl sm:text-4xl font-black leading-none mt-1">בלאק פריידי</h2>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#ff3d5a] live-dot" />
            {live ? "נגמר בעוד" : "נפתח בעוד"} <Countdown to={live ? BF.end : BF.start} now={now} className="font-bold" />
          </div>
          {view !== "intro" && view !== "done" && <Progress step={step} unlocked={view === "free" || view === "unlock"} />}
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 sm:px-7 pb-6">
          {view === "intro" && (
            <div className="space-y-3 m-stagger">
              <button type="button" onClick={live ? start : undefined} disabled={!live} style={{ "--i": 0 } as React.CSSProperties}
                className="bf-deal group w-full text-right rounded-2xl p-5 bg-gradient-to-l from-[#ff3d5a]/25 to-[#ff3d5a]/5 border border-[#ff3d5a]/40 disabled:cursor-default">
                <div className="flex items-start gap-4">
                  <span className="bf-gift-mini shrink-0" aria-hidden><span /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-2xl font-black">2+1 על פידג&apos;טים</div>
                    <div className="text-sm text-white/80 mt-1">
                      קונים {BF.need}, השלישי עד <bdi>{fmtILS(BF.freeMax)}</bdi> עלינו. <b className="text-white">{freeCount}</b> פידג&apos;טים לבחירה.
                    </div>
                    <div className={cn("mt-3 inline-flex items-center gap-2 h-11 px-5 rounded-full font-bold", live ? "bg-[#ff3d5a] text-white group-active:scale-[0.97] transition-transform" : "bg-white/10 text-white/70")}>
                      {freeInCart ? "המתנה כבר בסל · לצפייה" : live ? "לבחירה מהירה" : <>נפתח ב-<bdi>27.11</bdi></>}
                      {live && <Icon name="arrowLeft" size={16} />}
                    </div>
                  </div>
                </div>
              </button>

              <Link href="/products/mystery-box" onClick={dismiss} style={{ "--i": 1 } as React.CSSProperties}
                className="flex items-center gap-4 rounded-2xl p-4 bg-white/[0.04] border border-white/10 hover:border-white/25 transition-colors">
                <Image src={assetSrc("/img/products/mystery-box.webp")} alt="" width={84} height={84} className="h-20 w-20 rounded-xl object-cover shrink-0" unoptimized />
                <div className="min-w-0 flex-1">
                  <div className="font-black text-lg">מיסטרי בוקס · מהדורת בלאק פריידי</div>
                  <div className="text-sm text-white/70">כמות מוגבלת. <b className="text-[#ff3d5a]">נשארו {BF.mysteryLeft}</b></div>
                </div>
                <Icon name="arrowLeft" size={18} className="text-white/50" />
              </Link>
              <p className="text-[12px] text-white/50 pt-1" style={{ "--i": 2 } as React.CSSProperties}>
                המבצע בתוקף <bdi>27.11–30.11</bdi>. מתנה אחת בהזמנה. נשלח באותה חבילה.
              </p>
            </div>
          )}

          {view === "pick" && (
            <>
              <h3 className="text-xl font-black mb-1">בחרו {BF.need} פידג&apos;טים</h3>
              <p className="text-sm text-white/60 mb-4">ואז נפתחת מתנה: אחד נוסף חינם.</p>
              <div className="m-stagger grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paidChoices.map((p, i) => {
                  const on = picked.has(p.f.id);
                  const full = !on && paidInCart.length >= BF.need;
                  return (
                    <Card key={p.f.id} p={p} i={i} on={on} dim={full} onClick={() => togglePaid(p)}
                      label={on ? "נבחר" : "הוספה"} price={<bdi>{fmtILS(p.price)}</bdi>} />
                  );
                })}
              </div>
            </>
          )}

          {view === "unlock" && <Unlock />}

          {view === "free" && (
            <>
              <h3 className="text-xl font-black mb-1 bf-pop-in">בחרו אחד, <span className="text-[#38e08a]">חינם</span></h3>
              <p className="text-sm text-white/60 mb-4">{freeChoices.length} פידג&apos;טים עד <bdi>{fmtILS(BF.freeMax)}</bdi>. נשלח עם השניים שבחרתם.</p>
              <div className="m-stagger grid grid-cols-2 sm:grid-cols-3 gap-3">
                {freeChoices.map((p, i) => (
                  <Card key={p.f.id} p={p} i={Math.min(i, 12)} on={freeId === p.f.id} free onClick={() => takeFree(p)}
                    label={freeId === p.f.id ? "שלך!" : "לקחת חינם"}
                    price={<><s className="text-white/50 font-normal"><bdi>{fmtILS(p.price)}</bdi></s> <span className="text-[#38e08a]">חינם</span></>} />
                ))}
              </div>
            </>
          )}

          {view === "done" && <Done items={items} onClose={dismiss} />}
        </div>
      </div>
    </div>
  );
}

/** Two slots and a gift at the end; the bar fills as fidgets are picked. */
function Progress({ step, unlocked }: { step: number; unlocked: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-2" aria-label={`נבחרו ${step} מתוך ${BF.need}`}>
      {Array.from({ length: BF.need }, (_, i) => (
        <span key={i} className={cn("h-2 flex-1 rounded-full transition-colors duration-300", i < step ? "bg-[#ff3d5a]" : "bg-white/15")} />
      ))}
      <span className={cn("bf-gift-slot inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300", unlocked ? "border-[#38e08a] bg-[#38e08a]/20 text-[#38e08a] bf-glow" : "border-white/20 text-white/40")}>
        <Icon name={unlocked ? "check" : "plus"} size={16} strokeWidth={3} />
      </span>
    </div>
  );
}

function Card({ p, i, on, dim, free, onClick, label, price }: {
  p: BfPick; i: number; on: boolean; dim?: boolean; free?: boolean; onClick: () => void; label: string; price: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ "--i": i } as React.CSSProperties}
      className={cn(
        "group relative text-right rounded-2xl overflow-hidden bg-white/[0.04] border-2 transition-all active:scale-[0.97]",
        on ? (free ? "border-[#38e08a] bf-picked" : "border-[#ff3d5a] bf-picked") : "border-white/10 hover:border-white/30",
        dim && "opacity-40",
      )}>
      <div className="relative aspect-square">
        <Image src={p.f.thumbnail!} alt="" fill sizes="(max-width: 640px) 45vw, 200px" className="object-cover" unoptimized loading={i < 12 ? "eager" : "lazy"} />
        {free && <span className="absolute top-2 right-2 rounded-full bg-[#38e08a] px-2 py-0.5 text-[11px] font-black text-black">מתנה</span>}
      </div>
      <div className="p-2.5">
        <div className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[2.5em]">{name(p)}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold">{price}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors", on ? (free ? "bg-[#38e08a] text-black" : "bg-[#ff3d5a] text-white") : "bg-white/10")}>{label}</span>
        </div>
      </div>
    </button>
  );
}

/** The moment it unlocks: the box shakes, the lid flies, confetti bursts out of it. */
function Unlock() {
  const bits = useMemo(() => Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2 + (i % 3) * 0.2;
    const d = 150 + ((i * 37) % 170);
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 90, r: (i * 47) % 720, c: ["#ff3d5a", "#38e08a", "#ffd23d", "#ffffff", "#5ab8ff"][i % 5], delay: (i % 8) * 16, w: 8 + (i % 4) * 3, h: 10 + ((i * 7) % 4) * 4 };
  }), []);
  return (
    <div className="relative flex flex-col items-center justify-center py-10 sm:py-14">
      <div className="relative h-44 w-44">
        <div className="bf-rays" aria-hidden />
        {bits.map((b, i) => (
          <span key={i} className="bf-bit" aria-hidden style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px`, "--r": `${b.r}deg`, background: b.c, width: b.w, height: b.h, animationDelay: `${600 + b.delay}ms` } as React.CSSProperties} />
        ))}
        <div className="bf-box"><div className="bf-lid" /><div className="bf-body" /></div>
      </div>
      <div className="bf-unlock-text mt-6 text-center">
        <div className="text-3xl font-black">פתחתם מתנה!</div>
        <div className="text-white/70 mt-1">פידג&apos;ט שלישי עלינו</div>
      </div>
    </div>
  );
}

function Done({ items, onClose }: { items: ReturnType<typeof useOrderStore.getState>["items"]; onClose: () => void }) {
  const mine = items.filter((it) => it.meta?.bfPaid === true || isBfFree(it));
  const paid = mine.filter((it) => !isBfFree(it)).reduce((s, it) => s + (it.price ?? 0), 0);
  const saved = Number(mine.find(isBfFree)?.meta?.bfWorth ?? 0);
  return (
    <div className="text-center py-6">
      <span className="bf-done-check mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#38e08a] text-black">
        <Icon name="check" size={32} strokeWidth={3} />
      </span>
      <h3 className="text-2xl font-black">{mine.length} פידג&apos;טים בסל</h3>
      <p className="text-white/70 mt-1">משלמים <bdi className="font-bold text-white">{fmtILS(paid)}</bdi>{saved > 0 && <>, חוסכים <bdi className="font-bold text-[#38e08a]">{fmtILS(saved)}</bdi></>}</p>
      <div className="mt-5 flex justify-center gap-2">
        {mine.map((it) => (
          <span key={it.id} className="relative">
            {(() => {
              const thumb = FIDGETS.find((f) => f.id === it.meta?.fidgetId)?.thumbnail;
              return thumb
                ? <Image src={thumb} alt={it.baseTitle} width={64} height={64} className="h-16 w-16 rounded-xl object-cover" unoptimized />
                : <span className="block h-16 w-16 rounded-xl bg-white/10 overflow-hidden text-[10px] leading-tight p-1">{it.baseTitle}</span>;
            })()}
            {isBfFree(it) && <span className="absolute -top-2 -left-2 rounded-full bg-[#38e08a] px-1.5 text-[10px] font-black text-black">חינם</span>}
          </span>
        ))}
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
        <Link href="/contact" onClick={onClose} className="h-12 px-6 rounded-full bg-[#ff3d5a] font-bold inline-flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
          לסל ולסיום ההזמנה <Icon name="arrowLeft" size={16} />
        </Link>
        <button type="button" onClick={onClose} className="h-12 px-6 rounded-full bg-white/10 font-bold">להמשיך לקנות</button>
      </div>
    </div>
  );
}
