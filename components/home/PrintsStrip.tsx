import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

// Real photographs of real prints, taken in the studio on a phone.
//
// Everything else on this page is a card in a grid. This section deliberately
// is not: the pictures run at different heights, edge to edge, with no border
// and no coloured glow behind them. It is the one place on the home page where
// the work is allowed to be the whole thing.
//
// These are the owner's own photographs — the tiles, the IKEA receipt on the
// floor, the monitor in the background. That is the point. A perfectly lit
// studio shot would look like every other shop; a real bench does not.

type Shot = {
  src: string;
  alt: string;
  caption: string;
  /** Tall photos take one column, wide ones take two. */
  wide?: boolean;
};

const SHOTS: Shot[] = [
  {
    src: "/studio/print-04.jpg",
    alt: "דרקון מפרקי לבן על שולחן העבודה, מול המסך",
    caption: "דרקון מפרקי — יוצא מהמשטח כשהוא כבר מתנועע, בלי הרכבה ובלי דבק",
    wide: true,
  },
  {
    src: "/studio/print-02.jpg",
    alt: "פסל וורונוי שחור של דמות כורעת",
    caption: "רשת וורונוי בשחור — כל חור הודפס, לא נחתך",
    wide: true,
  },
  {
    src: "/studio/print-05.jpg",
    alt: "פסל חוטים אפור — דמות תלויה בתוך מסגרת קשת",
    caption: "פסל חוטים — הדמות תלויה על מאות חוטים דקים שנמתחו בהדפסה",
  },
  {
    src: "/studio/print-03.jpg",
    alt: "פיגורה מפרקית לבנה מוחזקת ביד",
    caption: "פיגורה מפרקית בלבן, בגודל כף יד",
  },
  {
    src: "/studio/print-01.jpg",
    alt: "מיכל מודפס בצבע חרדל עם מכסה מסתובב",
    caption: "הדפסה גדולה בחלק אחד — הצבע והברק הם של החומר, בלי צביעה",
  },
];

export default function PrintsStrip() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24" aria-label="ככה זה יוצא מהמדפסת">
      <div className="max-w-3xl mb-8">
        <div className="flex items-center gap-2 text-ink-400 text-xs font-semibold tracking-wide mb-3">
          <span className="w-6 h-px bg-ink-700" />
          <span>מהסטודיו</span>
        </div>
        <h2 className="font-display text-3xl md:text-[42px] font-bold leading-[1.15]">
          ככה זה יוצא מהמדפסת
        </h2>
        <p className="mt-4 text-ink-300 leading-relaxed">
          התמונות האלה צולמו כאן בטלפון, בלי סטודיו צילום ובלי עריכה. זה הצבע האמיתי של החומר
          וזאת רמת הפירוט שתקבל.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {SHOTS.map((s) => (
          <figure key={s.src} className={s.wide ? "col-span-2" : "col-span-1"}>
            <div className={`relative w-full overflow-hidden rounded-lg bg-ink-900 ${s.wide ? "aspect-[4/3]" : "aspect-[3/4]"}`}>
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-xs text-ink-400 leading-snug">{s.caption}</figcaption>
          </figure>
        ))}
      </div>

      <Link
        href="/gallery"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-flame hover:underline underline-offset-4"
      >
        עוד עבודות בגלריה
        <Icon name="arrowLeft" size={14} />
      </Link>
    </section>
  );
}
