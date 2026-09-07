"use client";
import { useRef, useState } from "react";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import SectionHead from "@/components/ui/SectionHead";
import { assetSrc } from "@/lib/assets";
import { cn } from "@/lib/cn";

/**
 * The printer, actually printing.
 *
 * This block used to be a play button over a CSS gradient — an invitation to
 * watch a workshop that was never shown. These are the machine's own timelapses
 * off the build plate: silent, so they loop muted without asking, and short, so
 * the whole set costs less than one product photograph used to.
 */
const CLIPS = [
  { file: "motion-20260716", label: "הדפסה מלאה מ-0", date: "16.07" },
  { file: "motion-20260613", label: "שכבה ראשונה על הפלטה", date: "13.06" },
  { file: "motion-20260704", label: "מגש חלקים בלבן", date: "04.07" },
  { file: "motion-20260723", label: "חלק כחול יורד מהפלטה", date: "23.07" },
  { file: "motion-20260707", label: "כוכב בהדפסה שטוחה", date: "07.07" },
] as const;

export default function LivePreview() {
  const [at, setAt] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const clip = CLIPS[at];

  const play = (i: number) => {
    setAt(i);
    // A new src needs a nudge; without it the poster sits there on iOS.
    requestAnimationFrame(() => video.current?.play().catch(() => {}));
  };

  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-2">
            <SectionHead
              eyebrow="FROM THE BUILD PLATE"
              title={
                <>
                  רוצים לראות אותנו <span className="text-flame">בפעולה?</span>
                </>
              }
              sub="צילומים מהמדפסת עצמה, מהפלטה, בלי עריכה ובלי פילטרים. כי שירות הדפסה אמיתי לא מסתיר את הסדנה."
            />
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Btn as="a" href="/livestream" icon="play">
                צפה בלייב
              </Btn>
              <Btn as="a" href="/tracking" variant="ghost" icon="search">
                איפה ההזמנה שלי?
              </Btn>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-ink-800 bg-ink-950">
              <video
                ref={video}
                key={clip.file}
                className="absolute inset-0 h-full w-full object-cover"
                src={assetSrc(`/videos/${clip.file}.mp4`)}
                poster={assetSrc(`/videos/posters/${clip.file}.jpg`)}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                controls
              />
              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <Pill tone="bad">
                  <span className="w-1.5 h-1.5 rounded-full bg-bad live-dot" />
                  מהסדנה
                </Pill>
              </div>
              <div
                className="absolute top-4 left-4 z-10 pointer-events-none font-mono text-[10px] tracking-widest text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1 rounded"
                dir="ltr"
              >
                {clip.date}
              </div>
            </div>

            {/* The rest of the set — a still each, so nothing downloads until asked. */}
            <div className="mt-3 grid grid-cols-5 gap-2">
              {CLIPS.map((c, i) => (
                <button
                  key={c.file}
                  type="button"
                  onClick={() => play(i)}
                  aria-label={c.label}
                  aria-current={i === at ? "true" : undefined}
                  className={cn(
                    "group relative aspect-video rounded-lg overflow-hidden border transition-colors",
                    i === at ? "border-flame" : "border-ink-800 hover:border-ink-600",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetSrc(`/videos/posters/${c.file}.jpg`)}
                    alt={c.label}
                    loading="lazy"
                    className={cn(
                      "h-full w-full object-cover transition-opacity",
                      i === at ? "opacity-100" : "opacity-60 group-hover:opacity-90",
                    )}
                  />
                  {i !== at && (
                    <span className="absolute inset-0 flex items-center justify-center text-ink-100">
                      <Icon name="play" size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
