"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import Emblem from "@/components/Emblem";
import { GALLERY, GALLERY_CATS } from "@/lib/data";
import { useOrderStore } from "@/lib/order-store";
import { cn } from "@/lib/cn";
import type { GalleryItem } from "@/lib/types";

const RATIOS = [1, 1.2, 0.85, 1.4, 1];

export default function GalleryClient() {
  const params = useSearchParams();
  const initialCat = params?.get("cat") ?? "all";
  const [cat, setCat] = useState<string>(initialCat);
  const [active, setActive] = useState<GalleryItem | null>(null);
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);

  // Follow ?cat= changes from the URL without a setState-in-effect round trip.
  const [prevInitialCat, setPrevInitialCat] = useState(initialCat);
  if (prevInitialCat !== initialCat) {
    setPrevInitialCat(initialCat);
    setCat(initialCat);
  }

  const items = useMemo(
    () => (cat === "all" ? GALLERY : GALLERY.filter((g) => g.cat === cat)),
    [cat],
  );

  const wantSimilar = (g: GalleryItem) => {
    setOrder({
      title: `דומה ל-${g.title}`,
      summary: [`השראה: ${g.title}`, g.meta, "אני רוצה משהו דומה — דבר איתי על התאמות"],
      price: null,
      source: "gallery",
      meta: { galleryId: g.id },
    });
    router.push("/contact");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
          GALLERY · {GALLERY.length} ITEMS
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05]">
          ככה זה נראה.
        </h1>
        <p className="mt-3 text-ink-300 max-w-xl">
          עבודות מהזמן האחרון. לחץ על תמונה כדי לראות פרטים — או &quot;אני רוצה משהו דומה&quot;.
        </p>
      </header>

      <div className="sticky top-16 z-20 bg-ink-950/85 backdrop-blur-md py-4 -mx-6 px-6 md:-mx-10 md:px-10 border-b border-ink-800 mb-8">
        <div className="flex flex-wrap gap-1.5">
          {GALLERY_CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                cat === c.id
                  ? "bg-flame text-white border-flame"
                  : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {items.map((g, i) => {
          const aspect = RATIOS[i % RATIOS.length];
          return (
            <button
              key={g.id}
              onClick={() => setActive(g)}
              className="group relative w-full block mb-4 break-inside-avoid rounded-2xl overflow-hidden border border-ink-800 hover:border-ink-700 transition-all"
              style={{
                aspectRatio: aspect,
                background: `radial-gradient(circle at 50% 40%, hsla(${g.hue}, 70%, 50%, 0.18), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Emblem shape={g.shape} hue={g.hue} size={130} className="spin-y" />
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-950/75 flex flex-col items-end justify-end p-4 text-right gap-2">
                <Icon name="expand" size={20} className="text-flame self-start" />
                <div className="font-bold text-ink-50">{g.title}</div>
                <div className="font-mono text-[11px] text-ink-300" dir="ltr">{g.meta}</div>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="סגור"
            onClick={() => setActive(null)}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
          />
          <div className="relative h-full flex items-center justify-center p-4">
            <div className="relative bg-ink-900 border border-ink-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="סגור"
                className="absolute top-3 left-3 z-10 h-9 w-9 rounded-full bg-ink-950/70 backdrop-blur text-ink-200 inline-flex items-center justify-center hover:text-flame"
              >
                <Icon name="x" size={18} />
              </button>
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div
                  className="aspect-square rounded-xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, hsla(${active.hue}, 70%, 50%, 0.22), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
                  }}
                >
                  <Emblem shape={active.shape} hue={active.hue} size={200} />
                </div>
                <div>
                  <Pill tone="flame" className="mb-3">
                    {GALLERY_CATS.find((c) => c.id === active.cat)?.label}
                  </Pill>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1.5">
                    {active.title}
                  </h2>
                  <div className="font-mono text-xs text-ink-400 mb-5" dir="ltr">
                    {active.meta}
                  </div>
                  <div className="space-y-4 text-sm leading-relaxed text-ink-300">
                    <div>
                      <div className="font-mono text-[10px] text-flame uppercase tracking-widest mb-1">החומר</div>
                      <p>נבחר לפי שילוב של עמידות, גימור, ועלות. רוב ההזמנות יוצאות ב-PLA או PLA+.</p>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-flame uppercase tracking-widest mb-1">האתגר</div>
                      <p>חלקים דקים הצריכו supports במיקום מדויק. שתי חזרות עד שהפרופורציה התיישבה.</p>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-flame uppercase tracking-widest mb-1">משלוח</div>
                      <p>נשלח באריזה ייעודית עם רפידה בנדון לפגיעות. הגיעה במצב מושלם תוך 3 ימים.</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Btn icon="arrowLeft" onClick={() => wantSimilar(active)}>
                      אני רוצה משהו דומה
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
