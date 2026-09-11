import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/business";

/**
 * The shell every legal page shares.
 *
 * These pages exist to be read and to be relied on, so they are plain: one
 * column, real headings, generous line height, and a date at the top so a
 * customer can see which version they agreed to. Numbered sections, because
 * the pages reference each other by section.
 */
export const LEGAL_PAGES = [
  { href: "/terms", label: "תנאי שימוש" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/cookies", label: "עוגיות" },
  { href: "/returns", label: "ביטול והחזרה" },
  { href: "/accessibility", label: "הצהרת נגישות" },
];

export function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-9 scroll-mt-24" id={`s${n}`}>
      <h2 className="text-lg md:text-xl font-bold mb-3 flex items-baseline gap-2.5">
        <span className="font-mono text-flame-300 text-sm shrink-0">{n}.</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3 text-ink-300 leading-relaxed">{children}</div>
    </section>
  );
}

/** A definition row — "what we collect" tables read better than prose. */
export function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[9.5rem_1fr] gap-1 sm:gap-4 py-2.5 border-b border-ink-800 last:border-0">
      <dt className="font-semibold text-ink-100">{k}</dt>
      <dd className="text-ink-300">{children}</dd>
    </div>
  );
}

export default function LegalPage({
  title,
  lead,
  current,
  children,
}: {
  title: string;
  lead: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tightest leading-tight mb-3">{title}</h1>
        <p className="text-ink-300 leading-relaxed">{lead}</p>
        <p className="mt-4 text-sm text-ink-400">
          עודכן לאחרונה: <time dateTime={BUSINESS.legalUpdated}>{BUSINESS.legalUpdated.split("-").reverse().join(".")}</time>
        </p>
      </header>

      <nav aria-label="מסמכים משפטיים" className="flex flex-wrap gap-2 mb-4 pb-8 border-b border-ink-800">
        {LEGAL_PAGES.map((p) =>
          p.href === current ? (
            <span
              key={p.href}
              aria-current="page"
              className="px-3 py-1.5 rounded-lg text-sm border border-flame/40 bg-flame/10 text-flame-300"
            >
              {p.label}
            </span>
          ) : (
            <Link
              key={p.href}
              href={p.href}
              className="px-3 py-1.5 rounded-lg text-sm border border-ink-700 text-ink-300 hover:border-flame hover:text-flame-300 transition-colors"
            >
              {p.label}
            </Link>
          ),
        )}
      </nav>

      {children}

      <p className="mt-12 pt-6 border-t border-ink-800 text-sm text-ink-400 leading-relaxed">
        שאלה על המסמך הזה? {BUSINESS.contactPerson} עונה ב־
        <a href={BUSINESS.whatsapp} className="text-flame-300 underline hover:text-flame">וואטסאפ</a>
        {" "}או ב־
        <a href={`mailto:${BUSINESS.email}`} className="text-flame-300 underline hover:text-flame" dir="ltr">{BUSINESS.email}</a>.
      </p>
    </div>
  );
}
