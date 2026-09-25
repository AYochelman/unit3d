"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { CONTACT } from "@/lib/contact";
import { QUESTIONS, recommend, type Answers } from "@/lib/finder";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/**
 * The questionnaire. Three screens of chips, then a result.
 *
 * Every question, option and shelf lives in lib/finder.ts; this only walks
 * through them. The second question allows several answers because "a
 * figure, with a name on it" is one wish, not two.
 */
export default function FinderClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const done = step >= QUESTIONS.length;
  const q = QUESTIONS[step];
  const multi = q?.id === "what";
  const picked = q ? answers[q.id] ?? [] : [];

  const toggle = (id: string) => {
    if (!q) return;
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      const next = multi ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id];
      return { ...a, [q.id]: next };
    });
    if (!multi) setTimeout(() => setStep((s) => s + 1), 160);
  };

  const results = useMemo(() => (done ? recommend(answers) : []), [done, answers]);
  const top = results[0];
  const rest = results.slice(1, 3);

  const finish = () => {
    setStep(QUESTIONS.length);
    track("finder_done", { who: (answers.who ?? []).join(","), what: (answers.what ?? []).join(","), budget: (answers.budget ?? []).join(",") });
  };

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
          {done ? "RESULT" : `שאלה ${step + 1} מתוך ${QUESTIONS.length}`}
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tightest leading-[1.05]">
          {done ? "זה מה שמתאים לך." : "יש לנו מבחר גדול, אנחנו יודעים."}
        </h1>
        {!done && (
          <p className="mt-3 text-ink-300 leading-relaxed">שלוש שאלות, ואנחנו מכוונים אותך למקום הנכון.</p>
        )}
      </header>

      {/* progress */}
      <div className="flex gap-1.5 mb-8" aria-hidden>
        {QUESTIONS.map((x, i) => (
          <span key={x.id} className={cn("h-1 flex-1 rounded-full", i < step || done ? "bg-flame" : i === step ? "bg-flame/50" : "bg-ink-800")} />
        ))}
      </div>

      {!done && q && (
        <section aria-labelledby="finder-q">
          <h2 id="finder-q" className="text-xl font-bold mb-1">{q.title}</h2>
          {q.hint && <p className="text-ink-400 text-sm mb-4">{q.hint}</p>}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {q.options.map((o) => {
              const on = picked.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  aria-pressed={on}
                  className={cn(
                    "text-right p-4 rounded-2xl border transition-colors min-h-[3.25rem]",
                    on ? "border-flame bg-flame/10 text-ink-50" : "border-ink-800 bg-ink-900 hover:border-ink-600",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{o.label}</span>
                    {on && <Icon name="check" size={18} className="text-flame shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm text-ink-300 disabled:opacity-30 inline-flex items-center gap-1"
            >
              <Icon name="chevRight" size={16} /> חזרה
            </button>
            {multi && (
              <Btn onClick={() => (step === QUESTIONS.length - 1 ? finish() : setStep((s) => s + 1))} disabled={picked.length === 0} iconRight="chevLeft">
                המשך
              </Btn>
            )}
            {!multi && step === QUESTIONS.length - 1 && picked.length > 0 && (
              <Btn onClick={finish} iconRight="chevLeft">לתוצאה</Btn>
            )}
          </div>
        </section>
      )}

      {done && top && (
        <section>
          <Link
            href={top.href}
            onClick={() => track("shelf_open", { from: "finder", shelf: top.id })}
            className="block p-6 rounded-3xl border border-flame bg-flame/10 hover:bg-flame/15 transition-colors"
          >
            <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-2">ההמלצה שלנו</div>
            <div className="text-2xl font-black">{top.title}</div>
            <p className="mt-2 text-ink-200 leading-relaxed">{top.blurb}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-sm text-ink-300" dir="ltr">{top.price}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-flame">
                למדף <Icon name="chevLeft" size={16} />
              </span>
            </div>
          </Link>

          {rest.length > 0 && (
            <>
              <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mt-8 mb-3">גם יכול להתאים</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {rest.map((s) => (
                  <Link
                    key={s.id}
                    href={s.href}
                    onClick={() => track("shelf_open", { from: "finder", shelf: s.id })}
                    className="block p-4 rounded-2xl border border-ink-800 bg-ink-900 hover:border-flame transition-colors"
                  >
                    <div className="font-bold">{s.title}</div>
                    <div className="text-ink-300 text-sm mt-0.5">{s.blurb}</div>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Btn as="a" href={CONTACT.whatsapp} variant="outline" icon="whatsapp" target="_blank" rel="noreferrer"
              onClick={() => track("whatsapp_click", { from: "finder" })}>
              עדיין לא בטוח? דבר איתי
            </Btn>
            <button type="button" onClick={() => { setAnswers({}); setStep(0); }} className="text-sm text-ink-300 inline-flex items-center gap-1.5">
              <Icon name="rotate" size={16} /> מהתחלה
            </button>
          </div>
        </section>
      )}

      {done && !top && (
        <section>
          <p className="text-ink-300">לא הצלחנו לכוון — אבל בן אדם כן יכול.</p>
          <div className="mt-4"><Btn as="a" href={CONTACT.whatsapp} icon="whatsapp" target="_blank" rel="noreferrer">דבר איתי</Btn></div>
        </section>
      )}
    </div>
  );
}
