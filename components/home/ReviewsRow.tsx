import Link from "next/link";
import SectionHead from "@/components/ui/SectionHead";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Image from "next/image";
import ProductArt from "@/components/ProductArt";
import { photoById } from "@/lib/photos";
import { REVIEWS } from "@/lib/data";
import type { Review, ReviewSeg } from "@/lib/types";

const SEG_LABEL: Record<ReviewSeg, string> = {
  private: "פרטי",
  soldier: "חייל",
  family: "מתנה",
  b2b: "עסקי",
};

const SEG_TONE: Record<ReviewSeg, "neutral" | "flame" | "cyan" | "good"> = {
  private: "neutral",
  soldier: "flame",
  family: "good",
  b2b: "cyan",
};

const AVG = (REVIEWS.reduce((n, r) => n + r.stars, 0) / REVIEWS.length).toFixed(1);

/**
 * The exact product each review is about.
 *
 * Only a review that is genuinely about a catalogue item is mapped: a picture
 * of a fox next to a review about a cat, or a USB cable guard next to a review
 * about a coffee-machine part, reads as fake — which is worse than a drawing.
 * Unit emblems and branded batches are made to order, have no product page,
 * and keep their illustration.
 */
const REVIEW_ITEM: Record<string, string | null> = {
  r1: null,               // unit emblem — made to order
  r2: null,               // three unit keychains
  r3: "mw-1645081",       // דרקון מינימליסטי
  r4: null,               // unit emblem statue
  r5: null,               // 80 branded keychains
  r6: "mw-1971172",       // וו מגבת נועל-אוטומטי
  r7: null,               // unit emblem
  r8: null,               // 35 branded figurines
  r9: "mw-1645161",       // שועל חולם · לואו-פולי
  r10: "mw-90174",        // דרקון מפרקי גמיש
  r11: "mw-2868647",      // תג לחיה עם שם וטלפון
  r12: "mw-2125984",      // מעמד עטים ואגרטל · וורונוי
  r13: "mw-2735060",      // סמיסקי עם חתול על הראש
  r14: "mw-26806",        // מעמד כרטיסי ביקור
};
function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} מתוך 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          name="star"
          size={13}
          className={i < n ? "fill-current text-amber2" : "text-ink-700"}
        />
      ))}
    </span>
  );
}

/**
 * One review card: a picture of what they ordered, the rating, the comment,
 * and who wrote it. The picture is the product illustration for the item they
 * bought — the same drawing the shop uses on that product's own card.
 */
function ReviewCard({ r }: { r: Review }) {
  const photo = photoById(REVIEW_ITEM[r.id]);
  const Body = (
    <>
      <div
        className={`relative h-28 flex items-center justify-center shrink-0 ${photo ? "bg-ink-800" : "bg-ink-900"}`}
        style={
          photo
            ? undefined
            : { background: "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.055), transparent 62%)" }
        }
      >
        {photo ? (
          <Image src={photo.src} alt={photo.name} fill sizes="300px" className="object-cover" unoptimized />
        ) : (
          <ProductArt art={r.art ?? "keychain"} hue={r.hue ?? 145} size={92} />
        )}
        <span className="absolute top-2 right-2">
          <Pill tone={SEG_TONE[r.seg]} className="text-[10px] px-1.5 py-0.5">{SEG_LABEL[r.seg]}</Pill>
        </span>

      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Stars n={r.stars} />
          <span className="font-mono text-xs text-ink-300" dir="ltr">{r.stars.toFixed(1)}</span>
          {r.when && <span className="text-[10px] text-ink-500 mr-auto">{r.when}</span>}
        </div>

        {r.item && (
          <div className="text-[11px] text-ink-400 mb-1.5 truncate">
            הזמין: <span className="text-ink-200">{r.item}</span>
          </div>
        )}

        <p className="text-ink-200 text-sm leading-relaxed line-clamp-4">{r.txt}</p>

        {/* Answering the review that went wrong is worth more than hiding it. */}
        {r.reply && (
          <div className="mt-2.5 rounded-lg border-r-2 border-ink-600 bg-ink-950/60 px-3 py-2">
            <div className="text-[10px] font-semibold text-ink-400 mb-0.5">אריאל, Unit 3D</div>
            <p className="text-[12px] leading-relaxed text-ink-300 line-clamp-3">{r.reply}</p>
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-4 pt-3 border-t border-ink-800 flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full text-ink-50 font-bold inline-flex items-center justify-center text-sm shrink-0"
            style={{ background: `linear-gradient(135deg, hsl(${r.hue ?? 145}, 60%, 26%), hsl(${r.hue ?? 145}, 65%, 42%))` }}
          >
            {r.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{r.name}</div>
          </div>
        </div>
      </div>
    </>
  );

  const cls =
    "w-[300px] shrink-0 rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 transition-colors flex flex-col overflow-hidden";

  return r.href ? (
    <Link href={r.href} className={cls} dir="rtl">{Body}</Link>
  ) : (
    <article className={cls} dir="rtl">{Body}</article>
  );
}

function Track({ items, reverse }: { items: Review[]; reverse?: boolean }) {
  return (
    <div className="reviews-row" dir="ltr">
      <div className={reverse ? "reviews-track reviews-track--reverse" : "reviews-track"}>
        {[...items, ...items].map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} r={r} />
        ))}
      </div>
    </div>
  );
}

/**
 * Customer reviews as two continuously moving strips in opposite directions.
 * Pauses on hover so a review can be read; each track is duplicated for a
 * seamless loop. Motion is disabled under prefers-reduced-motion (globals.css).
 */
export default function ReviewsRow() {
  const half = Math.ceil(REVIEWS.length / 2);
  return (
    <section className="py-20 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <SectionHead eyebrow={`${AVG} מתוך 5 · ${REVIEWS.length} ביקורות`} title="מה כתבו אחרי שקיבלו את החבילה" />
          <Btn as="a" href="/reviews" variant="ghost" iconRight="arrowLeft">
            כל הביקורות
          </Btn>
        </div>
        {/* Rating summary — the number, how it breaks down, and a way to add to it */}
        <div className="mb-8 grid sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-8 gap-y-4 items-center p-5 rounded-2xl bg-ink-900 border border-ink-800">
          <div className="text-center sm:text-right">
            <div className="font-mono text-5xl font-black text-flame leading-none" dir="ltr">{AVG}</div>
            <div className="mt-1.5 flex justify-center sm:justify-start"><Stars n={5} /></div>
            <div className="text-[11px] text-ink-400 mt-1">{REVIEWS.length} ביקורות</div>
          </div>

          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = REVIEWS.filter((r) => r.stars === n).length;
              const pct = Math.round((count / REVIEWS.length) * 100);
              return (
                <div key={n} className="flex items-center gap-2 text-[11px]">
                  <span className="w-3 text-ink-400 font-mono" dir="ltr">{n}</span>
                  <Icon name="star" size={10} className="fill-current text-flame shrink-0" />
                  <span className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                    <span className="block h-full bg-flame" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-7 text-left text-ink-500 font-mono" dir="ltr">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="text-center sm:text-right">
            <Btn as="a" href="/reviews" icon="star">דרג אותנו</Btn>
            <div className="text-[11px] text-ink-500 mt-2">כל הביקורות מלקוחות שקיבלו הזמנה</div>
          </div>
        </div>
      </div>
      <div className="relative space-y-4">
        <Track items={REVIEWS.slice(0, half)} />
        <Track items={REVIEWS.slice(half)} reverse />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink-950 to-transparent" />
      </div>
    </section>
  );
}
