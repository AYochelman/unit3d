"use client";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Fade a block in as it comes into view.
 *
 * Three things this deliberately does NOT do:
 *
 * 1. Hide anything the browser cannot un-hide. The resting style lives under
 *    `.js .reveal` and the `js` class is set by a blocking inline script in the
 *    layout, so a visitor with no JavaScript — or a crawler — gets the page at
 *    full opacity rather than a blank column.
 * 2. Move anything when motion is unwelcome. `prefers-reduced-motion` removes
 *    the transform and the transition in globals.css; the element simply is
 *    where it belongs.
 * 3. Keep watching. The observer disconnects on the first intersection, so
 *    scrolling back up costs nothing and the content never flickers out again.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
  amount = 0.12,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Stagger, in ms. Keep the whole run under ~250ms — this is punctuation. */
  delay?: number;
  className?: string;
  /** How much of the block must be visible before it counts as arrived. */
  amount?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No observer (very old browsers, some test runners) — show it and move on.
    // Deferred to the next frame rather than set synchronously: a setState in
    // an effect body is a cascading render, and the frame costs nothing here.
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    // Already on screen at mount (above the fold): skip the animation entirely
    // rather than fading in something the visitor is already looking at.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: amount, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount]);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", shown && "is-in", className)}
      style={delay && !shown ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
