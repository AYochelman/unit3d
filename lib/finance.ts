import { inILS, type Expense } from "./expenses";
import type { PlacedOrder } from "./orders";

/**
 * The shop's books month by month: what came in, what went out, what is left.
 *
 * Money arrives on the same three clocks as the costs — a one-off sale, a
 * monthly arrangement with a unit, a yearly one — so income rows are the same
 * shape as expense rows and land in months by the same rule. Approved orders
 * from the site count as income on their own; the owner types only what came
 * in some other way (a fair, a WhatsApp deal, cash).
 */

export type Month = string; // YYYY-MM

export type MonthBook = {
  month: Month;
  /** Approved site orders, items total before delivery. */
  orders: number;
  orderCount: number;
  /** Income the owner typed in. */
  other: number;
  expenses: number;
  income: number;
  profit: number;
  /** Profit from the first month up to and including this one. */
  running: number;
};

export const monthOf = (iso: string): Month => iso.slice(0, 7);

const addMonths = (m: Month, n: number): Month => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthsBetween = (a: Month, b: Month): Month[] => {
  const out: Month[] = [];
  for (let m = a; m <= b && out.length < 600; m = addMonths(m, 1)) out.push(m);
  return out;
};

export const MONTH_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
export const monthLabel = (m: Month, short = false): string => {
  const [y, mo] = m.split("-").map(Number);
  const name = MONTH_HE[mo - 1] ?? m;
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`;
};

/**
 * What one row costs (or brings) in one month.
 *
 * A one-off counts in its own month; a monthly row in every month from its
 * date; a yearly row in its date's month and every anniversary. A paused row
 * counts in no month — pausing means "stop counting this".
 */
export function amountInMonth(e: Expense, m: Month, usdRate: number): number {
  if (!e.active || !e.date) return 0;
  const start = monthOf(e.date);
  if (m < start) return 0;
  const v = inILS(e, usdRate);
  if (e.cycle === "once") return m === start ? v : 0;
  if (e.cycle === "monthly") return v;
  return m.slice(5) === start.slice(5) ? v : 0;
}

/** An order the shop was paid for: approved, and priced. */
export const paidOrder = (o: PlacedOrder): boolean =>
  o.decision === "approved" && o.itemsTotal != null;

export function books(rows: Expense[], orders: PlacedOrder[], usdRate: number, now = new Date()): MonthBook[] {
  const paid = orders.filter(paidOrder);
  const starts = [
    ...rows.filter((r) => r.active && r.date).map((r) => monthOf(r.date)),
    ...paid.map((o) => monthOf(o.at)),
  ];
  const last = monthOf(now.toISOString());
  if (!starts.length) return [];
  const first = starts.reduce((a, b) => (a < b ? a : b));
  let running = 0;
  return monthsBetween(first, last).map((month) => {
    const mine = paid.filter((o) => monthOf(o.at) === month);
    const ordersSum = mine.reduce((s, o) => s + Math.max(0, (o.itemsTotal ?? 0) - (o.discount?.off ?? 0)), 0);
    let other = 0, out = 0;
    for (const r of rows) {
      const v = amountInMonth(r, month, usdRate);
      if (r.kind === "income") other += v; else out += v;
    }
    const income = ordersSum + other;
    const profit = income - out;
    running += profit;
    return {
      month,
      orders: Math.round(ordersSum),
      orderCount: mine.length,
      other: Math.round(other),
      expenses: Math.round(out),
      income: Math.round(income),
      profit: Math.round(profit),
      running: Math.round(running),
    };
  });
}

/** Where the money went (or came from), all time, biggest first. */
export function byName(rows: Expense[], months: Month[], usdRate: number, kind: Expense["kind"]) {
  const sums = new Map<string, number>();
  for (const r of rows) {
    if (r.kind !== kind) continue;
    const v = months.reduce((s, m) => s + amountInMonth(r, m, usdRate), 0);
    if (v > 0) sums.set(r.name, (sums.get(r.name) ?? 0) + v);
  }
  return [...sums.entries()].map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value);
}
