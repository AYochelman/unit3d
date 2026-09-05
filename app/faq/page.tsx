import FAQClient from "./FAQClient";

export const metadata = {
  title: "שאלות נפוצות · Unit 3D",
  description:
    "כל מה שצריך לדעת — זמני הדפסה, חומרים, אחריות, משלוחים, ביטולים, וקבצים.",
};

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-10">
        <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
          FAQ · 8 ANSWERS
        </div>
        <h1 className="font-display text-3xl md:text-[42px] font-bold leading-[1.15]">
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
