// Which of a reference's images represents it. Pure, so the self-check can
// hold the order in place: it is easy to add a new asset role and quietly
// demote the one a person chose by hand.

import type { Asset, Reference } from "./types";

/**
 * The order is a claim about who decided:
 *
 *   manual   someone uploaded this picture *because* the automatic ones were
 *            not good enough. Nothing automatic may outrank that.
 *   artwork  the page's own preview image - on a gallery page, the work.
 *   desktop  the screenshot: right for a whole site, furniture for a gallery.
 *   image    an uploaded reference that was never a URL.
 */
const ORDER: Asset["role"][] = ["manual", "artwork", "desktop", "image"];

export function coverOf(ref: Pick<Reference, "assets">): Asset | undefined {
  for (const role of ORDER) {
    const found = ref.assets.find((a) => a.role === role);
    if (found) return found;
  }
  return ref.assets[0];
}

/** Same order, for the handful of images sent to a vision request. */
export function byCoverOrder(assets: Asset[]): Asset[] {
  const rank = (role: Asset["role"]) => {
    const i = ORDER.indexOf(role);
    return i === -1 ? ORDER.length : i;
  };
  return [...assets].sort((a, b) => rank(a.role) - rank(b.role));
}
