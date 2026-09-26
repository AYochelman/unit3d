// What kind of page a URL points at, which decides whether measuring it tells
// you anything about the design you were looking at.
//
// A live site IS its CSS, so reading its computed styles is reading the design.
// A gallery page is not: the work on it is a picture or a video, made in a
// design tool and uploaded. Measuring that page reads the gallery's own
// chrome - its font, its brand colour, its container width - and reporting
// that as "how this design is built" is simply wrong, however accurate each
// number is.

/** Sites whose pages display someone else's work rather than being it. */
const GALLERY_HOSTS = [
  "dribbble.com",
  "behance.net",
  "pinterest.com",
  "pin.it",
  "instagram.com",
  "x.com",
  "twitter.com",
  "artstation.com",
  "deviantart.com",
  "savee.it",
  "cosmos.so",
  "are.na",
  "tumblr.com",
  "threads.net",
  "facebook.com",
  "linkedin.com",
];

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Is this a page that shows work, rather than a site that is the work? */
export function isGalleryHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return GALLERY_HOSTS.some((g) => host === g || host.endsWith(`.${g}`));
}
