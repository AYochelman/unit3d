"use client";
import { useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
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
  const [stars, setStars] = useState(5);
  const [submitted, setSubmitted] = useState(false);

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

      {showForm && !submitted && (
        <form
          className="mb-10 p-6 rounded-2xl bg-ink-900 border border-ink-800"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="שם מלא" required>
              <Input placeholder="שם פרטי + שם משפחה" required />
            </Field>
            <Field label="תיאור / יחידה / חברה" optional>
              <Input placeholder="חטיבה 51 / VP People · Acme" />
            </Field>
          </div>
          <Field label="סגמנט" required>
            <Select required defaultValue="private">
              <option value="private">לקוח פרטי</option>
              <option value="soldier">חייל/ת</option>
              <option value="family">משפחה</option>
              <option value="b2b">חברה</option>
            </Select>
          </Field>
          <div className="my-4">
            <div className="text-sm font-semibold text-ink-100 mb-2">
              דירוג <span className="text-flame">*</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  aria-label={`${n} כוכבים`}
                  className={n <= stars ? "text-flame" : "text-ink-700"}
                >
                  <Icon name="star" size={28} className="fill-current" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
          <Field label="הביקורת שלך" required>
            <Textarea placeholder="ספר על ההזמנה — מה הזמנת, איך היה התהליך, איך התוצאה." required />
          </Field>
          <div className="mt-5 flex justify-end">
            <Btn type="submit">פרסם ביקורת</Btn>
          </div>
        </form>
      )}

      {submitted && (
        <div className="mb-10 p-6 rounded-2xl border border-good/30 bg-good/10 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-good/20 text-good mb-3">
            <Icon name="check" size={24} strokeWidth={2.5} />
          </div>
          <div className="font-bold text-lg mb-1">תודה!</div>
          <div className="text-ink-300 text-sm">הביקורת שלך נשלחה. תפורסם אחרי אימות תוך 24 שעות.</div>
        </div>
      )}

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
