import Image from "next/image";
import Emblem from "@/components/Emblem";
import { photoSrc } from "@/lib/assets";
import Pill from "@/components/ui/Pill";
import { GALLERY } from "@/lib/data";
import type { GallerySeg } from "@/lib/types";

const SEG_LABEL: Record<GallerySeg, string> = {
  private: "פרטי",
  soldier: "חייל",
  b2b: "עסקי",
};

export default function Marquee() {
  const items = [...GALLERY, ...GALLERY, ...GALLERY].slice(0, 28);

  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      {/* This carried the same headline as ProductShowcase, word for word, and
          without its subtitle — so scrolling down produced what looked like the
          same section a second time, badly. Two blocks showing photographs need
          two reasons to exist: that one is the catalogue, this one is the
          stream of what has actually come off the plate lately. */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 mb-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-3">
          RECENT WORK
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tightest leading-[1.05]">
          מה יצא מהמדפסת <span className="text-flame">החודש</span>.
        </h2>
        <p className="text-ink-400 mt-3 max-w-2xl">
          הזמנות אמיתיות שנשלחו ללקוחות. עובר מעצמו — אפשר לעצור עם העכבר.
        </p>
      </div>

      <div className="relative">
        <div className="marquee-track flex gap-4 w-max">
          {items.map((it, i) => (
            <div
              key={`${it.id}-${i}`}
              className="relative w-72 h-72 shrink-0 rounded-2xl bg-ink-900 border border-ink-800 stripes overflow-hidden"
            >
              <div className="absolute top-3 right-3 z-10">
                <Pill tone={it.seg === "soldier" ? "flame" : it.seg === "b2b" ? "cyan" : "neutral"}>
                  {SEG_LABEL[it.seg]}
                </Pill>
              </div>
              {/* The photograph of the thing, when there is one.
                  This row calls itself "הזמנות אמיתיות שנשלחו ללקוחות" and then
                  drew a coloured shield for each of them — the eight real
                  studio photographs were already sitting on these same rows,
                  in `photo`, and nothing read the field. A drawn emblem over
                  that caption is the one thing the section must not be. */}
              <div className="absolute inset-0 flex items-center justify-center">
                {it.photo ? (
                  <Image
                    src={photoSrc(it.photo)}
                    alt={it.title}
                    fill
                    sizes="288px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Emblem shape={it.shape} hue={it.hue} size={170} />
                )}
              </div>
              {/* A photograph can be pale exactly where the caption sits. */}
              {it.photo && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/85 to-transparent" />
              )}
              <div
                className="absolute bottom-3 left-3 right-3 font-mono text-[10px] tracking-wider text-ink-300 truncate"
                dir="ltr"
              >
                {it.meta}
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-ink-950 to-transparent" />
      </div>
    </section>
  );
}
