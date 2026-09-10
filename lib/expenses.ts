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

/**
 * The expenses that were in the shop's public file before the books moved
 * behind the sign-in.
 *
 * Moving them was right — what a business pays out is nobody else's business —
 * but the move did not carry the rows across, so the history went with it.
 * They are recovered here from the file's own git history, and the tab offers
 * to write them back while the table is still empty. Once it is not, this list
 * is inert: it is a rescue, not a seed.
 */
export const RECOVERED_EXPENSES: Expense[] = [
  { id: "xmtuaai5zcg", name: "P2S Printer", amount: 3000, currency: "ILS", cycle: "once", date: "2026-09-09", active: true },
  { id: "xmtuadxjdly", name: "\u05d2\u05dc\u05d9\u05dc PLA \u05e2\u05e9\u05e8\u05d4", amount: 1000, currency: "ILS", cycle: "once", date: "2026-09-09", active: true },
  { id: "xmtuacsksok", name: "\u05d2\u05dc\u05d9\u05dc PLA \u05d6\u05d5\u05d2", amount: 200, currency: "ILS", cycle: "once", date: "2026-09-09", active: true },
  { id: "xmtuab5fkr6", name: "\u05de\u05d5\u05e6\u05e8\u05d9 \u05d0\u05e8\u05d9\u05d6\u05d4", amount: 200, currency: "ILS", cycle: "once", date: "2026-09-09", active: true },
  {
    id: "x-emailjs", name: "EmailJS", amount: 11, currency: "USD", cycle: "monthly",
    date: "2026-09-09", note: "\u05de\u05d9\u05d9\u05dc \u05d0\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4 \u05dc\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea", active: true,
  },
  {
    id: "x-domain", name: "\u05d3\u05d5\u05de\u05d9\u05d9\u05df unit-3d.com", amount: 10.44, currency: "USD", cycle: "yearly",
    date: "2026-09-08", note: "Cloudflare Registrar \u00b7 \u05d7\u05d9\u05d3\u05d5\u05e9 \u05e9\u05e0\u05ea\u05d9", active: true,
  },
];

/**
 * The migration that was written but never run.
 *
 * The tab shows this when the table is missing, because the alternative — a
 * page that loads forever — is what turned a missing migration into "you
 * deleted my expenses". It creates the table, locks it to a signed-in owner,
 * and restores every row that was in the public file before the move.
 */
export const EXPENSES_SQL = `create table if not exists public.expenses (
  id         text primary key,
  name       text not null,
  amount     numeric not null,
  currency   text not null default 'ILS',
  cycle      text not null default 'monthly',
  date       date,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  key   text primary key,
  value jsonb
);

alter table public.expenses      enable row level security;
alter table public.shop_settings enable row level security;

drop policy if exists "owner reads expenses"   on public.expenses;
drop policy if exists "owner adds expenses"    on public.expenses;
drop policy if exists "owner edits expenses"   on public.expenses;
drop policy if exists "owner deletes expenses" on public.expenses;
create policy "owner reads expenses"   on public.expenses for select to authenticated using (true);
create policy "owner adds expenses"    on public.expenses for insert to authenticated with check (true);
create policy "owner edits expenses"   on public.expenses for update to authenticated using (true) with check (true);
create policy "owner deletes expenses" on public.expenses for delete to authenticated using (true);

drop policy if exists "owner reads settings"  on public.shop_settings;
drop policy if exists "owner writes settings" on public.shop_settings;
drop policy if exists "owner edits settings"  on public.shop_settings;
create policy "owner reads settings"  on public.shop_settings for select to authenticated using (true);
create policy "owner writes settings" on public.shop_settings for insert to authenticated with check (true);
create policy "owner edits settings"  on public.shop_settings for update to authenticated using (true) with check (true);

insert into public.expenses (id, name, amount, currency, cycle, date, note) values
  ('x-emailjs',   'EmailJS',             11,    'USD', 'monthly', '2026-09-09', '\u05de\u05d9\u05d9\u05dc \u05d0\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4'),
  ('x-domain',    '\u05d3\u05d5\u05de\u05d9\u05d9\u05df unit-3d.com', 10.44, 'USD', 'yearly', '2026-09-08', 'Cloudflare Registrar'),
  ('xmtuaai5zcg', 'P2S Printer',         3000,  'ILS', 'once',    '2026-09-09', null),
  ('xmtuadxjdly', '\u05d2\u05dc\u05d9\u05dc PLA \u05e2\u05e9\u05e8\u05d4', 1000, 'ILS', 'once', '2026-09-09', null),
  ('xmtuacsksok', '\u05d2\u05dc\u05d9\u05dc PLA \u05d6\u05d5\u05d2',  200,  'ILS', 'once', '2026-09-09', null),
  ('xmtuab5fkr6', '\u05de\u05d5\u05e6\u05e8\u05d9 \u05d0\u05e8\u05d9\u05d6\u05d4', 200, 'ILS', 'once', '2026-09-09', null)
on conflict (id) do nothing;`;
