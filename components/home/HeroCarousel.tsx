"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Emblem from "@/components/Emblem";
import { photoSrc, assetSrc } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The five things this shop does, one at a time.
 *
 * A shelf of four hundred models tells a visitor nothing about which of them
 * is for him. Five slides do: a business, a soldier, a home, a desk, and the
 * machine itself. Each one goes somewhere different, because a slide that
 * looks like a door and behaves like a picture is worse than no slide.
 *
 * Everything here is real: photographs of things printed on this machine, and
 * a clip of the printer running. Nothing is a stock photo.
 */
type Slide = {
  id: string;
  kicker: string;
  title: string;
  line: string;
  href: string;
  photo?: string;
  video?: string;
  poster?: string;
  /** Drawn instead of a photograph, until there is one. */
  art?: boolean;
};

const SLIDES: Slide[] = [
  {
    id: "b2b",
    kicker: "לעסקים",
    title: "עיצוב עסקי",
    line: "כרטיסי ביקור, שלטים ומתנות ללקוחות — עם הלוגו שלכם בולט מהחומר.",
    href: "/b2b",
    photo: "/img/products/biz-card-3.webp",
  },
  {
    id: "soldiers",
    kicker: "לחיילים",
    title: "עיצוב מותאם לחיילים",
    line: "סמל היחידה שלכם, בצבעים שלו, מודפס בגודל שתבחרו.",
    href: "/catalog",
    art: true,
  },
  {
    id: "home",
    kicker: "לבית",
    title: "מוצרים אישיים לבית",
    line: "אגרטלים, תחתיות ומארגנים שנראים כמו חנות עיצוב ולא כמו הדפסה.",
    href: "/home",
    photo: "img/catalog/87e328817abb9345.webp",
  },
  {
    id: "office",
    kicker: "למשרד",
    title: "מוצרים מותאמים למשרד",
    line: "מעמדים, מארגנים וקליפסים — לשולחן שעובדים עליו כל יום.",
    href: "/office",
    photo: "img/catalog/3b14e49e6777c7e0.webp",
  },
  {
    id: "live",
    kicker: "שידור חי",
    title: "צפו בנו מדפיסים",
    line: "המדפסת משדרת מהסטודיו בזמן אמת. בלי עריכה, בלי פילטרים.",
    href: "/#live",
    video: "/videos/hero-live.mp4",
    poster: "/videos/posters/hero-live.jpg",
  },
];

const EVERY_MS = 6000;

export default function HeroCarousel() {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((i: number) => setAt(((i % SLIDES.length) + SLIDES.length) % SLIDES.length), []);

  // Someone who asked for less motion gets none: the slides stay where they
  // are and the dots still work.
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAuto(!m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!auto || paused) return;
    const id = setInterval(() => setAt((i) => (i + 1) % SLIDES.length), EVERY_MS);
    return () => clearInterval(id);
  }, [auto, paused]);

  // A swipe is how this is used on a phone.
  const touchX = useRef(0);

  return (
    <div
      className="max-w-5xl mx-auto px-6 md:px-10 mb-12 md:mb-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="relative rounded-2xl overflow-hidden border border-ink-800 bg-ink-950"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          // RTL: dragging left moves forward, the way a page turns here.
          if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1));
        }}
      >
        {/* Two columns, not a stretched backdrop.
            The catalogue photographs are 400px wide — the size a shop listing
            needs. Blown across a 16:9 banner they turn to mush, and a slide
            whose picture is a drawing ends up mostly empty space. Given its own
            panel, each picture is shown at a size it can actually fill, and the
            words sit beside it instead of on top of it. */}
        <div className="relative min-h-[320px] sm:min-h-[360px] md:min-h-[420px]">
          {SLIDES.map((s, i) => (
            <Link
              key={s.id}
              href={s.href}
              aria-hidden={i !== at}
              tabIndex={i === at ? 0 : -1}
              className={cn(
                "absolute inset-0 grid md:grid-cols-2 transition-opacity duration-700 motion-reduce:transition-none",
                i === at ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            >
              <span className="relative flex items-center justify-center bg-ink-900/60 p-4 md:p-6 overflow-hidden">
                {s.video ? (
                  <video
                    src={assetSrc(s.video)}
                    poster={assetSrc(s.poster)}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-full w-auto max-w-full rounded-xl object-contain"
                  />
                ) : s.art ? (
                  <Emblem shape="wings" hue={140} size={150} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc(s.photo!)}
                    alt={s.title}
                    // Never enlarged past what the file actually holds: a 400px
                    // photograph shown at 400px is sharp, and at 1000px is mud.
                    className="max-h-full w-auto max-w-full rounded-xl object-contain"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                )}
              </span>

              <span className="flex flex-col justify-center p-5 md:p-8 text-right">
                <span className="font-mono text-[10px] md:text-xs tracking-widest uppercase text-flame block mb-1.5">
                  {s.kicker}
                </span>
                <span className="block text-2xl md:text-4xl font-black tracking-tight text-ink-50 leading-tight">
                  {s.title}
                </span>
                <span className="mt-2 block text-sm md:text-base text-ink-300">
                  {s.line}
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-flame">
                  {/* RTL: forward is a left-pointing arrow. */}
                  <Icon name="arrowLeft" size={16} />
                  {s.id === "live" ? "לצפייה בשידור" : "לצפייה במדף"}
                </span>
              </span>
            </Link>
          ))}
        </div>

      </div>

      {/* Controls below the frame, never over the words.
          At the edges of a two-column slide they landed on top of the
          sentence, which is both ugly and a target that covers a link. */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(at - 1)}
          aria-label="השקופית הקודמת"
          className="h-9 w-9 rounded-full border border-ink-700 text-ink-300 hover:border-flame hover:text-flame transition-colors inline-flex items-center justify-center"
        >
          <Icon name="arrowRight" size={16} />
        </button>

        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            aria-label={s.title}
            aria-current={i === at}
            className={cn(
              "h-2 rounded-full transition-all",
              i === at ? "w-7 bg-flame" : "w-2 bg-ink-700 hover:bg-ink-600",
            )}
          />
        ))}

        <button
          type="button"
          onClick={() => go(at + 1)}
          aria-label="השקופית הבאה"
          className="h-9 w-9 rounded-full border border-ink-700 text-ink-300 hover:border-flame hover:text-flame transition-colors inline-flex items-center justify-center"
        >
          <Icon name="arrowLeft" size={16} />
        </button>
      </div>
    </div>
  );
}
