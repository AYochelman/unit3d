"use client";
import { useEffect, useMemo, useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAdminStore } from "@/lib/admin-store";
import { useSupabaseSession } from "@/lib/use-supabase-session";
import { deleteExpenseRow, loadExpenses, saveExpenseRow, saveUsdRate } from "@/lib/expenses-remote";
import {
  CYCLE_HE, expenseTotals, inILS, monthlyILS, newExpenseId,
  type Currency, type Cycle, type Expense,
} from "@/lib/expenses";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The money going out.
 *
 * Costs arrive on three different clocks — a subscription every month, a domain
 * once a year, a spool bought on a Tuesday — which is what makes them easy to
 * lose. Everything entered here is turned into one comparable number, what it
 * costs per month, so the total at the top is the real answer to "what does
 * this shop cost me to keep open".
 *
 * It lives in the database rather than in a file beside the site: spool prices
 * are the shop's price list and may be public, but what the business pays out
 * is nobody else's business. The table opens only to the signed-in owner — the
 * same sign-in as the orders — and every change is written the moment it is
 * made, so there is nothing left to remember to save.
 */
export default function ExpensesTab() {
  const expenses = useAdminStore((s) => s.expenses);
  const usdRate = useAdminStore((s) => s.usdRate);
  const saveExpense = useAdminStore((s) => s.saveExpense);
  const removeExpense = useAdminStore((s) => s.removeExpense);
  const setExpenses = useAdminStore((s) => s.setExpenses);
  const setUsdRate = useAdminStore((s) => s.setUsdRate);

  const { token, email, setEmail, busy: authBusy, error: authErr, setError: setAuthErr, tried, signIn, signOut } = useSupabaseSession();
  const [pw, setPw] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ILS");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  // The saved list, read when the tab opens with a signed-in owner.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    void loadExpenses(token).then((data) => {
      if (!alive || !data) return;
      setExpenses(data.expenses, data.usdRate);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [token, setExpenses]);

  const totals = useMemo(() => expenseTotals(expenses, usdRate), [expenses, usdRate]);

  const reset = () => {
    setEditing(null);
    setName(""); setAmount(""); setCurrency("ILS"); setCycle("monthly"); setDate(today()); setNote(""); setErr("");
  };

  const submit = () => {
    const v = Number(amount);
    if (!name.trim()) { setErr("צריך שם."); return; }
    if (!Number.isFinite(v) || v <= 0) { setErr("צריך סכום גדול מאפס."); return; }
    const row: Expense = {
      id: editing ?? newExpenseId(),
      name: name.trim(),
      amount: Math.round(v * 100) / 100,
      currency,
      cycle,
      date: date || today(),
      note: note.trim() || undefined,
      active: true,
    };
    saveExpense(row);
    void write(row);
    reset();
  };

  const edit = (e: Expense) => {
    setEditing(e.id);
    setName(e.name); setAmount(String(e.amount)); setCurrency(e.currency);
    setCycle(e.cycle); setDate(e.date || today()); setNote(e.note ?? ""); setErr("");
  };

  // Every change goes straight to the database; a failure says so rather than
  // leaving a number on screen that exists nowhere else.
  const write = async (row: Expense) => {
    if (!token) return;
    if (!(await saveExpenseRow(token, row))) setSaveErr("השמירה נכשלה. נסה שוב.");
    else setSaveErr("");
  };

  const drop = async (id: string) => {
    removeExpense(id);
    if (token && !(await deleteExpenseRow(token, id))) setSaveErr("המחיקה נכשלה. נסה שוב.");
  };

  const rate = (v: number) => {
    setUsdRate(v);
    if (token && v > 0) void saveUsdRate(token, v);
  };

  const ordered = useMemo(
    () => [...expenses].sort((a, b) => monthlyILS(b, usdRate) - monthlyILS(a, usdRate) || a.name.localeCompare(b.name, "he")),
    [expenses, usdRate],
  );

  const header = (
    <div>
      <h2 className="text-lg font-black mb-1">ניהול הוצאות</h2>
      <p className="text-xs text-ink-500">
        כל מה שהחנות משלמת — מנויים חודשיים, תשלומים שנתיים, וקניות חד פעמיות.
        הכל מתורגם לעלות חודשית אחת, כדי שתדע כמה עולה להחזיק את העסק פתוח.
      </p>
    </div>
  );

  // Money going out is the owner's business alone, so the tab shows nothing at
  // all until he is signed in — the same sign-in the orders use.
  if (!token) {
    return (
      <div className="space-y-4">
        {header}
        {!tried ? (
          <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div>
        ) : (
          <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3 max-w-sm">
            <div className="text-sm font-bold">כניסה</div>
            <p className="text-[11px] text-ink-500">ההוצאות פרטיות. אותה כניסה של ההזמנות.</p>
            <Input
              type="email" dir="ltr" placeholder="מייל" value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthErr(""); }}
            />
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
    <div className="space-y-4">
      {header}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-500">מחובר{email ? ` · ${email}` : ""}</span>
        <button type="button" onClick={signOut} className="text-[11px] text-ink-500 hover:text-bad underline">יציאה</button>
        {saveErr && <span className="text-xs text-bad">{saveErr}</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "עלות חודשית", value: fmtILS(totals.monthly), tone: "flame" },
          { label: "בשנה (מנויים)", value: fmtILS(totals.yearly), tone: "ink" },
          { label: "חד פעמיים השנה", value: fmtILS(totals.oneOffYear), tone: "ink" },
          { label: "סה\"כ השנה", value: fmtILS(totals.yearAll), tone: "ink" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-ink-900 border border-ink-800">
            <div className={cn("font-mono text-2xl font-black tabular-nums", s.tone === "flame" ? "text-flame" : "text-ink-50")} dir="ltr">
              {s.value}
            </div>
            <div className="text-[11px] text-ink-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="על מה">
            <Input placeholder="EmailJS · דומיין · גליל PLA" value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} />
          </Field>
          <Field label="כמה">
            <div className="flex gap-2">
              <Input
                type="number" min={0} step="0.01" dir="ltr" value={amount}
                onChange={(e) => { setAmount(e.target.value); setErr(""); }}
              />
              <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-24">
                <option value="ILS">₪</option>
                <option value="USD">$</option>
              </Select>
            </div>
          </Field>
          <Field label="כל כמה זמן">
            <Select value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)}>
              <option value="monthly">{CYCLE_HE.monthly}</option>
              <option value="yearly">{CYCLE_HE.yearly}</option>
              <option value="once">{CYCLE_HE.once}</option>
            </Select>
          </Field>
          <Field label={cycle === "once" ? "תאריך התשלום" : "מאיזה תאריך"}>
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="הערה" optional>
          <Input placeholder="לצד מה זה משמש, מספר חשבונית, כל דבר" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Btn size="sm" icon={editing ? "check" : "plus"} onClick={submit}>
            {editing ? "שמירת שינוי" : "הוספת הוצאה"}
          </Btn>
          {editing && <Btn size="sm" variant="ghost" onClick={reset}>ביטול</Btn>}
          {err && <span className="text-xs text-bad">{err}</span>}
          <span className="flex-1" />
          <label className="flex items-center gap-2 text-[11px] text-ink-500">
            שער דולר
            <input
              type="number" step="0.01" min={1} dir="ltr"
              value={usdRate}
              onChange={(e) => rate(Number(e.target.value))}
              className="h-8 w-20 px-2 rounded-lg bg-ink-950 border border-ink-800 text-xs font-mono text-ink-100 focus:outline-none focus:border-flame/60"
            />
          </label>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">
          {loaded ? "עדיין אין הוצאות. הראשונה נוספת למעלה." : "טוען…"}
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((e) => {
            const perMonth = monthlyILS(e, usdRate);
            return (
              <div key={e.id} className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm">{e.name}</span>
                  <Pill tone={e.cycle === "once" ? "neutral" : e.active ? "good" : "neutral"} className="text-[10px]">
                    {CYCLE_HE[e.cycle]}
                  </Pill>
                  {!e.active && <span className="text-[10px] text-ink-500">מושהה</span>}
                  <span className="font-mono text-sm" dir="ltr">
                    {e.currency === "USD" ? `$${e.amount}` : fmtILS(e.amount)}
                  </span>
                  {e.currency === "USD" && (
                    <span className="text-[11px] text-ink-500" dir="ltr">≈ {fmtILS(Math.round(inILS(e, usdRate)))}</span>
                  )}
                  <span className="flex-1" />
                  {perMonth > 0 && (
                    <span className="font-mono text-[11px] text-flame" dir="ltr">{fmtILS(Math.round(perMonth))} / חודש</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { const next = { ...e, active: !e.active }; saveExpense(next); void write(next); }}
                    className={cn(
                      "px-2.5 h-8 rounded-lg text-xs border",
                      e.active ? "border-ink-700 text-ink-300 hover:border-ink-600" : "border-good text-good bg-good/10",
                    )}
                  >
                    {e.active ? "השהיה" : "הפעלה"}
                  </button>
                  <button type="button" onClick={() => edit(e)} title="עריכה" className="text-ink-500 hover:text-ink-200">
                    <Icon name="settings" size={14} />
                  </button>
                  <button type="button" onClick={() => void drop(e.id)} title="מחיקה" className="text-ink-600 hover:text-bad">
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <div className="text-[11px] text-ink-500 mt-1">
                  {e.date}{e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-ink-600">
        ההוצאות נשמרות במאגר הפרטי שלך, מאחורי הכניסה — לא בקובץ באתר. כל שינוי נשמר מיד.
      </p>
    </div>
  );
}
