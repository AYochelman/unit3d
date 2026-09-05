"use client";
import { useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import ReviewForm from "@/components/ReviewForm";
import Icon from "@/components/ui/Icon";
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

export default function ReviewsClient() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
            REVIEWS · {REVIEWS.length}+
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05]">
            לקוחות שדיברו.
          </h1>
          <div className="mt-3 flex items-center gap-2 text-ink-300">
            <span className="font-mono text-2xl text-flame font-bold" dir="ltr">
              4.9
            </span>
            <span className="text-ink-500">/</span>
            <span className="font-mono text-ink-300" dir="ltr">5.0</span>
            <span className="text-ink-500">·</span>
            <span className="text-sm">{REVIEWS.length}+ ביקורות מאומתות</span>
          </div>
        </div>
        <Btn onClick={() => setShowForm((v) => !v)} icon={showForm ? "x" : "star"}>
          {showForm ? "סגור" : "השאר ביקורת"}
        </Btn>
      </header>

      {showForm && <div className="mb-10"><ReviewForm /></div>}

      <div className="grid md:grid-cols-2 gap-5">
        {REVIEWS.map((r) => (
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
                  <div className="text-[11px] text-ink-400 mt-0.5">{r.tag}</div>
                </div>
              </div>
              <Pill tone={SEG_TONE[r.seg]}>{SEG_LABEL[r.seg]}</Pill>
            </div>
            <div className="flex gap-0.5 text-flame mb-3">
              {Array.from({ length: r.stars }).map((_, i) => (
                <Icon key={i} name="star" size={16} className="fill-current" />
              ))}
            </div>
            <p className="text-ink-200 leading-relaxed">{r.txt}</p>
            <div className="mt-4 pt-4 border-t border-ink-800 flex items-center justify-between">
              <span
                className="font-mono text-[10px] tracking-widest uppercase text-ink-500"
                dir="ltr"
              >
                VERIFIED ORDER · 2024
              </span>
              <button className="text-xs text-ink-400 hover:text-flame transition-colors">
                מועיל
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
