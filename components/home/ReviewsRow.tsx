import SectionHead from "@/components/ui/SectionHead";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { REVIEWS } from "@/lib/data";
import type { ReviewSeg } from "@/lib/types";

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

export default function ReviewsRow() {
  const featured = REVIEWS.slice(0, 4);

  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <SectionHead
            eyebrow="REVIEWS · 4.9 / 5.0"
            title="לקוחות אמיתיים. הזמנות אמיתיות."
          />
          <Btn as="a" href="/reviews" variant="ghost" iconRight="arrowLeft">
            כל הביקורות
          </Btn>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((r) => (
            <article
              key={r.id}
              className="p-5 rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <Pill tone={SEG_TONE[r.seg]}>{SEG_LABEL[r.seg]}</Pill>
                <div className="flex gap-0.5 text-flame">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Icon key={i} name="star" size={14} className="fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-ink-200 text-sm leading-relaxed line-clamp-5 flex-1">
                {r.txt}
              </p>
              <div className="mt-4 pt-4 border-t border-ink-800 flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full text-ink-50 font-bold inline-flex items-center justify-center text-sm"
                  style={{
                    background: "linear-gradient(135deg, #055A2D, #089a47)",
                  }}
                >
                  {r.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.name}</div>
                  <div className="text-[11px] text-ink-400 truncate">{r.tag}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
