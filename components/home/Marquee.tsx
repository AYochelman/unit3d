import Emblem from "@/components/Emblem";
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
    <section className="py-20 md:py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 mb-10">
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-3">
          RECENT WORK
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tightest leading-[1.05]">
          ככה זה נראה כשזה יוצא מהמדפסת.
        </h2>
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
              <div className="absolute inset-0 flex items-center justify-center">
                <Emblem shape={it.shape} hue={it.hue} size={170} />
              </div>
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
