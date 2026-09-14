"use client";
import { shopConfig, isConfigured, type ShopConfig } from "./orders-remote";

/**
 * The photograph a customer attaches to their review.
 *
 * A review that says "יצא מהמם למדף שלי" is worth something; the same review
 * with the shelf in it is worth a lot more, and it is the one thing the shop
 * cannot fake. So the form takes a picture straight from the phone.
 *
 * The shop has no server, so the picture goes where the review goes: a public
 * Supabase Storage bucket the customer's own browser writes to with the anon
 * key, exactly like the review row itself. What comes back is a plain URL, and
 * that URL is all the review row stores — `photo` on the table, `Review.photo`
 * in the app, which every card already knows how to draw.
 *
 * Two things happen before anything leaves the phone:
 *
 *   · **It is made small.** A photo off a modern phone is 4–8MB and 4000px
 *     wide. Nobody needs that on a review card, and a visitor on cellular
 *     certainly does not want to download it. The browser redraws it at at
 *     most 1400px and re-encodes it as JPEG, which lands around 200–400KB.
 *     The EXIF goes with the re-encode, and with it the GPS coordinates of
 *     someone's living room — that is a feature, not a side effect.
 *   · **It is renamed.** The file arrives as `IMG_4821.HEIC` or worse, with
 *     the customer's own naming in it; what gets stored is a random id.
 *
 * If any of that fails — an old browser, a HEIC the canvas cannot decode —
 * the original file is uploaded as-is as long as it is not enormous. A photo
 * that arrives a little heavy beats a photo that never arrives.
 */

/** The bucket. Public read, anon insert — see docs/review-photos.md. */
export const REVIEW_BUCKET = "review-photos";

/** Longest edge after the redraw. A review card is never wider than this. */
const MAX_EDGE = 1400;
/** Anything under this is small enough to stop trying. */
const GOOD_ENOUGH = 420_000;
/** What the form refuses to even open. */
export const MAX_PICK = 25 * 1024 * 1024;
/** What may be uploaded untouched when the redraw fails. */
const MAX_RAW = 5 * 1024 * 1024;

/** Decoded pixels, however this browser is willing to give them. */
async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      // from-image so a portrait photo does not arrive on its side.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("decode"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas: HTMLCanvasElement, q: number): Promise<Blob | null> =>
  new Promise((res) => canvas.toBlob(res, "image/jpeg", q));

/**
 * Smaller, lighter, and without the metadata.
 *
 * Returns null when this browser cannot decode the file at all, which is the
 * caller's cue to send the original.
 */
export async function shrink(file: File): Promise<Blob | null> {
  let src: (CanvasImageSource & { width: number; height: number }) | null = null;
  try {
    src = await decode(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(src.width, src.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(src.width * scale));
    canvas.height = Math.max(1, Math.round(src.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

    // Falling quality rather than one guess: a flat photo of a keychain on a
    // desk compresses to nothing at 0.82, a busy shelf does not.
    for (const q of [0.82, 0.7, 0.6]) {
      const blob = await toBlob(canvas, q);
      if (!blob) return null;
      if (blob.size <= GOOD_ENOUGH || q === 0.6) return blob;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (src && "close" in src && typeof src.close === "function") src.close();
  }
}

/** Storage wants the key in `apikey`, and a JWT key in both. Same rule as the tables. */
const uploadHeaders = (c: ShopConfig, type: string): Record<string, string> => {
  const legacy = c.supabaseAnonKey.startsWith("ey");
  return {
    apikey: c.supabaseAnonKey,
    ...(legacy ? { Authorization: `Bearer ${c.supabaseAnonKey}` } : {}),
    "Content-Type": type,
    "cache-control": "public, max-age=31536000, immutable",
    "x-upsert": "false",
  };
};

const newName = (ext: string) => {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${rnd}.${ext}`;
};

/**
 * Put the picture in the bucket and hand back the URL the review row stores.
 *
 * Returns undefined on any failure. The caller publishes the review anyway —
 * losing the words because the picture would not upload is the wrong trade.
 */
export async function uploadReviewPhoto(file: File): Promise<string | undefined> {
  const c = await shopConfig();
  if (!isConfigured(c)) return undefined;

  const small = await shrink(file);
  const body: Blob = small ?? file;
  if (!small && file.size > MAX_RAW) return undefined;
  const type = small ? "image/jpeg" : file.type || "application/octet-stream";
  const ext = small ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const name = newName(ext);

  try {
    const res = await fetch(`${c.supabaseUrl}/storage/v1/object/${REVIEW_BUCKET}/${name}`, {
      method: "POST",
      headers: uploadHeaders(c, type),
      body,
    });
    if (!res.ok) return undefined;
    return `${c.supabaseUrl}/storage/v1/object/public/${REVIEW_BUCKET}/${name}`;
  } catch {
    return undefined;
  }
}
