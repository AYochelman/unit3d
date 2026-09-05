"use client";
import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { quote, pickPackaging, type Destination } from "@/lib/shipping";

type Props = {
  /** Item weight in grams. */
  grams: number;
  /** Longest / middle / shortest dimension in mm; guessed from the size string when absent. */
  size?: { l: number; w: number; h: number };
  /** A statue or a thin flat print wants wrapping. */
  fragile?: boolean;
  qty?: number;
};

/**
 * "How much to ship this" on the product page itself.
 *
 * It runs the same quote() the /shipping page runs, on this product's real
 * weight, so the number here and the number there can never disagree. Israel
 * Post prices by weight and by in-city vs between-cities, so those are the only
 * two things it asks for.
 */
export default function ShippingEstimate({ grams, size, fragile = false, qty = 1 }: Props) {
  const [destination, setDestination] = useState<Destination>("intercity");
  const [open, setOpen] = useState(false);

  const s = size ?? { l: 140, w: 100, h: 60 };
  const options = quote({
    grams: grams * qty,
    size: qty > 1 ? { l: s.l, w: s.w, h: s.h * Math.min(qty, 4) } : s,
    destination,
    tier: "upto10",
    click: true,
    fragile,
  });
  const cheapest = options.find((o) => !o.unavailable && o.id !== "pickup");
  const pack = pickPackaging(s, fragile);

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-right"
        aria-expanded={open}
      >
        <Icon name="truck" size={15} className="text-cyan2 shrink-0" />
        <span className="text-sm font-semibold">משלוח</span>
        <span className="text-sm text-ink-300">
          {cheapest ? (
            <>
              מ-<span className="font-mono text-cyan2">{fmtILS(cheapest.total)}</span>
            </>
          ) : (
            "לפי הזמנה"
          )}
        </span>
        <Icon
          name="chevDown"
          size={13}
          className={cn("mr-auto text-ink-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="inline-flex rounded-full border border-ink-700 bg-ink-950 p-0.5">
            {[
              { id: "city", label: "בתוך העיר" },
              { id: "intercity", label: "בין-עירוני" },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setDestination(o.id as Destination)}
                className={cn(
                  "px-3 h-7 rounded-full text-xs font-medium transition-colors",
                  destination === o.id ? "bg-cyan2/20 text-cyan2" : "text-ink-300 hover:text-ink-50",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <ul className="space-y-1 text-xs">
            {options
              .filter((o) => !o.unavailable)
              .map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3">
                  <span className="text-ink-400 truncate">{o.service}</span>
                  <span className="font-mono text-ink-200 shrink-0" dir="ltr">{fmtILS(o.total)}</span>
                </li>
              ))}
          </ul>

          <p className="text-[10px] text-ink-500 leading-relaxed">
            כולל אריזה ({pack ? pack.label : "לפי מידה"}) ואת הנחת דואר בקליק. מעל ₪200 המשלוח חינם.
            {" "}
            <Link href="/shipping" className="text-cyan2 hover:underline">למחשבון המלא</Link>
          </p>
        </div>
      )}
    </div>
  );
}
