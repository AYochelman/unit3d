"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import ProductGrid, { productToCard } from "@/components/ProductGrid";
import ProductToolbar from "@/components/ProductToolbar";
import { useProductsByCategory } from "@/lib/use-shelves";
import { applyListing, DEFAULT_LISTING, type ListingState } from "@/lib/listing";




export default function HomeClient() {
  const [state, setState] = useState<ListingState>(DEFAULT_LISTING);
  const both = useProductsByCategory("home");
  const scoped = useMemo(() => both.map(productToCard), [both]);
  const items = useMemo(() => applyListing(scoped, state), [scoped, state]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">לבית · HOME</Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
הבית שלך. בדברים שאין בחנות.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          אגרטלים, תחתיות, מארגנים, ווים ושלטים. כל מוצר אפשר להזמין עם טקסט או לוגו מובלט, בכל צבע שבמלאי.
        </p>
      </header>

      <ProductToolbar state={state} onChange={setState} shown={items.length} total={scoped.length} />

      <p className="text-[11px] text-ink-500 mb-4">
        התמונות הן של המעצבים המקוריים. אנחנו מדפיסים בצבע ובחומר שתבחר בעמוד המוצר —
        לא כל דגם אפשרי בכל צבע.
      </p>
      <ProductGrid cards={items} />

      <Link href="/b2b" className="mt-10 block p-5 rounded-2xl border border-flame/30 bg-gradient-to-bl from-flame/10 to-cyan2/5 hover:border-flame/60 transition-colors">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-flame/15 text-flame"><Icon name="building" size={20} /></span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">מתנות לעובדים עם הלוגו שלכם</div>
            <div className="text-sm text-ink-300">מעמדי טלפון, מחזיקי כרטיסים ותחתיות ממותגות. הצעת מחיר תוך 24 שעות.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-flame font-semibold text-sm">לעמוד העסקי<Icon name="arrowLeft" size={14} /></span>
        </div>
      </Link>
    </div>
  );
}
