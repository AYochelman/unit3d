"use client";
import { isConfigured, shopConfig } from "./orders-remote";

/**
 * The printer's LAN access code, handed to the agent through the database.
 *
 * Written to `shop_settings` (owner-only, behind the sign-in); the agent reads
 * it with its service key once a minute and restarts with it. Only the time it
 * was set is ever read back here — the code itself is not shown again.
 */
const auth = async (token: string) => {
  const c = await shopConfig();
  if (!isConfigured(c) || !token) return null;
  return {
    url: c.supabaseUrl,
    headers: { apikey: c.supabaseAnonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    anon: { apikey: c.supabaseAnonKey },
  };
};

export const validAccessCode = (s: string) => /^[A-Za-z0-9]{6,16}$/.test(s.trim());

export async function saveAccessCode(token: string, code: string): Promise<boolean> {
  const a = await auth(token);
  if (!a) return false;
  try {
    const res = await fetch(`${a.url}/rest/v1/shop_settings?on_conflict=key`, {
      method: "POST",
      headers: { ...a.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: "printer_access_code", value: { code: code.trim(), at: new Date().toISOString() } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** When the code was last set from here (never the code). */
export async function accessCodeSetAt(token: string): Promise<string | null> {
  const a = await auth(token);
  if (!a) return null;
  try {
    const res = await fetch(`${a.url}/rest/v1/shop_settings?key=eq.printer_access_code&select=value->>at`, { headers: a.headers, cache: "no-store" });
    if (!res.ok) return null;
    const row = (await res.json())[0] as { at?: string } | undefined;
    return row?.at ?? null;
  } catch {
    return null;
  }
}

export type AgentStatus = { state: string; updated_at: string; nozzle_temp?: number; job_name?: string | null };

/** What the agent last reported (public, the live page reads the same row). */
export async function agentStatus(): Promise<AgentStatus | null> {
  const c = await shopConfig();
  if (!isConfigured(c)) return null;
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/printer_status?id=eq.live&select=state,updated_at,nozzle_temp,job_name`, {
      headers: { apikey: c.supabaseAnonKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as AgentStatus[])[0] ?? null;
  } catch {
    return null;
  }
}

export type AgentInfo = { host: string; ips: string[]; platform: string; user: string; dir: string; version: string; printer: string; at: string };

/** Where the agent says it runs (private: owner sign-in). */
export async function agentInfo(token: string): Promise<AgentInfo | null> {
  const a = await auth(token);
  if (!a) return null;
  try {
    const res = await fetch(`${a.url}/rest/v1/shop_settings?key=eq.agent_info&select=value`, { headers: a.headers, cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json())[0]?.value as AgentInfo | undefined) ?? null;
  } catch {
    return null;
  }
}
