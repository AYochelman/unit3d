"use client";
import { shopConfig, isConfigured } from "./orders-remote";
import type { BotLink } from "./helpbot";

/**
 * The AI helper, asked through the site's Supabase project
 * (supabase/functions/helpbot). Returns null whenever it cannot answer — not
 * deployed yet, no key, an error, a refusal, too slow — and the caller falls
 * back to the built-in prepared answers, so the orb never goes silent.
 */
export type AiTurn = { role: "user" | "assistant"; content: string };

export async function askAI(history: AiTurn[]): Promise<{ text: string; links: BotLink[] } | null> {
  try {
    const c = await shopConfig();
    if (!isConfigured(c)) return null;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25_000);
    const res = await fetch(`${c.supabaseUrl}/functions/v1/helpbot`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: c.supabaseAnonKey },
      body: JSON.stringify({ messages: history.slice(-8) }),
      signal: ctl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string | null; links?: BotLink[] };
    if (!data.text) return null;
    return { text: data.text, links: Array.isArray(data.links) ? data.links : [] };
  } catch {
    return null;
  }
}
