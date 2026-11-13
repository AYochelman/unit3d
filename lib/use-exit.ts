"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Matches the exit lengths in app/globals.css (sheet 220ms, dialog 160ms). */
const EXIT_MS = 220;

/**
 * Lets a popup play its exit before it unmounts.
 *
 * `close(done)` sets `closing` (put it on the wrapper as `data-closing`), waits
 * for the exit, then calls `done` — which is what actually hides the element.
 * With reduced motion on, `done` runs at once.
 */
export function useExit(ms = EXIT_MS) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const close = useCallback((done: () => void) => {
    if (timer.current) return;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { done(); return; }
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setClosing(false);
      done();
    }, ms);
  }, [ms]);

  return { closing, close };
}

/**
 * Freezes the page's own animations behind an open dialog. Waits for the
 * dialog's entrance (about 300ms) so the restyle happens while nothing moves,
 * and lifts it when the dialog unmounts — after its exit has played.
 */
export function usePauseBehind(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const id = setTimeout(() => root.classList.add("bg-paused"), 320);
    return () => { clearTimeout(id); root.classList.remove("bg-paused"); };
  }, [active]);
}
