"use client";
import type { OrderDecision, PlacedOrder } from "./orders";
import { orderEmailHtml, orderEmailSubject } from "./order-email";

/**
 * Where an order lives between the customer's phone and Ariel's screen.
 *
 * The shop is a static site: it has no server of its own, and it stores nothing
 * in the browser. So an order used to travel inside the message itself — first
 * as an 860-character link, then as text to paste back — and both asked Ariel
 * to carry the data by hand. He shouldn't: he wants to answer on his phone and
 * decide on his computer, and the order should already be waiting there.
 *
 * A Supabase table is that waiting room. The customer's browser writes one row
 * with the anon key (the only thing it is allowed to do); reading those rows —
 * they carry a name, a phone and a mail — needs Ariel to sign in, so the table's
 * row-level security lets `anon` insert and only a signed-in user select and
 * update. Nothing here is a secret: the anon key is meant to be public, and the
 * data behind it is not.
 *
 * Until the two values in public/shop.json are filled in, every call here says
 * so plainly and the shop falls back to the WhatsApp message, which still
 * carries the whole order.
 */
export type EmailJsConfig = { serviceId: string; templateId: string; publicKey: string };
export type ShopConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  emailjs?: EmailJsConfig;
  /** Where the printer's live video is served from, when the shop streams. */
  liveUrl?: string;
};

let cached: ShopConfig | null = null;
let pending: Promise<ShopConfig> | null = null;

