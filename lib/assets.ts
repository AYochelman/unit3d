import { LOCAL_IMAGES } from "./localImages.generated";

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
  return url.startsWith("/") ? `${BASE}${url}` : url;
}
