import Link from "next/link";
import SectionHead from "@/components/ui/SectionHead";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { IconName } from "@/components/ui/Icon";

type Card = {
  lane: string;
  iconKey: IconName;
  title: string;
  desc: string;
  tags: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

const CARDS: Card[] = [
  {
    lane: "LANE 01 · PRIVATE",
    iconKey: "sparkles",
    title: "אני מזמין בשבילי",
    desc: "מתנה, פיגורה, חלק חילוף, פידג'ט, או כל רעיון שיש לך בראש.",
    tags: ["פיגורות", "פידג'טים", "מתנות", "חלקי חילוף"],
    cta: "כנס לקטלוג",
    href: "/catalog",
  },
  {
    lane: "LANE 02 · SOLDIER",
    iconKey: "shieldMini",
    title: "אני חייל/ת",
    desc: "סמל היחידה שלך כמחזיק מפתחות, פסל, או מתנה לטקס.",
    tags: ["סמלי יחידה", "מתנות לטקס", "כמויות פלוגה"],
    cta: "ראה סמלי יחידות",
    href: "/catalog",
    highlight: true,
  },
  {
    lane: "LANE 03 · BUSINESS",
    iconKey: "building",
    title: "אני מזמין לחברה",
    desc: "מתנות לעובדים, פרסים פנימיים, ערכות קליטה. מ-10 יחידות ומעלה.",
    tags: ["Welcome Kits", "פרסים", "מחירון מדורג", "חשבונית מס"],
    cta: "קבל הצעת מחיר",
    href: "/b2b",
  },
];

export default function AudienceSwitcher() {
  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <SectionHead
          eyebrow="FOR YOU · FOR YOUR UNIT · FOR YOUR COMPANY"
          title="מי שולח את הבקשה?"
        />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((c) => (
            <Link
              key={c.lane}
              href={c.href}
              className={cn(
                "group relative flex flex-col gap-4 p-7 rounded-2xl border transition-all duration-300 ease-smooth hover:-translate-y-1",
                c.highlight
                  ? "bg-gradient-to-bl from-flame/10 via-ink-900 to-ink-900 border-flame/30 hover:shadow-glow"
                  : "bg-ink-900 border-ink-800 hover:border-ink-700 hover:shadow-soft",
              )}
            >
              <div className="font-mono text-[10px] tracking-widest uppercase text-ink-400">
                {c.lane}
              </div>
              <div
                className={cn(
                  "inline-flex items-center justify-center h-14 w-14 rounded-xl border",
                  c.highlight
                    ? "bg-flame/15 border-flame/30 text-flame"
                    : "bg-ink-800 border-ink-700 text-ink-200",
                )}
              >
                <Icon name={c.iconKey} size={26} />
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
                {c.title}
              </h3>
              <p className="text-ink-300 text-sm leading-relaxed">{c.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-1 rounded-full bg-ink-800/80 border border-ink-700 text-ink-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-flame font-semibold text-sm pt-2">
                <span>{c.cta}</span>
                <Icon
                  name="arrowLeft"
                  size={16}
                  className="transition-transform group-hover:-translate-x-1"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
