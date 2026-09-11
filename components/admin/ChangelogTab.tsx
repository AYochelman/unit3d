"use client";
import { useMemo, useState } from "react";
import Pill from "@/components/ui/Pill";
import { CHANGELOG, KIND_HE, agoLabel, changeCount, dayLabel, type ChangeKind } from "@/lib/changelog";
import { cn } from "@/lib/cn";

/**
 * What the shop has gained, day by day.
 *
 * A shop built in conversation is hard to hold in your head — a feature that
 * took an afternoon is forgotten a week later, and there is no way to answer
 * "what did we actually do". This is that answer: one line per capability,
 * newest first, in the words the owner would use rather than the code's.
 */
const TONE: Record<ChangeKind, "flame" | "good" | "neutral" | "cyan"> = {
  feature: "flame",
  fix: "good",
  content: "cyan",
  admin: "neutral",
};

const FILTERS: { id: ChangeKind | "all"; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "feature", label: "חדש" },
  { id: "fix", label: "תיקונים" },
  { id: "content", label: "תוכן" },
  { id: "admin", label: "ניהול" },
];

export default function ChangelogTab() {
  const [filter, setFilter] = useState<ChangeKind | "all">("all");

  const days = useMemo(
    () =>
      CHANGELOG.map((d) => ({
        ...d,
        items: filter === "all" ? d.items : d.items.filter((i) => i.kind === filter),
      })).filter((d) => d.items.length > 0),
    [filter],
  );

  const total = changeCount();
  const first = CHANGELOG[CHANGELOG.length - 1]?.date;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">היסטוריית עדכונים</h2>
        <p className="text-sm text-ink-400 mt-1">
          {total} שינויים על פני {CHANGELOG.length} ימי עבודה
          {first && `, מאז ${dayLabel(first)}`}. הכי חדש למעלה.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[13px] border transition-colors",
              filter === f.id
                ? "bg-flame-600 text-white border-flame"
                : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.date}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2.5">
              <h3 className="font-bold">{dayLabel(day.date)}</h3>
              <span className="font-mono text-[11px] text-ink-600" dir="ltr">{day.date}</span>
              <span className="text-[11px] text-ink-500">{agoLabel(day.date)}</span>
              <span className="flex-1" />
              <span className="text-[11px] text-ink-600">{day.items.length} שינויים</span>
            </div>

            {/* The line down the side is what turns a list into a timeline —
                it is the only thing saying these belong to one day. */}
            <ul className="space-y-2 border-e border-ink-800 pe-4">
              {day.items.map((item, i) => (
                <li key={i} className="relative flex items-start gap-3">
                  <span
                    className="absolute top-2.5 -end-[17px] w-1.5 h-1.5 rounded-full bg-ink-700"
                    aria-hidden="true"
                  />
                  <Pill tone={TONE[item.kind]} className="shrink-0 mt-0.5 text-[10px]">
                    {KIND_HE[item.kind]}
                  </Pill>
                  <span className="text-sm text-ink-200 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {days.length === 0 && (
          <p className="text-sm text-ink-500 py-8 text-center">אין שינויים מהסוג הזה.</p>
        )}
      </div>

      <p className="text-[11px] text-ink-600 border-t border-ink-800 pt-4">
        הרשימה נכתבת ביד ולא נגזרת מהקוד: עשרים תיקונים של אותה מצלמה הם שורה אחת כאן,
        כי מה שמעניין זה מה החנות יודעת לעשות, לא כמה פעמים נגענו בזה.
      </p>
    </div>
  );
}
