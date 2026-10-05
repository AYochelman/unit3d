"use client";
import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/cn";

/**
 * Letters that swell towards the cursor: each one moves from
 * `fromFontVariationSettings` to `toFontVariationSettings` as the pointer
 * comes within `radius` px of it, measured anywhere inside `containerRef`.
 *
 * The base component was not part of the snippet the owner pasted (only the
 * hero that uses it), so this is written for the site: no animation library,
 * one rAF per pointer move, styles written straight to the letters instead of
 * re-rendering, and nothing at all for touch or reduced motion. Words stay
 * whole so a line never breaks inside one, which matters for Hebrew too.
 *
 * Needs a variable font: the site's Assistant runs 200–800 on `wght`.
 */
type Axes = Record<string, number>;

const parse = (s: string): Axes =>
  Object.fromEntries(
    [...s.matchAll(/['"]([a-zA-Z]{4})['"]\s+(-?[\d.]+)/g)].map((m) => [m[1], parseFloat(m[2])]),
  );

export function VariableFontCursorProximity({
  children,
  containerRef,
  fromFontVariationSettings,
  toFontVariationSettings,
  radius = 50,
  falloff = "linear",
  className,
}: {
  children: string;
  containerRef: RefObject<HTMLElement | null>;
  fromFontVariationSettings: string;
  toFontVariationSettings: string;
  radius?: number;
  falloff?: "linear" | "exponential" | "gaussian";
  className?: string;
}) {
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const from = parse(fromFontVariationSettings);
  const to = parse(toFontVariationSettings);
  const axes = Object.keys(from).filter((k) => k in to);
  const settings = (t: number) => axes.map((a) => `'${a}' ${from[a] + (to[a] - from[a]) * t}`).join(", ");
  // Kept in a ref so the listener below is attached once, not on every render.
  const live = useRef({ settings, radius, falloff });
  useEffect(() => { live.current = { settings, radius, falloff }; });

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    // Letters carry no inline settings until here, so a phone (or the first
    // paint) keeps whatever weight the text's own CSS gives it.
    const rest = live.current.settings(0);
    for (const el of letters.current) if (el) el.style.fontVariationSettings = rest;

    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = (inside: boolean) => {
      raf = 0;
      const { settings: at, radius: r, falloff: f } = live.current;
      for (const el of letters.current) {
        if (!el) continue;
        let t = 0;
        if (inside) {
          const b = el.getBoundingClientRect();
          const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2));
          const n = Math.min(1, d / r);
          t = f === "exponential" ? (1 - n) ** 2 : f === "gaussian" ? Math.exp(-((n * 2) ** 2) / 2) * (n < 1 ? 1 : 0) : 1 - n;
        }
        el.style.fontVariationSettings = at(t);
      }
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => paint(true));
    };
    const leave = () => {
      if (raf) cancelAnimationFrame(raf);
      paint(false);
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerleave", leave);
    return () => {
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  let i = -1;
  return (
    <span className={cn("inline-block", className)}>
      {children.split(/(\s+)/).map((word, w) =>
        /^\s+$/.test(word) ? (
          word
        ) : (
          <span key={w} className="inline-block whitespace-nowrap">
            {[...word].map((ch) => {
              i += 1;
              const k = i;
              return (
                <span
                  key={k}
                  ref={(el) => { letters.current[k] = el; }}
                  className="inline-block transition-[font-variation-settings] duration-150 ease-out"
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ),
      )}
    </span>
  );
}
