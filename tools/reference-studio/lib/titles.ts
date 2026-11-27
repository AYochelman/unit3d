// Naming a reference. Pure string work, kept apart from the factory so the
// self-check can import it without pulling in anything that touches disk.

/**
 * A page title carries the site's own name, because that is what a browser tab
 * and a search result want. A wall of cards does not: "… on Dribbble" on every
 * one of seventeen cards pushes out the part that tells them apart. Drop the
 * site's name where the page appended it, and keep the title short enough to
 * read at a glance.
 */
export function cleanTitle(raw: string, sourceUrl: string): string {
  let title = raw.replace(/\s+/g, " ").trim();
  if (!title) return title;

  // The site's name as it would write it: "dribbble.com" -> "dribbble".
  let site = "";
  try {
    const parts = new URL(sourceUrl).hostname.replace(/^www\./, "").split(".");
    site = parts.length > 2 && parts[0] !== "www" ? parts[parts.length - 2] : parts[0];
  } catch { /* no hostname to strip */ }

  if (site) {
    const escaped = site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // "Title | Site", "Title - Site", "Title — Site", "Title · Site"
    title = title.replace(new RegExp(`\\s*[|\\-–—·:]\\s*${escaped}\\b.*$`, "i"), "");
    // "Title by Someone on Site" - the byline belongs to the source, not the card.
    title = title.replace(new RegExp(`\\s+(?:by\\s+.+?\\s+)?on\\s+${escaped}\\b.*$`, "i"), "");
  }

  title = title.trim().replace(/[|\-–—·,:]+$/, "").trim();
  if (title.length > 70) title = `${title.slice(0, 69).trimEnd()}…`;
  return title || raw.trim();
}

/** A readable title from a URL when the user did not type one. */
export function titleFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const seg = url.pathname.split("/").filter(Boolean).pop();
    return seg ? `${url.hostname.replace(/^www\./, "")} / ${decodeURIComponent(seg)}` : url.hostname.replace(/^www\./, "");
  } catch {
    return raw.slice(0, 80);
  }
}