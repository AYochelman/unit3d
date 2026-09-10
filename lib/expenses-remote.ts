"use client";
import { isConfigured, shopConfig } from "./orders-remote";
import { DEFAULT_USD_RATE, type Expense } from "./expenses";

/**
 * The shop's own books, kept where only the owner can read them.
 *
 * Expenses used to live in a file next to the site — public, like every other
 * setting — which is fine for spool prices and wrong for what the business
 * pays out. They sit in the database now, behind the same sign-in as the
 * orders: the anonymous key cannot see this table at all.
 */
type Row = {
  id: string;
  name: string;
  amount: number | string;
  currency: string;
  cycle: string;
  date: string | null;
  note: string | null;
  active: boolean;
};

const toExpense = (r: Row): Expense => ({
  id: r.id,
  name: r.name,
  amount: Number(r.amount) || 0,
  currency: r.currency === "USD" ? "USD" : "ILS",
  cycle: r.cycle === "yearly" ? "yearly" : r.cycle === "once" ? "once" : "monthly",
  date: r.date ?? "",
  note: r.note ?? undefined,
  active: r.active !== false,
});

const auth = async (token: string) => {
  const c = await shopConfig();
  if (!isConfigured(c) || !token) return null;
  return {
    url: c.supabaseUrl,
    headers: {
      apikey: c.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

/**
 * The books, or the reason there are none.
 *
 * This used to answer `null` for every kind of failure, and the tab read that
 * as "still loading" and said so forever. A table that was never created and a
 * table that is empty look identical from there, which is how a missing
 * migration became "my expenses were deleted". So a failure now comes back
 * named, and the tab can say which one it is.
 */
export type ExpensesLoad =
  | { ok: true; expenses: Expense[]; usdRate: number }
  | { ok: false; reason: "no-table" | "denied" | "offline"; detail: string };

export async function loadExpenses(token: string): Promise<ExpensesLoad> {
  const a = await auth(token);
  if (!a) return { ok: false, reason: "offline", detail: "אין חיבור למסד הנתונים" };
  try {
    const [rows, settings] = await Promise.all([
      fetch(`${a.url}/rest/v1/expenses?select=*&order=name.asc`, { headers: a.headers, cache: "no-store" }),
      fetch(`${a.url}/rest/v1/shop_settings?key=eq.usd_rate&select=value`, { headers: a.headers, cache: "no-store" }),
    ]);
    if (!rows.ok) {
      const body = await rows.text().catch(() => "");
      // PostgREST answers 404 with "relation ... does not exist" when the table
      // was never created — the one failure the owner can actually fix.
      const missing = rows.status === 404 || /does not exist|schema cache/i.test(body);
      return {
        ok: false,
        reason: missing ? "no-table" : rows.status === 401 || rows.status === 403 ? "denied" : "offline",
        detail: body.slice(0, 200) || `שגיאה ${rows.status}`,
      };
    }
    const list = ((await rows.json()) as Row[]).map(toExpense);
    let usdRate = DEFAULT_USD_RATE;
    if (settings.ok) {
      const s = (await settings.json()) as { value?: number | string }[];
      const v = Number(s[0]?.value);
      if (Number.isFinite(v) && v > 0) usdRate = v;
    }
    return { ok: true, expenses: list, usdRate };
  } catch (e) {
    return { ok: false, reason: "offline", detail: e instanceof Error ? e.message : "אין חיבור" };
  }
}

export async function saveExpenseRow(token: string, e: Expense): Promise<boolean> {
  const a = await auth(token);
  if (!a) return false;
  try {
    const res = await fetch(`${a.url}/rest/v1/expenses?on_conflict=id`, {
      method: "POST",
      headers: { ...a.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: e.id,
        name: e.name,
        amount: e.amount,
        currency: e.currency,
        cycle: e.cycle,
        date: e.date || null,
        note: e.note ?? null,
        active: e.active,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteExpenseRow(token: string, id: string): Promise<boolean> {
  const a = await auth(token);
  if (!a) return false;
  try {
    const res = await fetch(`${a.url}/rest/v1/expenses?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...a.headers, Prefer: "return=minimal" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The rate is a setting, not an expense, so it lives in its own small table. */
export async function saveUsdRate(token: string, rate: number): Promise<boolean> {
  const a = await auth(token);
  if (!a) return false;
  try {
    const res = await fetch(`${a.url}/rest/v1/shop_settings?on_conflict=key`, {
      method: "POST",
      headers: { ...a.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: "usd_rate", value: rate }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
