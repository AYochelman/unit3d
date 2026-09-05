"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import ProductGrid, { productToCard } from "@/components/ProductGrid";
import ProductToolbar from "@/components/ProductToolbar";
import { productsByCategory } from "@/lib/products";
import { applyListing, DEFAULT_LISTING, type ListingState } from "@/lib/listing";

export default function StatuesClient() {
  const [state, setState] = useState<ListingState>(DEFAULT_LISTING);
  const all = useMemo(() => productsByCategory("statues").map(productToCard), []);
  const items = useMemo(() => applyListing(all, state), [all, state]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">פסלים · STATUES</Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
          משהו למדף. לא עוד גאדג&apos;ט.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          פריטי תצוגה בהדפסה איטית ובשכבות דקות (0.12mm) — בוסטים, חיות לואו-פולי, גביעים
          ואגרטלים. אלה הדפסות של 5 עד 22 שעות, ולכן הן מוזמנות לפי תור ולא נשלחות למחרת.
        </p>
      </header>

      <ProductToolbar state={state} onChange={setState} shown={items.length} total={all.length} />

      <ProductGrid cards={items} />

      <section className="mt-12 p-6 md:p-8 rounded-2xl bg-ink-900 border border-ink-800 grid md:grid-cols-3 gap-5">
        {[
          { t: "שכבה של 0.12mm", d: "חצי מהעובי הרגיל. על פנים ועל עקומות זה ההבדל בין צעצוע לפסל." },
          { t: "בסיס משוקלל", d: "כל פסל יוצא עם בסיס מלא כדי שלא יפול. אפשר גם למלא בחול." },
          { t: "צביעה בתוספת", d: "אפשר לקבל גולמי בצבע אחד, או צבוע ביד. תגיד לי מה מתאים לך." },
        ].map((b) => (
          <div key={b.t} className="p-4 rounded-xl border border-ink-800 bg-ink-950/40">
            <div className="font-bold mb-1.5">{b.t}</div>
            <div className="text-sm text-ink-400 leading-relaxed">{b.d}</div>
          </div>
        ))}
      </section>

      <Link
        href="/upload"
        className="mt-8 block p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2">
            <Icon name="upload" size={20} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">יש לך כבר קובץ של פסל?</div>
            <div className="text-sm text-ink-300">העלה STL/OBJ/3MF ואחזור אליך עם מחיר וזמן הדפסה.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">
            להעלאה<Icon name="arrowLeft" size={14} />
          </span>
        </div>
      </Link>
    </div>
  );
}
