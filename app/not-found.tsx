import Link from "next/link";
import Btn from "@/components/ui/Btn";

/**
 * The page a wrong address lands on.
 *
 * Next ships its own, and it is a black screen reading "This page could not
 * be found." in English — on a Hebrew shop, with no way back. Paid traffic
 * lands here too, so a dead end here is money spent on nothing.
 *
 * No `metadata` export: a 404 must not be indexable, and the static export
 * writes this to out/404.html, which GitHub Pages already serves with the
 * right status.
 */
const SHELVES: { href: string; label: string; note: string }[] = [
  { href: "/catalog/", label: "לחיילים", note: "סמלי יחידות צה\"ל" },
  { href: "/configurator/", label: "המעצב", note: "מעצבים ומקבלים מחיר" },
  { href: "/fidgets/", label: "פידג'טים", note: "פלקסי ופידג'טים" },
  { href: "/pets/", label: "לחיות", note: "תגי שם ואביזרים" },
  { href: "/statues/", label: "פסלים", note: "דמויות ובאסטים" },
  { href: "/home-office/", label: "לבית ולמשרד", note: "מה שמסדר לך את השולחן" },
];

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24">
      <header className="mb-10">
        <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
          404 · PAGE NOT FOUND
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05] mb-4">
          הדף הזה לא קיים.
        </h1>
        <p className="text-ink-300 leading-relaxed">
          כנראה הקישור נשבר, או שהכתובת הוקלדה עם טעות. הכל עדיין כאן — רק
          במקום אחר.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 mb-12">
        <Btn as="a" href="/" variant="primary" size="lg">
          לדף הבית
        </Btn>
        <Btn as="a" href="/contact/" variant="outline" size="lg">
          דבר איתי
        </Btn>
      </div>

      <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
        המדפים
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SHELVES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block p-4 rounded-2xl border border-ink-800 bg-ink-900 hover:border-flame transition-colors"
          >
            <div className="font-bold mb-0.5">{s.label}</div>
            <div className="text-ink-300 text-sm">{s.note}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
