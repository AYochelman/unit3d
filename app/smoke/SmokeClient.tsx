"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import ProductGrid, { productToCard } from "@/components/ProductGrid";
import ProductToolbar from "@/components/ProductToolbar";
import { productsByCategory } from "@/lib/products";
import { applyListing, DEFAULT_LISTING, type ListingState } from "@/lib/listing";

export default function SmokeClient() {
  const [state, setState] = useState<ListingState>(DEFAULT_LISTING);
  const all = useMemo(() => productsByCategory("smoke").map(productToCard), []);
  const items = useMemo(() => applyListing(all, state), [all, state]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">מוצרי עישון · SMOKE</Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
          הדברים שיושבים בכיס.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          קופסאות סיגריות, מאפרות, קייסים למצית, קופסאות טבק וגריינדרים. הכל מודפס לפי הזמנה,
          בצבע ובחומר שתבחר — ואפשר גם עם שם עליו.
        </p>
      </header>

      <ProductToolbar state={state} onChange={setState} shown={items.length} total={all.length} />

      {/* A shelf of accessories for a legal product still deserves the line said
          out loud, once, where a customer sees it before ordering. */}
      <p className="text-[11px] text-ink-500 mb-4">
        אביזרים לבגירים בלבד (18+). התמונות הן של המעצבים המקוריים; אנחנו מדפיסים בצבע ובחומר
        שתבחר בעמוד המוצר. למאפרות מומלץ PETG — הוא עומד בחום טוב יותר מ-PLA.
      </p>
      <ProductGrid cards={items} />

      <section className="mt-12 p-6 md:p-8 rounded-2xl bg-ink-900 border border-ink-800 grid md:grid-cols-3 gap-5">
        {[
          { t: "PETG למאפרות", d: "PLA מתעוות סביב 60°C. מאפרה עובדת מקבלת PETG, וזה לא עולה הרבה יותר." },
          { t: "סגירה שנסגרת", d: "הקופסאות נבחרו לפי סגירה שמחזיקה בכיס, לא רק בתמונה." },
          { t: "עם שם עליו", d: "כל פריט כאן אפשר עם טקסט משלך — הכפתור בעמוד המוצר." },
        ].map((b) => (
          <div key={b.t} className="p-4 rounded-xl border border-ink-800 bg-ink-950/40">
            <div className="font-bold mb-1.5">{b.t}</div>
            <div className="text-sm text-ink-400 leading-relaxed">{b.d}</div>
          </div>
        ))}
      </section>

      <Link
        href="/contact"
        className="mt-8 block p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2">
            <Icon name="search" size={20} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">מחפש משהו ספציפי?</div>
            <div className="text-sm text-ink-300">תכתוב לי מה, ואחפש דגם מתאים ואגיד לך מחיר וזמן.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">
            לבקשה<Icon name="arrowLeft" size={14} />
          </span>
        </div>
      </Link>
    </div>
  );
}
