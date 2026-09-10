/**
 * Which build of the agent this is.
 *
 * Three times running, a fix was reported as "still broken" from a screenshot
 * of the previous version — because updating meant downloading a ZIP and
 * replacing a folder by hand, and a folder replaced imperfectly looks exactly
 * like a fix that did not work. Every tool prints this line first, so the
 * question "is this the new code?" is answered before anything else is read.
 */
export const VERSION = "2026-09-10.11";

export const banner = (what) =>
  console.log(`\n  Unit 3D · ${what}\n  agent version ${VERSION}\n`);
