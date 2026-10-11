"use client";
import { isConfigured, shopConfig } from "./orders-remote";

/**
 * The owner's to-do list.
 *
 * It has to follow him from the computer to the phone, so it cannot live in
 * the browser; and it is his, so it cannot live in a public file beside the
 * site. It sits in `shop_settings` under the key "todos" — the private
 * key/value table the expenses already use, behind the same sign-in — which
 * meant no new table and no migration to run.
 */
export type Todo = {
  id: string;
  text: string;
  done: boolean;
  /** Pinned to the top of the list. */
  urgent?: boolean;
  /** YYYY-MM-DD */
  due?: string;
  createdAt: string;
  doneAt?: string;
};

export const newTodoId = (): string =>
  `t${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

const auth = async (token: string) => {
  const c = await shopConfig();
  if (!isConfigured(c) || !token) return null;
  return {
    url: c.supabaseUrl,
    headers: { apikey: c.supabaseAnonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  };
};

const clean = (v: unknown): Todo[] =>
  Array.isArray(v)
    ? v
        .filter((t): t is Todo => !!t && typeof t === "object" && typeof (t as Todo).id === "string" && typeof (t as Todo).text === "string")
        .map((t) => ({ ...t, done: !!t.done }))
    : [];

/** The list, or null when it could not be read (so the tab never shows an empty list over a real one). */
export async function loadTodos(token: string): Promise<Todo[] | null> {
  const a = await auth(token);
  if (!a) return null;
  try {
    const res = await fetch(`${a.url}/rest/v1/shop_settings?key=eq.todos&select=value`, { headers: a.headers, cache: "no-store" });
    if (!res.ok) return null;
    const rows = (await res.json()) as { value?: unknown }[];
    return clean(rows[0]?.value);
  } catch {
    return null;
  }
}

export async function saveTodos(token: string, list: Todo[]): Promise<boolean> {
  const a = await auth(token);
  if (!a) return false;
  try {
    const res = await fetch(`${a.url}/rest/v1/shop_settings?on_conflict=key`, {
      method: "POST",
      headers: { ...a.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: "todos", value: list }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
