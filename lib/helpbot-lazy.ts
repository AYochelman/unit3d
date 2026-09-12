"use client";
import type * as HelpBot from "./helpbot";

/**
 * The answer engine, kept out of the page's first load.
 *
 * `lib/helpbot.ts` pulls in the whole catalogue index, which pulls in
 * `imported.generated.ts` — twelve thousand lines of models. Both the help bot
 * and the header search are rendered on EVERY page, so importing it normally
 * put ~400KB of product data into the shared bundle: /privacy and /faq were
 * downloading the entire shop before they could paint.
 *
 * Nothing here is needed until somebody opens one of those two panels, so it
 * is fetched then — and warmed in the background beforehand, so that by the
 * time a click happens the module is almost always already in memory and the
 * panel opens exactly as instantly as it used to.
 */
export type HelpBotModule = typeof HelpBot;

let cached: HelpBotModule | null = null;
let inflight: Promise<HelpBotModule> | null = null;

/** The module, loading it if this is the first ask. */
export function loadHelpBot(): Promise<HelpBotModule> {
  if (cached) return Promise.resolve(cached);
  inflight ??= import("./helpbot").then((m) => {
    cached = m;
    inflight = null;
    return m;
  });
  return inflight;
}

/** Already here? Lets a component render synchronously on a second open. */
export const helpBotNow = (): HelpBotModule | null => cached;

/**
 * Fetch it while the browser is idle.
 *
 * Safe to call from anywhere, any number of times: it is the same promise, and
 * a browser with no `requestIdleCallback` (Safari until recently) falls back to
 * a timeout rather than going without.
 */
export function warmHelpBot(): void {
  if (cached || inflight || typeof window === "undefined") return;
  const go = () => void loadHelpBot();
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (ric) ric(go, { timeout: 3_000 });
  else window.setTimeout(go, 1_500);
}
