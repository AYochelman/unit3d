"use client";
import { useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import ReviewForm from "@/components/ReviewForm";
import Icon from "@/components/ui/Icon";
import { useReviews } from "@/lib/use-reviews";
import { photoSrc } from "@/lib/assets";
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

export default function ReviewsClient() {
  // Whatever is in the repo, plus whatever customers published themselves.
  const { reviews } = useReviews();
  // With nothing to read yet, the form IS the page — it opens straight away
  // rather than hiding behind a button on an empty screen.
  const [showForm, setShowForm] = useState(reviews.length === 0);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
            REVIEWS{reviews.length ? ` · ${reviews.length}` : ""}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05]">
            לקוחות שדיברו.
          </h1>
          {/* The average is computed from what is actually here. The page used
              to print a hard-coded 4.9 — a number nobody had given. */}
          {reviews.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-ink-300">
              <span className="font-mono text-2xl text-flame font-bold" dir="ltr">
                {(() => {
                  const rated = reviews.filter((r) => r.stars);
                  return rated.length
                    ? (rated.reduce((n, r) => n + (r.stars ?? 0), 0) / rated.length).toFixed(1)
                    : "—";
                })()}
              </span>
              <span className="text-ink-500">/</span>
              <span className="font-mono text-ink-300" dir="ltr">5.0</span>
              <span className="text-ink-500">·</span>
              <span className="text-sm">{reviews.length} ביקורות</span>
            </div>
          )}
        </div>
        <Btn onClick={() => setShowForm((v) => !v)} icon={showForm ? "x" : "star"}>
          {showForm ? "סגור" : "השאר ביקורת"}
        </Btn>
      </header>

      {showForm && <div className="mb-10"><ReviewForm /></div>}

      {reviews.length === 0 && !showForm && (
        <div className="p-10 rounded-2xl border border-dashed border-ink-700 text-center">
          <p className="text-ink-100 font-semibold text-lg mb-2">עוד אין ביקורות כאן.</p>
          <p className="text-ink-300 max-w-md mx-auto leading-relaxed">
            החנות חדשה, ואנחנו מעדיפים עמוד ריק על פני ביקורות שלא נכתבו. הזמנת ממני?
            תכתוב מה יצא — עם רשותך זה יופיע כאן ראשון.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {reviews.map((r) => (
          <article
            key={r.id}
            className="p-6 rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-full text-ink-50 font-bold inline-flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #055A2D, #089a47)",
                  }}
                >
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold leading-tight">{r.name}</div>
                </div>
              </div>
              <Pill tone={SEG_TONE[r.seg]}>{SEG_LABEL[r.seg]}</Pill>
            </div>
            {!!r.stars && (
              <div className="flex gap-0.5 text-flame mb-3">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Icon key={i} name="star" size={16} className="fill-current" />
                ))}
              </div>
            )}

            {/* The photograph they sent.
                It is the review as much as any sentence is — it shows the
                thing, in their hands, in their home. Shown whole rather than
                cropped to a tidy square: it is theirs, not a product shot. */}
            {r.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc(r.photo)}
                alt={`תמונה שצילם ${r.name}`}
                loading="lazy"
                className="w-full rounded-xl border border-ink-800 bg-ink-950 object-contain max-h-80"
              />
            )}

            {r.txt ? (
              <p className="text-ink-200 leading-relaxed mt-3">{r.txt}</p>
            ) : (
              // Said plainly rather than left blank: an empty space under a
              // rating reads like something failed to load.
              <p className="text-ink-500 text-sm mt-3">דירוג ללא פירוט.</p>
            )}

            {r.when && (
              <div className="mt-4 pt-4 border-t border-ink-800">
                <span className="text-[11px] text-ink-500">{r.when}</span>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
