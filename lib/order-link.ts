"use client";
import type { OrderConfig } from "./types";

/**
 * An order that survives a reload, without storing anything.
 *
 * The cart lives in memory, which is fine while the customer walks from the
 * catalogue to the contact form in one go. It is not fine the moment they
 * refresh, open the form in a second tab, or come back to it later: the order
 * they just built is gone and the page greets them with an empty "what do you
 * need?" — which is exactly what it looked like from the outside.
 *
 * This shop deliberately stores nothing in the browser, so the order rides in
 * the URL instead. Base64 keeps the Hebrew out of the address bar and keeps the
 * link one thing a customer can paste back to us.
 */
const KEY = "o";

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64 = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function orderHref(path: string, order: OrderConfig): string {
  try {
    return `${path}?${KEY}=${toB64(JSON.stringify(order))}`;
  } catch {
    // A link we cannot build is not a reason to lose the click; the in-memory
    // cart still carries the order through a normal navigation.
    return path;
  }
}

export function readOrder(param: string | null | undefined): OrderConfig | null {
  if (!param) return null;
  try {
    const o = JSON.parse(fromB64(param)) as OrderConfig;
    // Anything can be pasted into a URL. Take it only when it looks like ours.
    if (typeof o?.title !== "string" || !Array.isArray(o?.summary)) return null;
    return {
      title: o.title.slice(0, 200),
      summary: o.summary.filter((l): l is string => typeof l === "string").slice(0, 20).map((l) => l.slice(0, 200)),
      price: typeof o.price === "number" && Number.isFinite(o.price) ? o.price : null,
      source: o.source,
      meta: o.meta && typeof o.meta === "object" ? o.meta : undefined,
    };
  } catch {
    return null;
  }
}
