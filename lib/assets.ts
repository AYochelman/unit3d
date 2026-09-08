import { LOCAL_IMAGES } from "./localImages.generated";
import { LOCAL_VIDEOS } from "./localVideos.generated";

/**
 * Where an image on this site actually comes from.
 *
 * Every catalogue photograph used to be hotlinked from the designer's CDN.
 * That works until it doesn't: the CDN can rate-limit us, rewrite a path, or
 * simply go away, and then the shop is full of grey boxes. `npm run
 * fetch:images` downloads every one of them into public/img/catalog and
 * writes the manifest this reads, so the site serves its own copies from its
 * own domain. A URL with no local copy yet still falls back to the original,
 * so nothing breaks between adding a model and fetching its picture.
 *
 * It also fixes the second half of the problem: GitHub Pages serves the site
 * under /unit3d/, and next/image does NOT prepend that base path to a local
 * src when images are unoptimised. Every local path goes through here.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function photoSrc(url: string): string;
export function photoSrc(url: undefined): undefined;
export function photoSrc(url?: string): string | undefined;
export function photoSrc(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) {
    const local = LOCAL_IMAGES[url];
    return local ? `${BASE}/${local}` : url;
  }
  // Idempotent on purpose. Some rows are resolved once when a module is built
  // (lib/imported.ts, lib/data.ts) and then handed to a component that resolves
  // again; prepending the base path twice asks for /unit3d/unit3d/... , which
  // is a 404 on the published site and invisible in dev, where BASE is empty.
  if (BASE && url.startsWith(`${BASE}/`)) return url;
  return url.startsWith("/") ? `${BASE}${url}` : url;
}

/**
 * The same rule for anything else served out of public/ — a video, a poster,
 * a PDF. `photoSrc` does the work; this name exists so a `<video src>` does
 * not have to claim to be a photograph.
 */
export const assetSrc = photoSrc;

/**
 * The designer's clip for a product, if we hold one.
 *
 * Only some models have one — a fidget that clicks, a flexi that bends. The
 * card plays it on hover and falls back to the photograph when this returns
 * nothing, so nothing has to know in advance which is which.
 */
export function clipSrc(productId?: string): string | undefined {
  if (!productId) return undefined;
  const local = LOCAL_VIDEOS[productId];
  return local ? `${BASE}/${local}` : undefined;
}
