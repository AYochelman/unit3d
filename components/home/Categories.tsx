import Link from "next/link";
import Icon from "@/components/ui/Icon";
import CategoryArt, { type CategoryArtId } from "@/components/CategoryArt";
import Pill from "@/components/ui/Pill";
import SectionHead from "@/components/ui/SectionHead";

type Cat = {
  index: string;
  title: string;
  /** Short label for the card's call to action ("פתח <cta>"). */
  cta: string;
  desc: string;
  href: string;
  hue: number;
  art: CategoryArtId;
  popular?: boolean;
};

const CATS: Cat[] = [
  {
    index: "01",
    title: "טרנדי כרגע",
    cta: "טרנדי",
    desc: "מה שכולם מזמינים השבוע. פידג'טים, קייסים, מתנות.",
    href: "/trendy",
    hue: 145,
    art: "trendy",
    popular: true,
  },
  {
    index: "02",
    title: "לחיילים — סמלי יחידה",
    cta: "סמלים",
    desc: "מחזיקי מפתחות, פסלי שולחן, מתנות לטקסים.",
    href: "/catalog",
    hue: 18,
    art: "units",
  },
  {
    index: "03",
    title: "מעצב אישי",
    cta: "מעצב",
    desc: "מחזיק, קייס, דיסקית, שלט. טקסט או עיצוב חופשי.",
    href: "/configurator",
    hue: 200,
    art: "designer",
  },
  {
    index: "04",
    title: "פידג'טים ופלקסי",
    cta: "פידג'טים",
    desc: "דרקוני פלקסי, ספינרים, קוביות אינסוף.",
    href: "/fidgets",
    hue: 90,
    art: "fidgets",
  },
  {
    index: "05",
    title: "תגים לחיות",
    cta: "תגים",
    desc: "שם וטלפון על הקולר. PETG עמיד, 4 גרם.",
    href: "/pets",
    hue: 30,
    art: "pets",
  },
  {
    index: "06",
    title: "פסלים",
    cta: "פסלים",
    desc: "בוסטים, דרקונים, לואו-פולי, גביעים ואגרטלים.",
    href: "/statues",
    hue: 320,
    art: "statues",
  },
  {
    index: "07",
    title: "לבית ולמשרד",
    cta: "לבית",
    desc: "מעמדים, מארגנים, תחתיות ושלטים עם השם שלך.",
    href: "/home",
    hue: 260,
    art: "homeoffice",
  },
  {
    index: "08",
    title: "לעסקים",
    cta: "לעסקים",
    desc: "מתנות לעובדים עם הלוגו שלכם. מ-10 יחידות.",
    href: "/b2b",
    hue: 190,
    art: "b2b",
  },
  {
    index: "09",
    title: "הדפסה לפי הקובץ שלך",
    cta: "הדפסה",
    desc: "STL/OBJ/3MF — אני מתאים, צובע, ומדפיס.",
    href: "/upload",
    hue: 280,
    art: "upload",
  },
];

export default function Categories() {
  return (
    <section id="categories" className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* This block used to open straight onto a grid of cards. On a page
            already carrying a lot, a section that begins without saying what
            it is reads as the previous one continuing — the reader is left to
            work out that something new started, and where. A heading is the
            cheapest possible fix and the one a designer asked for first. */}
        <div className="mb-8">
          <SectionHead
            eyebrow="THE SHELVES"
            title="מה יש בחנות."
            sub="שמונה מדפים. כל אחד נפתח לרשימה מלאה עם מחיר, חומר וזמן הדפסה."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATS.map((c) => (
            <Link
              key={c.index}
              href={c.href}
              className="group relative flex flex-col p-6 bg-ink-900 border border-ink-800 rounded-2xl hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-[11px] tracking-widest text-ink-500">
                  {c.index}
                </span>
                {c.popular && <Pill tone="flame">פופולרי</Pill>}
              </div>
              <div className="flex justify-center my-4 h-32">
                <CategoryArt
                  art={c.art}
                  hue={c.hue}
                  size={120}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="text-base md:text-lg font-extrabold tracking-tight mb-1.5">
                {c.title}
              </h3>
              <p className="text-ink-400 text-sm leading-relaxed mb-4 flex-1">
                {c.desc}
              </p>
              <div className="inline-flex items-center gap-1.5 text-flame font-semibold text-sm">
                <span>פתח {c.cta}</span>
                <Icon
                  name="arrowLeft"
                  size={14}
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
