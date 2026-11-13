"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { BF, bfForced, bfPhase, useBfStore, type BfPhase } from "@/lib/black-friday";

/**
 * The time, refreshed every `every` ms; null until mounted, so the static HTML
 * never carries a stale time. Only a clock should tick every second — anything
 * bigger re-renders its whole tree with it.
 */
export function useNow(every = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), every);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [every]);
  return now;
}

/** A countdown that ticks on its own, so whatever holds it stays still. */
export function LiveCountdown({ to, className }: { to: Date; className?: string }) {
  const now = useNow();
  if (now == null) return null;
  return <Countdown to={to} now={now} className={className} />;
}

export function usePhase(now: number | null): BfPhase | null {
  return now == null ? null : bfPhase(now, bfForced());
}

/** "3 ימים 04:12:09" — the digits keep their width as they change. */
export function Countdown({ to, now, className }: { to: Date; now: number; className?: string }) {
  const s = Math.max(0, Math.floor((to.getTime() - now) / 1000));
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return (
    <span className={className}>
      {d > 0 && <>{d === 1 ? "יום" : `${d} ימים`} </>}
      <bdi dir="ltr" className="tabular-nums">{hms}</bdi>
    </span>
  );
}

const HIDDEN_ON = ["/admin"];

/**
 * The strip above the header: how long until Black Friday opens, then how long
 * until it closes. A tap opens the sale popup. Gone once the sale is over.
 */
export default function BlackFridayBar() {
  const now = useNow();
  const phase = usePhase(now);
  const show = useBfStore((s) => s.show);
  const path = usePathname() ?? "";
  if (now == null || phase == null || phase === "over" || HIDDEN_ON.some((p) => path.startsWith(p))) return null;

  return (
    <button
      type="button"
      onClick={show}
      className="bf-bar relative z-40 w-full overflow-hidden bg-black text-white border-b border-[#ff3d5a]/40"
    >
      <span className="bf-bar-shine" aria-hidden />
      <span className="relative mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-3 px-4 h-10 text-[13px] sm:text-sm">
        <span className="font-black text-[#ff3d5a]">בלאק פריידי</span>
        <span className="hidden sm:inline text-white/80">
          {phase === "live" ? `קונים ${BF.need} פידג'טים, השלישי עלינו` : "המבצעים מגיעים"}
        </span>
        <span className="text-white/60">·</span>
        <span className="text-white/80">{phase === "live" ? "נגמר בעוד" : "בעוד"}</span>
        <Countdown to={phase === "live" ? BF.end : BF.start} now={now} className="font-bold" />
        <Icon name="arrowLeft" size={14} className="text-white/70" />
      </span>
    </button>
  );
}
