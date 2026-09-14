"use client";
import type { Review, ReviewSeg } from "./types";
import { shopConfig, isConfigured, type ShopConfig } from "./orders-remote";

/**
 * Reviews customers write, published the moment they press send.
 *
 * The shop is a static site, so there is nowhere to queue a review for
 * approval — and nobody asked for a queue. A review goes straight into the
 * same Supabase project the orders use: the customer's browser writes one row
 * with the anon key, and the next visitor's browser reads it back. No step in
 * between, no waiting for Ariel to be at his computer.
 *
 * That trade is deliberate and it has a cost: anything written here is on the
 * site immediately, including something rude or something fake. The answer is
 * removal after the fact, not approval before it — the admin screen lists every
 * review with a button that takes it down, and the row stays in the table so it
 * can come back if the takedown was a mistake.
 *
 * What stops the obvious abuse without a server:
 *   · the table's own CHECK constraints (lengths, 1–5 stars) — a browser that
 *     skips the form still cannot write a 40,000-character review;
 *   · `hidden` can only be written as false by anon, so nobody can insert a
 *     row that hides someone else's;
 *   · a honeypot field and a minimum dwell time in the form, which is enough
 *     for the drive-by bots and nothing more.
 * Someone determined can still POST with curl. That is what removal is for.
 */

/** A review as it comes back from the table. */
export type RemoteReview = {
  id: string;
  created_at: string;
  name: string;
  tag: string | null;
  seg: ReviewSeg;
  stars: number;
  txt: string;
  item: string | null;
  /** A public Supabase Storage URL, when they attached a picture. */
  photo: string | null;
  hidden: boolean;
};

export type NewReview = {
  name: string;
  tag?: string;
  seg: ReviewSeg;
  stars: number;
  txt: string;
  item?: string;
  /** Already uploaded by `uploadReviewPhoto`; this only stores the URL. */
  photo?: string;
};

const headers = (c: ShopConfig, token?: string) => {
  const legacy = c.supabaseAnonKey.startsWith("ey");
  return {
    apikey: c.supabaseAnonKey,
    ...(token || legacy ? { Authorization: `Bearer ${token || c.supabaseAnonKey}` } : {}),
    "Content-Type": "application/json",
  };
};

/** Hebrew dates the way the rest of the site says them. */
function said(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 14) return "לפני שבוע";
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  if (days < 60) return "לפני חודש";
  if (days < 365) return `לפני ${Math.floor(days / 30)} חודשים`;
  return "לפני יותר משנה";
}

/** The shape the cards already know how to draw. */
export function toReview(r: RemoteReview): Review {
  return {
    id: `db-${r.id}`,
    name: r.name,
    tag: r.tag || undefined,
    seg: r.seg,
    stars: r.stars,
    txt: r.txt,
    item: r.item || undefined,
    photo: r.photo || undefined,
    when: said(r.created_at),
  };
}

export type SubmitResult = "published" | "published-no-photo" | "not-configured" | "failed";

/** The row, as PostgREST wants it. */
type Row = Record<string, string | number | boolean | null>;

const rowOf = (r: NewReview): Row => ({
  name: r.name.trim().slice(0, 40),
  tag: (r.tag || "").trim().slice(0, 60) || null,
  seg: r.seg,
  stars: Math.min(5, Math.max(1, Math.round(r.stars))),
  txt: r.txt.trim().slice(0, 1200),
  item: (r.item || "").trim().slice(0, 80) || null,
  photo: (r.photo || "").trim().slice(0, 400) || null,
  hidden: false,
});

async function insert(c: ShopConfig, row: Row): Promise<Response> {
  return fetch(`${c.supabaseUrl}/rest/v1/reviews`, {
    method: "POST",
    headers: { ...headers(c), Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}

/**
 * One row, written by the reviewer's own browser. It is live on send.
 *
 * The second attempt is not paranoia, it is a scar. `photo` was added to this
 * row before the column existed in the table, and PostgREST does not ignore a
 * column it does not know — it rejects the whole insert, and it does so even
 * when the value is null. So a customer wrote a review, pressed send, and the
 * words went nowhere because of a field she had never filled in.
 *
 * Hence the retry, and hence it does NOT depend on a picture being attached:
 * the key alone is enough to sink the row. Everything a review cannot live
 * without goes in the first attempt; the optional half retries without itself
 * before giving up. What someone wrote is never lost to a column that is not
 * there yet.
 */
export async function submitReview(r: NewReview): Promise<SubmitResult> {
  const c = await shopConfig();
  if (!isConfigured(c)) return "not-configured";
  try {
    const row = rowOf(r);
    const res = await insert(c, row);
    if (res.ok) return "published";

    // Loud on purpose: this is the one failure a customer cannot see and Ariel
    // cannot reproduce. `hidden` stays in — without it the insert policy fails.
    const why = await res.text().catch(() => "");
    console.warn("[reviews] insert failed", res.status, why);

    const { photo, ...withoutPhoto } = row;
    if (!(await insert(c, withoutPhoto)).ok) return "failed";
    // A picture was meant to go with it only if there was one to begin with.
    return photo === null ? "published" : "published-no-photo";
  } catch {
    return "failed";
  }
}

/** Everything a visitor is allowed to see, newest first. */
export async function publicReviews(): Promise<Review[]> {
  const c = await shopConfig();
  if (!isConfigured(c)) return [];
  try {
    const res = await fetch(
      `${c.supabaseUrl}/rest/v1/reviews?select=*&hidden=is.false&order=created_at.desc&limit=200`,
      { headers: headers(c), cache: "no-store" },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as RemoteReview[];
    return rows.map(toReview);
  } catch {
    return [];
  }
}

// ─── Ariel's side ────────────────────────────────────────────────────────────

/**
 * Including the ones he took down, so he can put one back.
 *
 * Failure is reported, not swallowed. An empty array used to mean both "nobody
 * has written one" and "the table is not there", and the screen said the first
 * — which is how a missing table looks exactly like a quiet week.
 */
export async function adminReviews(token: string): Promise<{ rows: RemoteReview[]; error?: string }> {
  const c = await shopConfig();
  if (!isConfigured(c)) return { rows: [], error: "shop.json עוד לא מוגדר." };
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/reviews?select=*&order=created_at.desc`, {
      headers: headers(c, token),
      cache: "no-store",
    });
    if (res.ok) return { rows: (await res.json()) as RemoteReview[] };
    const body = await res.text().catch(() => "");
    return {
      rows: [],
      error:
        res.status === 404 || /does not exist|schema cache/i.test(body)
          ? "טבלת הביקורות לא קיימת ב-Supabase. צריך להריץ את docs/reviews-table.md."
          : `הקריאה נכשלה (${res.status}). ${body.slice(0, 160)}`,
    };
  } catch {
    return { rows: [], error: "אין חיבור ל-Supabase." };
  }
}

/** Take one down, or put it back. The row is never deleted by this. */
export async function setReviewHidden(id: string, hidden: boolean, token: string): Promise<boolean> {
  const c = await shopConfig();
  if (!isConfigured(c)) return false;
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...headers(c, token), Prefer: "return=minimal" },
      body: JSON.stringify({ hidden }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** For the spam, where hiding is not enough. */
export async function deleteReview(id: string, token: string): Promise<boolean> {
  const c = await shopConfig();
  if (!isConfigured(c)) return false;
  try {
    const res = await fetch(`${c.supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...headers(c, token), Prefer: "return=minimal" },
    });
    return res.ok;
  } catch {
    return false;
  }
}
