/**
 * The 5% code a customer leaves with.
 *
 * There is no server to keep a list of issued codes in, so the code carries
 * its own check character: four random characters plus one derived from them.
 * That is enough for the owner to tell a real code from a made-up one in the
 * WhatsApp thread — /admin has a box that checks it — and it is honest about
 * what it is not: anyone who reads the site's code could mint one. For a shop
 * this size that trade is worth it; the alternative is a backend.
 *
 * The alphabet drops every character that gets misread out loud or in a photo
 * of a screen: no O/0, no I/1, no S/5, no B/8, no Z/2.
 */
const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3479";
const LEN = 4;

export const NEXT_ORDER_DISCOUNT = 0.05;
export const COUPON_PREFIX = "U3D5";

const check = (body: string) =>
  ALPHABET[[...body].reduce((a, ch) => a + ALPHABET.indexOf(ch) + 7, 0) % ALPHABET.length];

/** A fresh code for a customer who just ordered. */
export function makeCoupon(): string {
  let body = "";
  for (let i = 0; i < LEN; i++) body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${COUPON_PREFIX}-${body}${check(body)}`;
}

/** Does this look like a code this shop issued? Case and spacing forgiven. */
export function isValidCoupon(code: string): boolean {
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");
  const m = new RegExp(`^${COUPON_PREFIX}-([${ALPHABET}]{${LEN}})([${ALPHABET}])$`).exec(clean);
  return !!m && check(m[1]) === m[2];
}
