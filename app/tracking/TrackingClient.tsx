"use client";
import { useState } from "react";
import Link from "next/link";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

const STEPS = [
  { key: "received", label: "פנייה התקבלה", sub: "אריאל קרא את הבקשה ויחזור אליך תוך 24 שעות.", date: "12.10 · 14:22" },
  { key: "approved", label: "עיצוב אושר", sub: "Render סופי אישרת ושילמת.", date: "13.10 · 09:08" },
  { key: "printing", label: "במדפסת", sub: "ה-G-code נטען. תוכל לצפות בלייב.", date: "13.10 · 11:30" },
  { key: "shipped", label: "נשלח", sub: "מספר מעקב יישלח בוואטסאפ.", date: "" },
  { key: "delivered", label: "הגיע", sub: "תיהנה. אם משהו לא בסדר — דבר איתי.", date: "" },
];

export default function TrackingClient() {
  const [order, setOrder] = useState("");
  const [lookedUp, setLookedUp] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-10 text-center">
        <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
          ORDER TRACKING
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05] mb-3">
          איפה ההזמנה שלי?
        </h1>
        <p className="text-ink-300">הזן את מספר ההזמנה — דוגמה: <span className="num text-flame">#4781</span></p>
      </header>

      <form
        className="flex flex-col md:flex-row gap-3 mb-12"
        onSubmit={(e) => {
          e.preventDefault();
          setLookedUp(true);
        }}
      >
        <Input
          dir="ltr"
          placeholder="#4781"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="h-14 text-lg font-mono text-center"
        />
        <Btn type="submit" size="lg" icon="search">
          מצא
        </Btn>
      </form>

      {lookedUp && (
        <article className="rounded-2xl bg-ink-900 border border-ink-800 p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-3 mb-6">
            <div>
              <div className="font-mono text-[11px] tracking-widest text-ink-500" dir="ltr">
                ORDER {order || "#4781"}
              </div>
              <div className="font-bold text-xl mt-0.5">מחזיק מפתחות · יואב</div>
            </div>
            <Link
              href="/livestream"
              className="text-flame font-semibold text-sm inline-flex items-center gap-1"
            >
              <Icon name="play" size={14} />
              צפה בשידור החי
            </Link>
          </div>

          <ol className="relative pr-4">
            <div className="absolute top-0 bottom-0 right-3.5 w-px bg-ink-800" />
            <div className="absolute top-0 right-3.5 w-px bg-flame" style={{ height: "50%" }} />
            {STEPS.map((s, i) => {
              const isDone = i < 2;
              const isActive = i === 2;
              const isFuture = i > 2;
              return (
                <li key={s.key} className="relative pb-7 last:pb-0">
                  <span
                    className={cn(
                      "absolute -right-1.5 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                      isDone && "bg-flame border-flame text-white",
                      isActive && "border-flame text-flame",
                      isFuture && "border-ink-700 bg-ink-900 text-ink-500",
                    )}
                  >
                    {isDone ? "✓" : isFuture ? i + 1 : ""}
                    {isActive && (
                      <span className="absolute inset-0 rounded-full bg-flame opacity-40 animate-ping" />
                    )}
                  </span>
                  <div className="pr-10">
                    <div
                      className={cn(
                        "font-bold text-base",
                        isDone || isActive ? "text-ink-50" : "text-ink-500",
                      )}
                    >
                      {s.label}
                    </div>
                    <div className="text-sm text-ink-400 mt-0.5 leading-relaxed">{s.sub}</div>
                    {s.date && (
                      <div className="font-mono text-[11px] text-ink-500 mt-1" dir="ltr">
                        {s.date}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </article>
      )}
    </div>
  );
}
