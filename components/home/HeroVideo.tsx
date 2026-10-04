"use client";
import { useEffect, useRef } from "react";
import { assetSrc } from "@/lib/assets";

/**
 * The printer itself, behind the hero headline: the owner's own chamber-camera
 * footage of a P2S building a model (public/videos/hero-live.mp4, cut to a
 * seamless 9s loop in public/video/).
 *
 * The headline is the page's largest paint, so the video never competes with
 * it: only the 55KB poster is part of the first load, and the clip is attached
 * once the page has loaded and the browser is idle. It never plays for anyone
 * who asked for less motion or is saving data — they keep the poster — and it
 * pauses whenever it is off screen or the tab is hidden.
 *
 * The scroll reaction lives in globals.css (.hero-*). Where the browser has
 * scroll-driven animations it needs no script; elsewhere this component feeds
 * it --hp, the share of the hero already scrolled past, once per frame.
 */
// H.264 for Safari and most browsers; VP9 for builds without H.264 (open
// Chromium, some Linux Firefox). Picked once, by what the browser says it plays.
const CLIPS = {
  mp4: { large: "/video/hero-p2s.mp4", small: "/video/hero-p2s-sm.mp4" },
  webm: { large: "/video/hero-p2s.webm", small: "/video/hero-p2s-sm.webm" },
};
const POSTER = "/video/hero-p2s.webp";

type NetInfo = { saveData?: boolean; effectiveType?: string };

export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const net = (navigator as Navigator & { connection?: NetInfo }).connection;
    const slow = !!net?.saveData || /(^|-)(2g|3g)$/.test(net?.effectiveType ?? "");
    if (reduce) return; // poster only, no scroll effect either

    const banner = v.closest<HTMLElement>(".hero-banner");
    const cleanups: (() => void)[] = [];

    // Scroll fallback for browsers without animation-timeline.
    if (banner && !CSS.supports("animation-timeline: view()")) {
      let raf = 0;
      const update = () => {
        raf = 0;
        const h = banner.offsetHeight || 1;
        const p = Math.min(1, Math.max(0, (window.scrollY - banner.offsetTop) / h));
        banner.style.setProperty("--hp", p.toFixed(4));
      };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); });
    }

    if (slow) return () => cleanups.forEach((c) => c());

    let started = false;
    let visible = true;
    const sync = () => {
      if (!started) return;
      if (visible && !document.hidden) void v.play().catch(() => {});
      else v.pause();
    };
    const start = () => {
      if (started) return;
      started = true;
      const kind = v.canPlayType('video/mp4; codecs="avc1.4D401F"') ? CLIPS.mp4 : CLIPS.webm;
      v.src = assetSrc(window.matchMedia("(max-width: 639px)").matches ? kind.small : kind.large);
      v.load();
      sync();
    };
    const whenIdle = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(start, { timeout: 2500 });
      else window.setTimeout(start, 1200);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
    io.observe(v);
    document.addEventListener("visibilitychange", sync);
    cleanups.push(() => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("load", whenIdle);
      v.pause();
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <video
      ref={ref}
      className="hero-video absolute inset-0 h-full w-full object-cover"
      poster={assetSrc(POSTER)}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
