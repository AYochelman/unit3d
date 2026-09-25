"use client";
import { shopConfig, isConfigured, type ShopConfig } from "./orders-remote";

/**
 * Who came, from where, and what they touched.
 *
 * The shop had no numbers at all: not how many people opened it, not which
 * shelf they went to, not whether the WhatsApp button was ever pressed. Every
 * decision about the site was being made blind.
 *
 * This is deliberately small and first-party. No Google Analytics, no tag
 * manager, no third-party script: one row per event, written by the visitor's
 * own browser into the same Supabase project the orders use, and read back only
 * by a signed-in owner. Nothing is sold, shared, or sent anywhere else.
 *
 * WHAT IT DOES NOT COLLECT
 * No name, no mail, no phone, no IP address, no cookie and nothing that
 * survives closing the tab. The `visit` id is random, lives in sessionStorage
 * and dies with the tab — it exists so that eight page views from one person
 * are not counted as eight people, and it cannot identify anyone.
 *
 * The owner's own browsing is skipped while the admin is unlocked, so his
 * twenty visits a day do not drown the real ones.
 */
export type EventName =
  | "page_view"
  | "product_open"
  | "shelf_open"
  | "whatsapp_click"
  | "order_start"
  | "order_sent"
  | "configurator_open"
  | "review_sent"
  | "live_open"
  | "search"
  | "finder_open"
  | "finder_done";

type Props = Record<string, string | number | boolean | null | undefined>;

const VISIT_KEY = "unit3d.visit";

/** Per-tab, random, gone when the tab closes. Not an identity. */
function visitId(): string {
  try {
    const s = window.sessionStorage;
    let v = s.getItem(VISIT_KEY);
    if (!v) {
      v = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      s.setItem(VISIT_KEY, v);
    }
    return v;
  } catch {
    return "no-storage";
  }
}

/**
 * Where they came from, in the words a person would use.
 *
 * A raw referrer is a URL; what the owner wants to read is "אינסטגרם" or
 * "חיפוש בגוגל". utm_source wins when a link carries one, because that is the
 * campaign he tagged himself.
 */
function sourceOf(referrer: string, utm: string | null): string {
  if (utm) return utm.toLowerCase();
  if (!referrer) return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "other";
  }
  if (host.endsWith("unit-3d.com")) return "internal";
  if (/google\./.test(host)) return "google";
  if (/bing\.|duckduckgo\.|yandex\./.test(host)) return "search";
  if (/instagram\./.test(host)) return "instagram";
  if (/facebook\.|fb\./.test(host)) return "facebook";
  if (/tiktok\./.test(host)) return "tiktok";
  if (/whatsapp\.|wa\.me/.test(host)) return "whatsapp";
  if (/t\.co|twitter\.|x\.com/.test(host)) return "twitter";
  if (/youtube\.|youtu\.be/.test(host)) return "youtube";
  if (/linkedin\./.test(host)) return "linkedin";
  if (/telegram\.|t\.me/.test(host)) return "telegram";
  if (/makerworld\./.test(host)) return "makerworld";
  return host.slice(0, 60);
}

const headers = (c: ShopConfig) => {
  const legacy = c.supabaseAnonKey.startsWith("ey");
  return {
    apikey: c.supabaseAnonKey,
    ...(legacy ? { Authorization: `Bearer ${c.supabaseAnonKey}` } : {}),
    "Content-Type": "application/json",
  };
};

/** Set by the admin boot so the owner's own browsing is not counted. */
let muted = false;
export const muteAnalytics = (on: boolean) => { muted = on; };

/**
 * One event. Never throws, never blocks, never delays a click.
 *
 * A failure here must be invisible: analytics that can break the shop is worse
 * than no analytics.
 */
export function track(name: EventName, props: Props = {}): void {
  if (typeof window === "undefined" || muted) return;
  // Headless browsers and crawlers are not customers.
  if (navigator.webdriver) return;

  void (async () => {
    try {
      const c = await shopConfig();
      if (!isConfigured(c)) return;

      const url = new URL(window.location.href);
      const utm = url.searchParams.get("utm_source");
      const referrer = document.referrer || "";

      const body = {
        name,
        visit: visitId(),
        path: url.pathname.slice(0, 200),
        source: sourceOf(referrer, utm),
        referrer: referrer.slice(0, 200) || null,
        utm_campaign: url.searchParams.get("utm_campaign")?.slice(0, 80) ?? null,
        // A width bucket rather than an exact size: enough to know whether the
        // shop is browsed on a phone, and not a fingerprint.
        device: window.innerWidth < 640 ? "phone" : window.innerWidth < 1024 ? "tablet" : "desktop",
        lang: (navigator.language || "").slice(0, 8) || null,
        props: Object.keys(props).length ? props : null,
      };

      await fetch(`${c.supabaseUrl}/rest/v1/site_events`, {
        method: "POST",
        headers: { ...headers(c), Prefer: "return=minimal" },
        body: JSON.stringify(body),
        keepalive: true, // survives the navigation a click causes
      });
    } catch {
      /* analytics never breaks the shop */
    }
  })();
}

// ─── The owner's side ────────────────────────────────────────────────────────

export type SiteEvent = {
  id: number;
  created_at: string;
  name: EventName;
  visit: string;
  path: string;
  source: string;
  referrer: string | null;
  utm_campaign: string | null;
  device: string;
  lang: string | null;
  props: Record<string, unknown> | null;
};

/** Everything in the window, newest first. Aggregated in the browser. */
export async function readEvents(token: string, days = 30): Promise<SiteEvent[]> {
  const c = await shopConfig();
  if (!isConfigured(c)) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    const res = await fetch(
      `${c.supabaseUrl}/rest/v1/site_events?select=*&created_at=gte.${since}&order=created_at.desc&limit=20000`,
      { headers: { ...headers(c), Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    return res.ok ? ((await res.json()) as SiteEvent[]) : [];
  } catch {
    return [];
  }
}
