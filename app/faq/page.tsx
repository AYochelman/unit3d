import FAQClient from "./FAQClient";
import JsonLd from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo";
import { FAQS } from "@/lib/faqs";

export const metadata = {
  title: "שאלות נפוצות · Unit 3D",
  description:
    "כל מה שצריך לדעת — זמני הדפסה, חומרים, אחריות, משלוחים, ביטולים, וקבצים.",
  alternates: { canonical: "/faq/" },
};

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      {/* The same eight answers, in the form Google can expand under the
          result. They come from the one FAQS list, so the page and the search
          result can never drift apart. */}
      <JsonLd data={faqJsonLd(FAQS)} />
      <header className="mb-10">
        <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
          FAQ · 8 ANSWERS
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05]">
          שאלות. תשובות.
        </h1>
      </header>
      <FAQClient />
      <div className="mt-12 p-5 rounded-2xl border border-ink-800 bg-ink-900 text-center">
        <div className="font-bold mb-1.5">לא מצאת תשובה?</div>
        <div className="text-ink-300 text-sm mb-4">
          תשלח לי שאלה — אחזור אליך תוך 24 שעות.
        </div>
        <a
          href="/contact"
          className="inline-flex items-center gap-1.5 text-flame font-semibold text-sm"
        >
          דבר איתי
        </a>
      </div>
    </div>
  );
}