export async function shopConfig(): Promise<ShopConfig> {
  if (cached) return cached;
  if (!pending) {
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    pending = fetch(`${base}/shop.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { supabaseUrl: "", supabaseAnonKey: "" }))
      .then((c: ShopConfig) => {
        cached = {
          supabaseUrl: (c.supabaseUrl || "").replace(/\/$/, ""),
          supabaseAnonKey: c.supabaseAnonKey || "",
          emailjs: c.emailjs,
          liveUrl: (c.liveUrl || "").replace(/\/$/, "") || undefined,
        };
        return cached;
      })
      .catch(() => ({ supabaseUrl: "", supabaseAnonKey: "" }));
  }
  return pending;
}

export const isConfigured = (c: ShopConfig) => Boolean(c.supabaseUrl && c.supabaseAnonKey);

/**
 * Supabase has two generations of keys. The old ones are JWTs, and the API
 * expects them in BOTH headers; the new ones (`sb_publishable_…`) are not JWTs
 * and belong in `apikey` alone — sending one as a Bearer token is asking the
 * gateway to parse it as a JWT, which it is not. A signed-in user's token is
 * always a JWT and always goes in Authorization.
 */
const headers = (c: ShopConfig, token?: string) => {
  const legacy = c.supabaseAnonKey.startsWith("ey");
  return {
    apikey: c.supabaseAnonKey,
    ...(token || legacy ? { Authorization: `Bearer ${token || c.supabaseAnonKey}` } : {}),
    "Content-Type": "application/json",
  };
};

// ─── The customer's side ─────────────────────────────────────────────────────
export type PlaceResult = "saved" | "not-configured" | "failed";

/** One row, written by the customer's own browser as they press send. */
export async function placeOrder(o: PlacedOrder): Promise<PlaceResult> {
  const c = await shopConfig();
  if (!isConfigured(c)) return "not-configured";
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: { ...headers(c), Prefer: "return=minimal" },
      body: JSON.stringify({
        ref: o.ref,
        placed_at: o.at,
        customer: o.customer,
        inquiry: o.inquiry,
        delivery: o.delivery,
        note: o.note ?? "",
        lines: o.lines,
        items_total: o.itemsTotal,
        decision: "pending",
      }),
    });
    return res.ok ? "saved" : "failed";
  } catch {
    return "failed";
  }
}

// ─── Ariel's side ────────────────────────────────────────────────────────────
export type Session = { access: string; refresh: string };

/**
 * His Supabase user.
 *
 * The access token is short-lived and stays in memory; the refresh token is
 * what lets the next visit skip the form (lib/admin-session.ts). Supabase
 * rotates the refresh token on every use, so whatever comes back here replaces
 * what was stored.
 */
export async function adminSignIn(email: string, password: string): Promise<Session | null> {
  return authRequest("password", { email, password });
}

/** Trade a stored refresh token for a fresh access token. */
export async function adminRefresh(refresh: string): Promise<Session | null> {
  return authRequest("refresh_token", { refresh_token: refresh });
}

async function authRequest(grant: string, body: Record<string, string>): Promise<Session | null> {
  const c = await shopConfig();
  if (!isConfigured(c)) return null;
  try {
    const res = await fetch(`${c.supabaseUrl}/auth/v1/token?grant_type=${grant}`, {
      method: "POST",
      headers: { apikey: c.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token?: string; refresh_token?: string };
    return j.access_token ? { access: j.access_token, refresh: j.refresh_token ?? "" } : null;
  } catch {
    return null;
  }
}

type Row = {
  ref: string;
  placed_at: string | null;
  created_at: string | null;
  customer: PlacedOrder["customer"] | null;
  inquiry: string | null;
  delivery: PlacedOrder["delivery"] | null;
  note: string | null;
  lines: PlacedOrder["lines"] | null;
  items_total: number | null;
  decision: OrderDecision | null;
  decision_note: string | null;
  decided_at: string | null;
  progress: boolean[] | null;
};

const toOrder = (r: Row): PlacedOrder => ({
  ref: r.ref,
  at: r.placed_at || r.created_at || new Date().toISOString(),
  customer: r.customer ?? { name: "", phone: "", kind: "" },
  inquiry: r.inquiry ?? "",
  delivery: r.delivery ?? "pickup",
  note: r.note ?? "",
  lines: Array.isArray(r.lines) ? r.lines : [],
  itemsTotal: r.items_total,
  decision: r.decision ?? "pending",
  decisionNote: r.decision_note ?? "",
  ...(Array.isArray(r.progress) ? { progress: r.progress } : {}),
  ...(r.decided_at ? { decidedAt: r.decided_at } : {}),
});

/** Everything that came in, newest first. */
export async function adminOrders(token: string): Promise<PlacedOrder[]> {
  const c = await shopConfig();
  if (!isConfigured(c)) return [];
  const res = await fetch(`${c.supabaseUrl}/rest/v1/orders?select=*&order=placed_at.desc`, {
    headers: headers(c, token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(String(res.status));
  const rows = (await res.json()) as Row[];
  return rows.map(toOrder);
}

/** Which items came off the plate, written back to the same row. */
export async function adminProgress(token: string, ref: string, progress: boolean[]): Promise<boolean> {
  const c = await shopConfig();
  if (!isConfigured(c)) return false;
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/orders?ref=eq.${encodeURIComponent(ref)}`, {
      method: "PATCH",
      headers: { ...headers(c, token), Prefer: "return=minimal" },
      body: JSON.stringify({ progress }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** His decision, written back to the same row. */
export async function adminDecide(
  token: string,
  ref: string,
  decision: OrderDecision,
  note: string,
): Promise<boolean> {
  const c = await shopConfig();
  if (!isConfigured(c)) return false;
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/orders?ref=eq.${encodeURIComponent(ref)}`, {
      method: "PATCH",
      headers: { ...headers(c, token), Prefer: "return=minimal" },
      body: JSON.stringify({
        decision,
        decision_note: note,
        decided_at: decision === "pending" ? null : new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── The customer's confirmation ─────────────────────────────────────────────
/**
 * The confirmation email, sent from the customer's own browser through EmailJS.
 *
 * A static site cannot send mail: there is nothing of ours running anywhere to
 * hold an SMTP password. EmailJS exists for exactly this — the account holds
 * the mail credentials, the page holds only a public key, and the template on
 * their side is a single `{{{message_html}}}` because the whole letter is built
 * here (lib/order-email.ts) where the shop's own palette lives.
 *
 * No address, no send. A failure is never fatal: the order is already on its
 * way to Ariel by WhatsApp, and the thank-you screen says what happened.
 */
export async function sendOrderEmail(o: PlacedOrder): Promise<"sent" | "no-address" | "not-configured" | "failed"> {
  const to = o.customer.email?.trim();
  if (!to) return "no-address";
  const c = await shopConfig();
  const e = c.emailjs;
  if (!e?.serviceId || !e?.templateId || !e?.publicKey) return "not-configured";
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: e.serviceId,
        template_id: e.templateId,
        user_id: e.publicKey,
        template_params: {
          to_email: to,
          to_name: o.customer.name || to,
          subject: orderEmailSubject(o),
          order_ref: o.ref,
          message_html: orderEmailHtml(o),
        },
      }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
