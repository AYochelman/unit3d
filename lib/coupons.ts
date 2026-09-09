import { NEXT_ORDER_DISCOUNT, isValidCoupon } from "./coupon";
import { fmtILS } from "./format";

/**
 * Discount codes Ariel writes himself.
 *
 * The 5%-off-your-next-order code (lib/coupon.ts) proves itself arithmetically
 * and needs no list. These are the opposite: a code he invents for a fair, a
 * unit, or one customer, so the shop has to be told they exist. They live in
 * public/coupons.json — written from /admin like every other setting, read by
 * every visitor's browser on load — which means the terms are public. That is
 * fine for what a code is; the honest limit is that it cannot enforce
 * "once per customer" without a backend, so the count below is a stated cap he
 * can see, not a lock.
 */
export type Coupon = {
  code: string;
  /** "percent" — off the items total; "amount" — a flat sum in shekels. */
  kind: "percent" | "amount";
  value: number;
  /** What it is for, in his words. Shown only in /admin. */
  note?: string;
  /** Last day it works, inclusive (YYYY-MM-DD). Empty = no end. */
  until?: string;
  /** Smallest items total it applies to. */
  minTotal?: number;
  active: boolean;
  createdAt: string;
};

export type AppliedDiscount = { code: string; label: string; off: number };

export const normalizeCode = (s: string): string =>
  s.trim().toUpperCase().replace(/\s+/g, "");

const expired = (c: Coupon, now: Date): boolean => {
  if (!c.until) return false;
  const end = new Date(`${c.until}T23:59:59`);
  return !Number.isNaN(end.getTime()) && now > end;
};

export const couponState = (c: Coupon, now = new Date()): "פעיל" | "כבוי" | "פג תוקף" =>
  !c.active ? "כבוי" : expired(c, now) ? "פג תוקף" : "פעיל";

export const couponLabel = (c: Coupon): string =>
  c.kind === "percent" ? `${c.value}% הנחה` : `${fmtILS(c.value)} הנחה`;

/**
 * What a typed code is worth against this basket.
 *
 * Returns the reason when it is worth nothing, because "לא תקף" tells a
 * customer nothing about whether to fix the code or add another item.
 */
export function discountFor(
  list: Coupon[],
  typed: string,
  itemsTotal: number | null,
  now = new Date(),
): { applied?: AppliedDiscount; error?: string } {
  const code = normalizeCode(typed);
  if (!code) return {};
  if (itemsTotal == null) return { error: "בהזמנה יש פריט לתמחור — נסגור את ההנחה בוואטסאפ." };

  const hit = list.find((c) => normalizeCode(c.code) === code);
  if (!hit) {
    // The self-checking code every customer leaves with, which is on no list.
    if (isValidCoupon(code)) {
      const off = Math.round(itemsTotal * NEXT_ORDER_DISCOUNT);
      return { applied: { code, label: `${Math.round(NEXT_ORDER_DISCOUNT * 100)}% הנחה`, off } };
    }
    return { error: "הקוד לא קיים." };
  }
  if (!hit.active) return { error: "הקוד כבר לא בתוקף." };
  if (expired(hit, now)) return { error: "פג תוקף הקוד." };
  if (hit.minTotal && itemsTotal < hit.minTotal) {
    return { error: `הקוד תקף מהזמנה של ${fmtILS(hit.minTotal)}.` };
  }

  const raw = hit.kind === "percent" ? (itemsTotal * hit.value) / 100 : hit.value;
  const off = Math.min(itemsTotal, Math.round(raw));
  if (off <= 0) return { error: "הקוד לא מוריד מהסכום הזה." };
  return { applied: { code: normalizeCode(hit.code), label: couponLabel(hit), off } };
}

/** A code that reads well out loud: no O/0, no I/1, no S/5. */
export function suggestCode(prefix = "UNIT"): string {
  const A = "ACDEFGHJKLMNPQRTUVWXY3479";
  let body = "";
  for (let i = 0; i < 4; i++) body += A[Math.floor(Math.random() * A.length)];
  return `${prefix}${body}`;
}
