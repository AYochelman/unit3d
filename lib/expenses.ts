/**
 * What the shop pays out.
 *
 * A print shop's costs are not only filament: a domain once a year, a mail
 * service every month, a spool bought on a Tuesday. They arrive on different
 * clocks, which is exactly why they are easy to lose track of — so everything
 * here is normalised to one number, what it costs per month, and the tab adds
 * that up.
 *
 * Foreign prices are converted with a rate the owner sets by hand: the site is
 * static and has no way to fetch a live one, and a wrong live rate would be
 * worse than a known approximate one.
 */
export type Cycle = "once" | "monthly" | "yearly";
export type Currency = "ILS" | "USD";

export type Expense = {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  cycle: Cycle;
  /** When it started, or when a one-off was paid (YYYY-MM-DD). */
  date: string;
  note?: string;
  active: boolean;
};

export const CYCLE_HE: Record<Cycle, string> = {
  once: "חד פעמי",
  monthly: "חודשי",
  yearly: "שנתי",
};

export const DEFAULT_USD_RATE = 3.7;

export const inILS = (e: Expense, usdRate: number): number =>
  e.currency === "USD" ? e.amount * usdRate : e.amount;

/** The same expense expressed as a monthly cost. A one-off has none. */
export const monthlyILS = (e: Expense, usdRate: number): number => {
  if (!e.active || e.cycle === "once") return 0;
  const v = inILS(e, usdRate);
  return e.cycle === "yearly" ? v / 12 : v;
};

const thisYear = (iso: string) => new Date(iso).getFullYear() === new Date().getFullYear();

export function expenseTotals(list: Expense[], usdRate: number) {
  const monthly = list.reduce((s, e) => s + monthlyILS(e, usdRate), 0);
  const oneOffYear = list
    .filter((e) => e.cycle === "once" && e.date && thisYear(e.date))
    .reduce((s, e) => s + inILS(e, usdRate), 0);
  return {
    monthly: Math.round(monthly),
    yearly: Math.round(monthly * 12),
    oneOffYear: Math.round(oneOffYear),
    /** Everything this year: twelve months of the recurring plus the one-offs. */
    yearAll: Math.round(monthly * 12 + oneOffYear),
    active: list.filter((e) => e.active && e.cycle !== "once").length,
  };
}

export const newExpenseId = (): string =>
  `x${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/**
 * The costs a print shop actually has, as one-click starting points.
 *
 * Not a price list — the amount is always the owner's to type, because it is
 * the one thing that differs per invoice. What these save is the part that is
 * easy to get wrong from memory: whether a thing is billed once, monthly or
 * yearly, and in which currency.
 */
export type ExpensePreset = {
  name: string;
  currency: Currency;
  cycle: Cycle;
  note?: string;
  amount?: number;
};

export const EXPENSE_PRESETS: ExpensePreset[] = [
  { name: "Raspberry Pi", currency: "ILS", cycle: "once", note: "מחשב קטן שמריץ את החיבור למדפסת" },
  { name: "גליל פילמנט", currency: "ILS", cycle: "once" },
  { name: "חלפי מדפסת", currency: "ILS", cycle: "once", note: "פיות, פלטה, רצועות" },
  { name: "אריזות ומשלוח", currency: "ILS", cycle: "once" },
  { name: "EmailJS", currency: "USD", cycle: "monthly", amount: 11 },
  { name: "חשמל", currency: "ILS", cycle: "monthly" },
  { name: "דומיין", currency: "ILS", cycle: "yearly" },
  { name: "Supabase", currency: "USD", cycle: "monthly", amount: 25 },
];
