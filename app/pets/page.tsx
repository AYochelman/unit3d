import type { Metadata } from "next";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import ProductGrid from "@/components/ProductGrid";
import { PET_PRODUCTS } from "@/lib/products";

export const metadata: Metadata = {
  title: "תגים לחיות · Unit 3D",
  description: "תגי שם לכלבים וחתולים עם שם וטלפון, מודפסים ב-PETG עמיד. עצם, לב, דג, כף רגל, QR.",
};

export default function PetsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">תגים לחיות · PET TAGS</Pill>
        <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-3">
          שם וטלפון על הקולר. ליתר ביטחון.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          תגים קלים (4–8 גרם) מודפסים ב-PETG שעמיד במים ובשמש. השם מלפנים, הטלפון מאחור,
          טבעת נירוסטה כלולה. הדפסה ב-2 צבעים כדי שהשם יבלוט.
        </p>
      </header>

      <ProductGrid products={PET_PRODUCTS} />

      <section className="mt-12 p-6 md:p-8 rounded-2xl bg-ink-900 border border-ink-800 grid md:grid-cols-3 gap-5">
        {[
          { t: "עמיד במים", d: "PETG לא סופג מים ולא מתעקם בשמש. גם אחרי חודשים בים." },
          { t: "קל לחיה", d: "תג לחתול שוקל 4 גרם. פחות מטבעת המתכת שעליו." },
          { t: "מודפס תוך יום", d: "תגים יוצאים תוך 24 שעות מרגע אישור הטקסט." },
        ].map((b) => (
          <div key={b.t} className="p-4 rounded-xl border border-ink-800 bg-ink-950/40">
            <div className="font-bold mb-1.5">{b.t}</div>
            <div className="text-sm text-ink-400 leading-relaxed">{b.d}</div>
          </div>
        ))}
      </section>

      <Link href="/configurator" className="mt-8 block p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2"><Icon name="sparkles" size={20} /></span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">רוצה צורה משלך?</div>
            <div className="text-sm text-ink-300">במעצב אפשר לצייר תג חופשי: צורות, טקסט, צבעים.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">למעצב<Icon name="arrowLeft" size={14} /></span>
        </div>
      </Link>
    </div>
  );
}
