"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import ProductGrid, { productToCard } from "@/components/ProductGrid";
import ProductToolbar from "@/components/ProductToolbar";
import { productsByCategory } from "@/lib/products";
import { applyListing, DEFAULT_LISTING, type ListingState } from "@/lib/listing";
import { cn } from "@/lib/cn";

type Filter = "all" | "office" | "home";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "office", label: "למשרד" },
  { id: "home", label: "לבית" },
];

export default function HomeOfficeClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [state, setState] = useState<ListingState>(DEFAULT_LISTING);
  const scoped = useMemo(
    () => (filter === "all" ? productsByCategory("home", "office") : productsByCategory(filter)).map(productToCard),
    [filter],
  );
  const items = useMemo(() => applyListing(scoped, state), [scoped, state]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">לבית ולמשרד · HOME & OFFICE</Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
          דברים שימושיים. עם השם שלך עליהם.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          מעמדים, מארגנים, תחתיות, ווים ושלטים. כל מוצר אפשר להזמין עם טקסט או לוגו
          מובלט, בכל צבע שבמלאי. לעסקים: מ-10 יחידות עם הלוגו שלכם.
        </p>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                filter === f.id ? "bg-ink-50 text-ink-950 border-ink-50" : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <ProductToolbar state={state} onChange={setState} shown={items.length} total={scoped.length} />

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
