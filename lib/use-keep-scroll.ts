"use client";
import { useEffect } from "react";

/**
 * A reload puts you back where you were.
 *
 * /admin renders locked first (the unlock flag is read on the client), so at
 * the moment the browser restores scroll the page is a short PIN form — the
 * position clamps to the footer, and then the tables grow underneath it. So
 * restoration is ours: the position is written into history.state on the way
 * out (not storage — the project keeps none; history.state survives a reload
 * of the same entry), and put back once the page is tall enough to hold it,
 * as the tables and the orders fetch fill in. Any scroll by the user wins.
 */
export function useKeepScroll(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";

    const save = () => {
      try {
        history.replaceState({ ...(history.state ?? {}), __keepY: window.scrollY }, "");
      } catch {}
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);

    const y = Number((history.state as { __keepY?: number } | null)?.__keepY ?? 0);
    let stop = !(y > 0);
    const cancel = () => { stop = true; };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", cancel, opts);
    window.addEventListener("touchstart", cancel, opts);
    window.addEventListener("keydown", cancel, opts);

    const until = Date.now() + 4000;
    const tryRestore = () => {
      if (stop) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(y, max));
      if (max >= y || Date.now() > until) stop = true;
    };
    const ro = new ResizeObserver(tryRestore);
    ro.observe(document.body);
    tryRestore();

    return () => {
      ro.disconnect();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
      history.scrollRestoration = prev;
    };
  }, [ready]);
}
