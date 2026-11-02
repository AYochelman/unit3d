"use client";

/**
 * The visitor's answer about Google Analytics, kept in a first-party cookie.
 *
 * A cookie and not localStorage: the project keeps no browser storage (see
 * CLAUDE.md), and remembering a refusal is the one thing a consent banner must
 * store — asking again on every page would turn "no" into a nag. This cookie
 * holds only "granted" or "denied", is strictly necessary for the choice to
 * stick, and needs no consent of its own.
 *
 * useSyncExternalStore-shaped, so the banner and the tag read it without an
 * effect that sets state.
 */
export type Consent = "granted" | "denied" | "unset";

const NAME = "u3d_consent";
const YEAR = 365 * 24 * 60 * 60;
const listeners = new Set<() => void>();

export function readConsent(): Consent {
  if (typeof document === "undefined") return "unset";
  const m = document.cookie.match(/(?:^|;\s*)u3d_consent=(granted|denied)/);
  return (m?.[1] as Consent) ?? "unset";
}

export function setConsent(v: "granted" | "denied") {
  document.cookie = `${NAME}=${v}; max-age=${YEAR}; path=/; SameSite=Lax`;
  // Taking consent back must also take back what Analytics already left.
  if (v === "denied") {
    for (const c of document.cookie.split(";")) {
      const k = c.split("=")[0].trim();
      if (k === "_ga" || k.startsWith("_ga_")) {
        const host = location.hostname.replace(/^www\./, "");
        for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) {
          document.cookie = `${k}=; max-age=0; path=/${domain}`;
        }
      }
    }
  }
  listeners.forEach((l) => l());
}

/** Forget the answer so the banner asks again (the cookies page's button). */
export function resetConsent() {
  setConsent("denied");
  document.cookie = `${NAME}=; max-age=0; path=/`;
  listeners.forEach((l) => l());
}

export function subscribeConsent(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** On the server, and before hydration, nothing is decided and nothing loads. */
export const serverConsent = (): Consent => "unset";
