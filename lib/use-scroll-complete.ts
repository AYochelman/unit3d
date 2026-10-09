"use client";
import { useEffect, type RefObject } from "react";

/**
 * A scroll-driven section is never left halfway.
 *
 * Sections whose animation is driven by scrolling (the "התהליך" dive, the
 * stack of timelapse cards) leave a visitor who stops scrolling inside them
 * looking at a frozen in-between: a giant letter, a heap of cards. When the
 * scroll comes to rest between the two ends, the page finishes the move — on
 * to the end if they were going down, back to the start if they were going
 * up. A wheel, a key or a finger on the screen takes over at once, and reduced
 * motion is left alone.
 *
 * `range` returns the section's start and end as document scroll positions,
 * or null while it is not running (not mounted, motion off).
 */
export function useScrollComplete(
  ref: RefObject<HTMLElement | null>,
  range: (el: HTMLElement) => { start: number; end: number } | null,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lastY = window.scrollY, dir = 1, idle = 0, anim = 0, touching = false;
    const stop = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; } };
    const glide = (to: number) => {
      const from = window.scrollY, dist = to - from;
      if (Math.abs(dist) < 2) return;
      const ms = Math.min(900, 350 + Math.abs(dist) * 0.35), t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
        window.scrollTo(0, from + dist * e);
        lastY = window.scrollY;
        anim = t < 1 ? requestAnimationFrame(step) : 0;
      };
      anim = requestAnimationFrame(step);
    };
    const settle = () => {
      idle = 0;
      if (anim || touching || !ref.current) return;
      const r = range(ref.current);
      if (!r || r.end - r.start < 40) return;
      const y = window.scrollY, edge = (r.end - r.start) * 0.02;
      if (y <= r.start + edge || y >= r.end - edge) return;
      glide(dir > 0 ? r.end : r.start);
    };
    const later = () => { clearTimeout(idle); idle = window.setTimeout(settle, 160); };
    const onScroll = () => {
      if (anim) return;
      const y = window.scrollY;
      if (y !== lastY) dir = y > lastY ? 1 : -1;
      lastY = y;
      later();
    };
    const takeOver = () => stop();
    const down = () => { touching = true; stop(); };
    const up = () => { touching = false; later(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("keydown", takeOver);
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
    window.addEventListener("touchcancel", up, { passive: true });
    return () => {
      stop(); clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("keydown", takeOver);
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
    // `range` is read when the scroll settles; it does not need to re-arm the listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ref]);
}
