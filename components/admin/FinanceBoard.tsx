"use client";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/Field";
import { books, byName, monthLabel, monthOf, type MonthBook } from "@/lib/finance";
import type { Expense } from "@/lib/expenses";
import type { PlacedOrder } from "@/lib/orders";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

type Chart = "flow" | "profit" | "running" | "out" | "in";

const CHARTS: { id: Chart; label: string }[] = [
  { id: "flow", label: "הכנסות מול הוצאות" },
  { id: "profit", label: "רווח לפי חודש" },
  { id: "running", label: "רווח מצטבר" },
  { id: "out", label: "לאן הלך הכסף" },
  { id: "in", label: "מאיפה הגיע הכסף" },
];

const signed = (n: number) => (n < 0 ? `-${fmtILS(-n)}` : fmtILS(n));

/**
 * Profit and loss: one month at a time, every month so far, and the charts.
 *
 * Income is the site's approved orders plus what the owner typed in; costs
 * are the expense rows, each landing in the months its cycle says.
 */
export default function FinanceBoard({
  rows, orders, usdRate, ordersNote,
}: {
  rows: Expense[];
  orders: PlacedOrder[];
  usdRate: number;
  ordersNote?: string;
}) {
  const months = useMemo(() => books(rows, orders, usdRate), [rows, orders, usdRate]);
  const current = monthOf(new Date().toISOString());
  const [picked, setPicked] = useState<string>("");
  const [chart, setChart] = useState<Chart>("flow");

  const month = months.find((m) => m.month === (picked || current)) ?? months[months.length - 1];
  const all = useMemo(() => {
    const income = months.reduce((s, m) => s + m.income, 0);
    const out = months.reduce((s, m) => s + m.expenses, 0);
    const best = months.reduce<MonthBook | null>((b, m) => (!b || m.profit > b.profit ? m : b), null);
    return { income, out, net: income - out, best, orders: months.reduce((s, m) => s + m.orderCount, 0) };
  }, [months]);

  if (!months.length) {
    return (
      <div className="p-6 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">
        רווח והפסד יופיעו כאן אחרי ההוצאה או ההכנסה הראשונה.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black text-base">רווח והפסד</h3>
          <span className="flex-1" />
          <Select
            value={month.month}
            onChange={(e) => setPicked(e.target.value)}
            className="w-44"
            aria-label="חודש"
          >
            {[...months].reverse().map((m) => (
              <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label={`הכנסות · ${monthLabel(month.month)}`} value={fmtILS(month.income)} tone="good"
            sub={`${month.orderCount} הזמנות באתר${month.other ? ` · ${fmtILS(month.other)} אחר` : ""}`} />
          <Stat label="הוצאות החודש" value={fmtILS(month.expenses)} tone="bad" />
          <Stat label={month.profit >= 0 ? "רווח החודש" : "הפסד החודש"} value={signed(month.profit)} tone={month.profit >= 0 ? "good" : "bad"} big />
          <Stat label="מצטבר עד סוף החודש" value={signed(month.running)} tone={month.running >= 0 ? "good" : "bad"} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="כל ההכנסות אי פעם" value={fmtILS(all.income)} sub={`${all.orders} הזמנות מאושרות`} />
          <Stat label="כל ההוצאות אי פעם" value={fmtILS(all.out)} />
          <Stat label={all.net >= 0 ? "רווח כולל" : "הפסד כולל"} value={signed(all.net)} tone={all.net >= 0 ? "good" : "bad"} big />
          <Stat label="החודש הכי טוב" value={all.best ? signed(all.best.profit) : "-"} sub={all.best ? monthLabel(all.best.month) : undefined} />
        </div>
        {ordersNote && <p className="text-[11px] text-ink-500">{ordersNote}</p>}
      </div>

      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="גרף">
          {CHARTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={chart === c.id}
              onClick={() => setChart(c.id)}
              className={cn(
                "px-3 h-8 rounded-full border text-[12px] transition-colors",
                chart === c.id ? "border-flame bg-flame/10 text-ink-50 font-bold" : "border-ink-800 text-ink-400 hover:text-ink-100",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        {chart === "flow" && <FlowChart months={months} picked={month.month} onPick={setPicked} />}
        {chart === "profit" && <ProfitChart months={months} picked={month.month} onPick={setPicked} />}
        {chart === "running" && <RunningChart months={months} />}
        {chart === "out" && <Breakdown items={byName(rows, months.map((m) => m.month), usdRate, "expense")} tone="bad" empty="אין הוצאות עדיין." />}
        {chart === "in" && (
          <Breakdown
            items={[
              ...(all.orders ? [{ name: "הזמנות מהאתר", value: months.reduce((s, m) => s + m.orders, 0) }] : []),
              ...byName(rows, months.map((m) => m.month), usdRate, "income"),
            ].sort((a, b) => b.value - a.value)}
            tone="good"
            empty="אין הכנסות עדיין."
          />
        )}
      </div>

      <div className="rounded-2xl border border-ink-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-900 text-[11px] text-ink-400">
            <tr>
              <th className="text-start font-normal px-3 py-2">חודש</th>
              <th className="text-start font-normal px-3 py-2">הכנסות</th>
              <th className="text-start font-normal px-3 py-2">הוצאות</th>
              <th className="text-start font-normal px-3 py-2">רווח / הפסד</th>
              <th className="text-start font-normal px-3 py-2">מצטבר</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((m) => (
              <tr
                key={m.month}
                onClick={() => setPicked(m.month)}
                className={cn("border-t border-ink-800 cursor-pointer hover:bg-ink-900/60", m.month === month.month && "bg-flame/5")}
              >
                <td className="px-3 py-2 whitespace-nowrap">{monthLabel(m.month)}</td>
                <td className="px-3 py-2 font-mono text-good" dir="ltr">{fmtILS(m.income)}</td>
                <td className="px-3 py-2 font-mono text-bad" dir="ltr">{fmtILS(m.expenses)}</td>
                <td className={cn("px-3 py-2 font-mono font-bold", m.profit >= 0 ? "text-good" : "text-bad")} dir="ltr">{signed(m.profit)}</td>
                <td className={cn("px-3 py-2 font-mono", m.running >= 0 ? "text-ink-200" : "text-bad")} dir="ltr">{signed(m.running)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone, big }: { label: string; value: string; sub?: string; tone?: "good" | "bad"; big?: boolean }) {
  return (
    <div className="p-3 rounded-2xl bg-ink-900 border border-ink-800">
      <div
        className={cn(
          "font-mono font-black tabular-nums",
          big ? "text-2xl" : "text-xl",
          tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink-50",
        )}
        dir="ltr"
      >
        {value}
      </div>
      <div className="text-[11px] text-ink-400 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-ink-500">{sub}</div>}
    </div>
  );
}

/* ---- charts: plain SVG, time runs left to right like a calendar on the wall ---- */

const W = 640, H = 240, PAD = { l: 52, r: 12, t: 12, b: 34 };

const niceMax = (v: number) => {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
};

const compact = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1000 ? `${Math.round(a / 100) / 10}K` : String(Math.round(a));
  return `${n < 0 ? "-" : ""}₪${s}`;
};

function Axis({ lo, hi, y }: { lo: number; hi: number; y: (v: number) => number }) {
  // Across zero the middle line is zero itself; a "-₪500" gridline says nothing.
  const ticks = lo < 0 && hi > 0 ? [lo, 0, hi] : [lo, lo + (hi - lo) / 2, hi];
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-ink-600" : "stroke-ink-800"} strokeDasharray={t === 0 ? undefined : "3 4"} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-ink-500" fontSize="11" fontFamily="var(--font-mono)">{compact(t)}</text>
        </g>
      ))}
    </g>
  );
}

function MonthTicks({ months, x, bw }: { months: MonthBook[]; x: (i: number) => number; bw: number }) {
  const every = Math.ceil(months.length / 10);
  return (
    <g>
      {months.map((m, i) =>
        i % every === 0 || i === months.length - 1 ? (
          <text key={m.month} x={x(i) + bw / 2} y={H - PAD.b + 16} textAnchor="middle" className="fill-ink-400" fontSize="11">
            {monthLabel(m.month, true)}
          </text>
        ) : null,
      )}
    </g>
  );
}

function Legend({ items }: { items: { label: string; cls: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-ink-400">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn("inline-block w-2.5 h-2.5 rounded-sm", it.cls)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function FlowChart({ months, picked, onPick }: { months: MonthBook[]; picked: string; onPick: (m: string) => void }) {
  const hi = niceMax(Math.max(...months.map((m) => Math.max(m.income, m.expenses))));
  const slot = (W - PAD.l - PAD.r) / months.length;
  const bw = Math.min(28, slot * 0.38);
  const x = (i: number) => PAD.l + i * slot + slot / 2 - bw;
  const y = (v: number) => PAD.t + (1 - v / hi) * (H - PAD.t - PAD.b);
  return (
    <div className="space-y-2">
      <Legend items={[{ label: "הכנסות", cls: "bg-good" }, { label: "הוצאות", cls: "bg-bad" }]} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" direction="ltr" role="img" aria-label="הכנסות מול הוצאות לפי חודש">
        <Axis lo={0} hi={hi} y={y} />
        {months.map((m, i) => (
          <g key={m.month} onClick={() => onPick(m.month)} className="cursor-pointer">
            {m.month === picked && <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} className="fill-flame/10" />}
            <rect x={x(i)} y={y(m.income)} width={bw} height={y(0) - y(m.income)} rx="3" className="fill-good">
              <title>{`${monthLabel(m.month)} · הכנסות ${fmtILS(m.income)}`}</title>
            </rect>
            <rect x={x(i) + bw + 2} y={y(m.expenses)} width={bw} height={y(0) - y(m.expenses)} rx="3" className="fill-bad">
              <title>{`${monthLabel(m.month)} · הוצאות ${fmtILS(m.expenses)}`}</title>
            </rect>
          </g>
        ))}
        <MonthTicks months={months} x={(i) => x(i)} bw={bw * 2 + 2} />
      </svg>
    </div>
  );
}

function ProfitChart({ months, picked, onPick }: { months: MonthBook[]; picked: string; onPick: (m: string) => void }) {
  const hi = niceMax(Math.max(0, ...months.map((m) => m.profit)));
  const lo = -niceMax(Math.max(0, ...months.map((m) => -m.profit)));
  const loAxis = lo === -100 && months.every((m) => m.profit >= 0) ? 0 : lo;
  const hiAxis = hi === 100 && months.every((m) => m.profit <= 0) ? 0 : hi;
  const slot = (W - PAD.l - PAD.r) / months.length;
  const bw = Math.min(40, slot * 0.6);
  const x = (i: number) => PAD.l + i * slot + (slot - bw) / 2;
  const y = (v: number) => PAD.t + ((hiAxis - v) / (hiAxis - loAxis || 1)) * (H - PAD.t - PAD.b);
  return (
    <div className="space-y-2">
      <Legend items={[{ label: "רווח", cls: "bg-good" }, { label: "הפסד", cls: "bg-bad" }]} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" direction="ltr" role="img" aria-label="רווח או הפסד לפי חודש">
        <Axis lo={loAxis} hi={hiAxis} y={y} />
        {months.map((m, i) => (
          <g key={m.month} onClick={() => onPick(m.month)} className="cursor-pointer">
            {m.month === picked && <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} className="fill-flame/10" />}
            <rect
              x={x(i)}
              y={Math.min(y(m.profit), y(0))}
              width={bw}
              height={Math.max(1, Math.abs(y(m.profit) - y(0)))}
              rx="3"
              className={m.profit >= 0 ? "fill-good" : "fill-bad"}
            >
              <title>{`${monthLabel(m.month)} · ${m.profit >= 0 ? "רווח" : "הפסד"} ${signed(m.profit)}`}</title>
            </rect>
          </g>
        ))}
        <MonthTicks months={months} x={x} bw={bw} />
      </svg>
    </div>
  );
}

function RunningChart({ months }: { months: MonthBook[] }) {
  const vals = months.map((m) => m.running);
  const hi = Math.max(0, niceMax(Math.max(0, ...vals)));
  const lo = -niceMax(Math.max(0, ...vals.map((v) => -v)));
  const hiAxis = vals.every((v) => v <= 0) ? 0 : hi;
  const loAxis = vals.every((v) => v >= 0) ? 0 : lo;
  const n = months.length;
  const x = (i: number) => PAD.l + (n === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (n - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + ((hiAxis - v) / (hiAxis - loAxis || 1)) * (H - PAD.t - PAD.b);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = vals[vals.length - 1];
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-ink-400">
        כמה הרווחת (או עוד לא החזרת) מאז היום הראשון. כשהקו חוצה את האפס — ההשקעה חזרה.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" direction="ltr" role="img" aria-label="רווח מצטבר">
        <Axis lo={loAxis} hi={hiAxis} y={y} />
        <polygon points={`${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}`} className={last >= 0 ? "fill-good/15" : "fill-bad/15"} />
        <polyline points={pts} fill="none" strokeWidth="2.5" strokeLinejoin="round" className={last >= 0 ? "stroke-good" : "stroke-bad"} />
        {vals.map((v, i) => (
          <circle key={months[i].month} cx={x(i)} cy={y(v)} r="3.5" className={v >= 0 ? "fill-good" : "fill-bad"}>
            <title>{`${monthLabel(months[i].month)} · ${signed(v)}`}</title>
          </circle>
        ))}
        <MonthTicks months={months} x={(i) => x(i) - 0.5} bw={1} />
      </svg>
    </div>
  );
}

function Breakdown({ items, tone, empty }: { items: { name: string; value: number }[]; tone: "good" | "bad"; empty: string }) {
  if (!items.length) return <div className="p-6 text-center text-sm text-ink-500">{empty}</div>;
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = items[0].value || 1;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.name} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[13px]">
          <span className="truncate" title={it.name}>{it.name}</span>
          <span className="h-3 rounded-full bg-ink-900 overflow-hidden">
            <span
              className={cn("block h-full rounded-full", tone === "good" ? "bg-good" : "bg-bad")}
              style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }}
            />
          </span>
          <span className="font-mono text-[12px] text-ink-300 whitespace-nowrap">
            <bdi dir="ltr">{fmtILS(it.value)}</bdi>
            <span className="text-ink-500"> · {Math.round((it.value / total) * 100)}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}
