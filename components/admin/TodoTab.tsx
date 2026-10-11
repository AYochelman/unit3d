"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { useSupabaseSession } from "@/lib/use-supabase-session";
import { loadTodos, newTodoId, saveTodos, type Todo } from "@/lib/todos-remote";
import { cn } from "@/lib/cn";

const today = () => new Date().toISOString().slice(0, 10);

const dueLabel = (d: string): { text: string; late: boolean } => {
  const days = Math.round((Date.parse(`${d}T00:00:00`) - Date.parse(`${today()}T00:00:00`)) / 86_400_000);
  if (days < 0) return { text: `באיחור של ${-days === 1 ? "יום" : `${-days} ימים`}`, late: true };
  if (days === 0) return { text: "היום", late: true };
  if (days === 1) return { text: "מחר", late: false };
  return { text: `${d.slice(8, 10)}.${d.slice(5, 7)}`, late: false };
};

/** Urgent first, then by due date (none last), then oldest first. */
const order = (a: Todo, b: Todo) =>
  Number(!!b.urgent) - Number(!!a.urgent) ||
  (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
  a.createdAt.localeCompare(b.createdAt);

/**
 * The owner's to-do list: what to print, buy, answer, fix.
 *
 * Saved to his private database on every change, so it is the same list on
 * the computer and on the phone. Same sign-in as orders and expenses.
 */
export default function TodoTab() {
  const { token, email, setEmail, busy: authBusy, error: authErr, setError: setAuthErr, tried, signIn, signOut } = useSupabaseSession();
  const [pw, setPw] = useState("");
  const [list, setList] = useState<Todo[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void loadTodos(token).then((l) => {
      if (!alive) return;
      if (l) { setList(l); setLoadErr(false); } else setLoadErr(true);
    });
    return () => { alive = false; };
  }, [token]);

  // Every change is written at once; a failure says so instead of leaving a
  // list on screen that exists nowhere else.
  const commit = (next: Todo[]) => {
    setList(next);
    if (token) void saveTodos(token, next).then((ok) => setSaveErr(!ok));
  };

  const add = () => {
    const t = text.trim();
    if (!t || !list) return;
    commit([...list, { id: newTodoId(), text: t, done: false, urgent: urgent || undefined, due: due || undefined, createdAt: new Date().toISOString() }]);
    setText(""); setDue(""); setUrgent(false);
    input.current?.focus();
  };

  const patch = (id: string, p: Partial<Todo>) => list && commit(list.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const toggle = (t: Todo) => patch(t.id, t.done ? { done: false, doneAt: undefined } : { done: true, doneAt: new Date().toISOString() });
  const drop = (id: string) => list && commit(list.filter((t) => t.id !== id));
  const saveEdit = () => {
    if (editing && draft.trim()) patch(editing, { text: draft.trim() });
    setEditing(null);
  };

  const open = useMemo(() => (list ?? []).filter((t) => !t.done).sort(order), [list]);
  const done = useMemo(() => (list ?? []).filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "")), [list]);

  const header = (
    <div>
      <h2 className="text-lg font-black mb-1">משימות</h2>
      <p className="text-xs text-ink-500">
        מה להדפיס, לקנות, לענות, לתקן. נשמר מיד ובאותה רשימה במחשב ובטלפון.
      </p>
    </div>
  );

  if (!token) {
    return (
      <div className="space-y-4">
        {header}
        {!tried ? (
          <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div>
        ) : (
          <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3 max-w-sm">
            <div className="text-sm font-bold">כניסה</div>
            <p className="text-[11px] text-ink-500">אותה כניסה של ההזמנות וההוצאות.</p>
            <Input type="email" dir="ltr" placeholder="מייל" value={email} onChange={(e) => { setEmail(e.target.value); setAuthErr(""); }} />
            <Input
              type="password" dir="ltr" placeholder="סיסמה" value={pw}
              onChange={(e) => { setPw(e.target.value); setAuthErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void signIn(email, pw).then((ok) => ok && setPw("")); }}
            />
            <div className="flex items-center gap-2">
              <Btn size="sm" onClick={() => void signIn(email, pw).then((ok) => ok && setPw(""))} disabled={authBusy || !email.trim() || !pw}>
                {authBusy ? "רגע…" : "כניסה"}
              </Btn>
              {authErr && <span className="text-xs text-bad">{authErr}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {header}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-500">מחובר{email ? ` · ${email}` : ""}</span>
        <button type="button" onClick={signOut} className="text-[11px] text-ink-500 hover:text-bad underline">יציאה</button>
        {saveErr && <span className="text-xs text-bad">השמירה נכשלה — השינוי האחרון לא נשמר. נסה שוב.</span>}
      </div>

      {loadErr && (
        <div className="p-4 rounded-2xl border border-bad/40 bg-bad/5 text-sm">
          לא הצלחתי לקרוא את הרשימה. <button type="button" className="underline" onClick={() => window.location.reload()}>רענון</button>
        </div>
      )}

      {list && (
        <>
          <div className="p-3 rounded-2xl border border-ink-800 bg-ink-900/40 flex flex-wrap items-center gap-2">
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="משימה חדשה — Enter להוספה"
              aria-label="משימה חדשה"
              className="flex-1 min-w-[12rem] h-11 px-3.5 rounded-lg bg-ink-900 border border-ink-700 text-ink-50 placeholder:text-ink-500 focus:border-flame outline-none"
            />
            <input
              type="date" dir="ltr" value={due} onChange={(e) => setDue(e.target.value)} aria-label="עד מתי"
              className="h-11 px-2 rounded-lg bg-ink-900 border border-ink-700 text-ink-200 text-sm focus:border-flame outline-none"
            />
            <button
              type="button"
              onClick={() => setUrgent((u) => !u)}
              aria-pressed={urgent}
              title="דחוף — מופיע ראשון"
              className={cn("h-11 px-3 rounded-lg border text-sm inline-flex items-center gap-1.5", urgent ? "border-flame bg-flame/10 text-flame" : "border-ink-700 text-ink-400")}
            >
              <Icon name="star" size={14} /> דחוף
            </button>
            <Btn size="sm" icon="plus" onClick={add} disabled={!text.trim()}>הוספה</Btn>
          </div>

          {open.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">
              {done.length ? "הכל בוצע 🎉" : "אין משימות. הראשונה נוספת למעלה."}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {open.map((t) => {
                const d = t.due ? dueLabel(t.due) : null;
                return (
                  <li key={t.id} className={cn("flex items-center gap-3 rounded-xl border bg-ink-900 px-3 py-2.5", t.urgent ? "border-flame/50" : "border-ink-800")}>
                    <button
                      type="button"
                      onClick={() => toggle(t)}
                      aria-label={`סימון כבוצע: ${t.text}`}
                      className="shrink-0 w-6 h-6 rounded-md border-2 border-ink-600 hover:border-good"
                    />
                    {editing === t.id ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                        aria-label="עריכת משימה"
                        className="flex-1 h-8 px-2 rounded-md bg-ink-950 border border-flame/60 text-sm outline-none"
                      />
                    ) : (
                      <button type="button" onClick={() => { setEditing(t.id); setDraft(t.text); }} className="flex-1 text-start text-sm break-words" title="לחיצה לעריכה">
                        {t.text}
                      </button>
                    )}
                    {d && <span className={cn("text-[11px] whitespace-nowrap", d.late ? "text-bad font-bold" : "text-ink-400")}>{d.text}</span>}
                    <button
                      type="button"
                      onClick={() => patch(t.id, { urgent: t.urgent ? undefined : true })}
                      aria-label={t.urgent ? "ביטול דחוף" : "סימון כדחוף"}
                      className={cn("shrink-0", t.urgent ? "text-flame" : "text-ink-600 hover:text-ink-300")}
                    >
                      <Icon name="star" size={15} />
                    </button>
                    <button type="button" onClick={() => drop(t.id)} aria-label={`מחיקה: ${t.text}`} className="shrink-0 text-ink-600 hover:text-bad">
                      <Icon name="x" size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {done.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowDone((s) => !s)} className="text-[12px] text-ink-400 hover:text-ink-100">
                  {showDone ? "▾" : "◂"} בוצעו ({done.length})
                </button>
                {showDone && (
                  <button type="button" onClick={() => commit(list.filter((t) => !t.done))} className="text-[11px] text-ink-500 hover:text-bad underline">
                    ניקוי כל מה שבוצע
                  </button>
                )}
              </div>
              {showDone && (
                <ul className="space-y-1">
                  {done.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border border-ink-800/60 px-3 py-2 opacity-70">
                      <button
                        type="button"
                        onClick={() => toggle(t)}
                        aria-label={`החזרה לפתוחות: ${t.text}`}
                        className="shrink-0 w-6 h-6 rounded-md bg-good/20 border-2 border-good text-good inline-flex items-center justify-center"
                      >
                        <Icon name="check" size={13} />
                      </button>
                      <span className="flex-1 text-sm line-through text-ink-400 break-words">{t.text}</span>
                      <button type="button" onClick={() => drop(t.id)} aria-label={`מחיקה: ${t.text}`} className="shrink-0 text-ink-600 hover:text-bad">
                        <Icon name="x" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
      {!list && !loadErr && <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div>}
    </div>
  );
}
