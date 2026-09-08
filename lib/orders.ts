"use client";
import { CONTACT } from "./contact";
import { fmtILS } from "./format";

/**
 * An order the customer actually placed.
 *
 * Until now the contact form showed a thank-you screen and told nobody: the
 * fields were uncontrolled, nothing was read out of them, and the "send" button
 * only flipped a flag. So an order existed for exactly as long as the tab was
 * open.
 *
 * There is no server to post it to, and the shop stores nothing in the browser,
 * so an order travels the only two roads it has: a WhatsApp message to Ariel's
 * phone, and a link inside that message which carries the whole record into
 * /admin. Opening the link once files it; his decision on it is saved with the
 * same "סיים ועדכן" button as everything else here.
 */
export type DeliveryId = "pickup" | "post" | "courier";

export const DELIVERY: { id: DeliveryId; label: string; price: number; note: string }[] = [
  { id: "pickup", label: "איסוף עצמי", price: 0, note: "פתח תקווה · בתיאום מראש" },
  { id: "post", label: "דואר רשום", price: 25, note: "3-5 ימי עסקים" },
  { id: "courier", label: "שליח עד הבית", price: 45, note: "יום-יומיים" },
];

export const DELIVERY_BY_ID = Object.fromEntries(DELIVERY.map((d) => [d.id, d])) as Record<DeliveryId, (typeof DELIVERY)[number]>;

export type OrderLine = {
  title: string;
  /** The configuration the customer chose, line by line: unit, material, colour, size… */
  summary: string[];
  qty: number;
  price: number | null;
};

export type OrderDecision = "pending" | "approved" | "rejected" | "refunded";

export type PlacedOrder = {
  ref: string;
  at: string;
  customer: { name: string; phone: string; email?: string; kind: string; unit?: string; company?: string };
  inquiry: string;
  delivery: DeliveryId;
  note?: string;
  lines: OrderLine[];
  /** Items total, before delivery. Null when anything is quote-only. */
  itemsTotal: number | null;
  decision?: OrderDecision;
  /** Ariel's own note on the decision. */
  decisionNote?: string;
  decidedAt?: string;
};

export const orderTotal = (o: PlacedOrder): number | null =>
  o.itemsTotal == null ? null : o.itemsTotal + DELIVERY_BY_ID[o.delivery].price;

/** UNIT3D-48213 — short enough to read down a phone. */
export const makeRef = (): string => `UNIT3D-${Math.floor(Math.random() * 90000 + 10000)}`;

// ─── The link that carries an order into /admin ──────────────────────────────
const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64 = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function encodeOrder(o: PlacedOrder): string {
  return toB64(JSON.stringify(o));
}

export function decodeOrder(param: string | null | undefined): PlacedOrder | null {
  if (!param) return null;
  try {
    const o = JSON.parse(fromB64(param)) as PlacedOrder;
    // Anything can be pasted into a URL; take it only when it looks like ours.
    if (typeof o?.ref !== "string" || !Array.isArray(o?.lines)) return null;
    return o;
  } catch {
    return null;
  }
}

/** Where the shop lives, so a link works from the phone that opens it. */
export function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return `${window.location.origin}${base}`;
}

// ─── The message that lands on the phone ─────────────────────────────────────
/**
 * The whole order, written so it reads on a phone screen without scrolling
 * sideways: what was ordered and in what, who ordered it, how it gets to them,
 * what it costs, and a link that files it in /admin.
 */
export function orderMessage(o: PlacedOrder): string {
  const d = DELIVERY_BY_ID[o.delivery];
  const total = orderTotal(o);
  const lines: string[] = [
    `הזמנה חדשה · ${o.ref}`,
    "",
    `לקוח: ${o.customer.name}`,
    `טלפון: ${o.customer.phone}`,
    o.customer.email ? `מייל: ${o.customer.email}` : null,
    `סוג: ${o.customer.kind}${o.inquiry ? ` · ${o.inquiry}` : ""}`,
    o.customer.unit ? `יחידה: ${o.customer.unit}` : null,
    o.customer.company ? `חברה: ${o.customer.company}` : null,
    "",
    "— מה הוזמן —",
  ].filter(Boolean) as string[];

  o.lines.forEach((l, i) => {
    lines.push(`${i + 1}. ${l.title}${l.qty > 1 ? ` × ${l.qty}` : ""}${l.price == null ? " · לפי הזמנה" : ` · ${fmtILS(l.price)}`}`);
    for (const s of l.summary) lines.push(`   ${s}`);
  });

  lines.push(
    "",
    `מסירה: ${d.label}${d.price ? ` · ${fmtILS(d.price)}` : " · חינם"} (${d.note})`,
    o.note ? `הערות הלקוח: ${o.note}` : "הערות הלקוח: —",
    "",
    total == null ? "סה\"כ: לפי הזמנה" : `סה"כ לתשלום: ${fmtILS(total)}`,
    "",
    `לאישור/דחייה: ${siteOrigin()}/admin?order=${encodeOrder(o)}`,
  );
  return lines.join("\n");
}

/** wa.me link with the order already written into it. */
export const orderWhatsapp = (o: PlacedOrder): string =>
  `${CONTACT.whatsapp}?text=${encodeURIComponent(orderMessage(o))}`;
