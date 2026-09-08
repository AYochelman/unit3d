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
 * so an order travels the only road it has: a WhatsApp message to Ariel's phone.
 * The message is written to be read AND to be read back — he pastes it into
 * /admin, `parseOrderMessage` turns it into this record again, and his decision
 * on it is saved with the same "סיים ועדכן" button as everything else here.
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
/** Where Ariel reads his queue. Short, and the same on every phone. */
export const ADMIN_URL = "https://unit-3d.com/admin";

/** The first summary line that opens with this label, without the label. */
const pick = (summary: string[], label: string): string | null => {
  const hit = summary.find((s) => s.trim().startsWith(label + ":"));
  return hit ? hit.slice(hit.indexOf(":") + 1).trim() : null;
};

/** "PLA · שחור" — the two facts that decide which spool comes off the shelf. */
const materialColor = (l: OrderLine): string =>
  [pick(l.summary, "חומר"), pick(l.summary, "צבע")].filter(Boolean).join(" · ") || "—";

/**
 * The product as it goes on the print bed: what it is, how big, and — when the
 * customer asked for one — the text engraved on it. Everything else about the
 * line has its own numbered field below it.
 */
const productTitle = (l: OrderLine): string => {
  const parts = [l.title];
  const size = pick(l.summary, "גודל") ?? pick(l.summary, "מוצר")?.split(" · ").slice(1).join(" · ");
  if (size) parts.push(size);
  const text = pick(l.summary, "כיתוב");
  if (text && !text.startsWith("ללא")) parts.push(`כיתוב: ${text}`);
  return parts.join(" · ");
};

const hoursOf = (l: OrderLine): string => pick(l.summary, "זמן הדפסה") ?? "—";

/**
 * The whole order, written so it reads on a phone screen in one glance: who
 * ordered, then each product with the four things Ariel needs before he starts
 * printing — name, filament, price, time — and a plain link to his own queue.
 *
 * The message is also the record: /admin reads it back with `parseOrderMessage`,
 * which is why the labels below are fixed and not decorative.
 */
export function orderMessage(o: PlacedOrder): string {
  const d = DELIVERY_BY_ID[o.delivery];
  const total = orderTotal(o);
  const out: string[] = [
    "הזמנה חדשה",
    "",
    `מספר הזמנה: ${o.ref}`,
    `טלפון: ${o.customer.phone}`,
    `מייל: ${o.customer.email || "—"}`,
    `סוג לקוח: ${o.customer.kind}`,
    "",
    "מה הוזמן",
  ];

  o.lines.forEach((l, i) => {
    out.push(
      "",
      `${i + 1}. ${productTitle(l)}`,
      `חומר וצבע: ${materialColor(l)}`,
      `כמות: ${l.qty}`,
      `מחיר: ${l.price == null ? "לפי הזמנה" : fmtILS(l.price)}`,
      `זמן הדפסה: ${hoursOf(l)}`,
    );
  });

  out.push(
    "",
    `מסירה: ${d.label}${d.price ? ` · ${fmtILS(d.price)}` : " · חינם"}`,
    `הערות: ${o.note?.trim() || "—"}`,
    total == null ? "סה\"כ לתשלום: לפי הזמנה" : `סה"כ לתשלום: ${fmtILS(total)}`,
    "",
    ADMIN_URL,
  );
  return out.join("\n");
}

/** wa.me link with the order already written into it. */
export const orderWhatsapp = (o: PlacedOrder): string =>
  `${CONTACT.whatsapp}?text=${encodeURIComponent(orderMessage(o))}`;

// ─── Reading the message back in /admin ──────────────────────────────────────
const num = (s: string | null): number | null => {
  if (!s) return null;
  const m = s.replace(/[,\s]/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const field = (line: string, label: string): string | null =>
  line.trim().startsWith(label + ":") ? line.slice(line.indexOf(":") + 1).trim() : null;

/**
 * The message, read back into an order.
 *
 * The link that used to carry the whole record was hundreds of characters long
 * on a phone screen, so the message carries nothing but the order itself: Ariel
 * pastes it into /admin and it files exactly as the link once did. It parses
 * only what `orderMessage` writes — anything else pasted here returns null
 * rather than a half-order.
 */
export function parseOrderMessage(text: string): PlacedOrder | null {
  const rows = (text || "").split(/\r?\n/);
  let ref = "", phone = "", email = "", kind = "", note = "";
  let delivery: DeliveryId = "pickup";
  const lines: OrderLine[] = [];
  let cur: OrderLine | null = null;

  const flush = () => { if (cur) lines.push(cur); cur = null; };

  for (const row of rows) {
    const t = row.trim();
    if (!t) continue;

    const start = t.match(/^(\d+)\.\s*(.+)$/);
    if (start) {
      flush();
      let title = start[2].trim();
      let qty = 1;
      // Older messages carried the quantity in the title; newer ones give it a
      // field of its own, which the loop below fills in.
      const q = title.match(/\s*[×x]\s*(\d+)\s*$/);
      if (q) { qty = Number(q[1]); title = title.replace(/\s*[×x]\s*\d+\s*$/, "").trim(); }
      cur = { title, summary: [], qty, price: null };
      continue;
    }

    const mc = field(t, "חומר וצבע");
    if (mc && cur) {
      const [material, ...rest] = mc.split(" · ");
      if (material && material !== "—") cur.summary.push(`חומר: ${material}`);
      if (rest.length) cur.summary.push(`צבע: ${rest.join(" · ")}`);
      continue;
    }
    const qty = field(t, "כמות");
    if (qty != null && cur) { cur.qty = Math.max(1, num(qty) ?? 1); continue; }
    const price = field(t, "מחיר");
    if (price != null && cur) { cur.price = price.includes("לפי הזמנה") ? null : num(price); continue; }
    const hours = field(t, "זמן הדפסה");
    if (hours != null && cur) { cur.summary.push(`זמן הדפסה: ${hours}`); continue; }

    ref = field(t, "מספר הזמנה") ?? ref;
    phone = field(t, "טלפון") ?? phone;
    kind = field(t, "סוג לקוח") ?? kind;
    const mail = field(t, "מייל");
    if (mail) email = mail === "—" ? "" : mail;
    const rem = field(t, "הערות");
    if (rem) note = rem === "—" ? "" : rem;
    const del = field(t, "מסירה");
    if (del) {
      const hit = DELIVERY.find((x) => del.startsWith(x.label));
      if (hit) delivery = hit.id;
    }
  }
  flush();

  if (!ref || !lines.length) return null;

  const priced = lines.every((l) => l.price != null);
  return {
    ref,
    at: new Date().toISOString(),
    customer: { name: "", phone, email, kind: kind || "לקוח" },
    inquiry: "",
    delivery,
    note,
    lines,
    itemsTotal: priced ? lines.reduce((s, l) => s + (l.price ?? 0), 0) : null,
  };
}
