"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import ProductGrid from "@/components/ProductGrid";
import ProductToolbar from "@/components/ProductToolbar";
import { trendingCards } from "@/lib/trending";
import { applyListing, DEFAULT_LISTING, type ListingState } from "@/lib/listing";

export default function TrendyClient() {
  const [state, setState] = useState<ListingState>(DEFAULT_LISTING);
  const all = useMemo(() => trendingCards(), []);
  const items = useMemo(() => applyListing(all, state), [all, state]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="flame" className="mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-flame live-dot" />
          טרנדי כרגע · HOT RIGHT NOW
        </Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
          מה שכולם מזמינים השבוע.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          המדף שמתעדכן לפי מה שבאמת יוצא מהמדפסת, וגם <b className="text-ink-100">הבית של כל מה שלא נכנס לעמודה אחרת</b> —
          גאדג&apos;טים, מתנות מצחיקות, דברים ויראליים ופריטים חד-פעמיים. לוחצים, בוחרים צבע, ומגיעים לטופס עם הכל מוכן.
        </p>
      </header>

      <ProductToolbar state={state} onChange={setState} shown={items.length} total={all.length} />

      <p className="text-[11px] text-ink-500 mb-4">
        התמונות הן של המעצבים המקוריים. אנחנו מדפיסים בצבע ובחומר שתבחר בעמוד המוצר —
        לא כל דגם אפשרי בכל צבע.
      </p>
      <ProductGrid cards={items} />

      {/* The designer has no catalogue photo — it is a service, not a model —
          so it gets a banner here instead of a card with a drawing on it. */}
      <Link
        href="/configurator"
        className="mt-8 block p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2">
            <Icon name="sparkles" size={20} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">רוצה משהו משלך?</div>
            <div className="text-sm text-ink-300">
              מחזיק מפתחות, קייס, שלט או תג לחיה — עם הטקסט והצורה שתבחר, במעצב האישי.
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">
            לעיצוב אישי<Icon name="arrowLeft" size={14} />
          </span>
        </div>
      </Link>

    </div>
  );
}
