"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MorphGallery from "@/components/ui/morph-gallery";
import type { ShowcaseItem } from "@/lib/showcase";

/**
 * The leading model of each shelf, in the dissolving gallery. A click on the
 * picture (or on the caption) opens its product page.
 *
 * Nothing heavy loads with the page: until the section is close to the screen
 * this is the first photo as a plain <img>, and the WebGL gallery with its
 * photos is mounted only then. Phones get the 900px copies, which are already
 * sharp at their width; wider screens the 1600px ones.
 */
export default function ShowcaseGallery({ items }: { items: ShowcaseItem[] }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle" | "small" | "large">("idle");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setMode(window.matchMedia("(max-width: 639px)").matches ? "small" : "large");
        io.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const first = items[0];
  if (!first) return null;

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-2xl border border-ink-800 bg-ink-950">
      {mode === "idle" ? (
        <div className="relative" style={{ height: "clamp(340px, 60vw, 620px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={first.small} alt={first.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        </div>
      ) : (
        <MorphGallery
          items={items.map((it) => ({ src: mode === "small" ? it.small : it.src, thumb: it.small, alt: it.name }))}
          height="clamp(340px, 60vw, 620px)"
          autoplay={5000}
          onSlideClick={(i) => router.push(items[i].href)}
          caption={(_, i) => {
            const it = items[i];
            return (
              <Link
                href={it.href}
                className="pointer-events-auto inline-flex flex-col items-center gap-1 rounded-2xl bg-ink-950/70 px-5 py-2.5 backdrop-blur-sm hover:bg-ink-950/85 transition-colors"
              >
                <span className="text-[11px] font-semibold text-flame-300">{it.shelfLabel} · הכי מורד במדף</span>
                <span className="text-base md:text-lg font-bold text-ink-50">{it.name}</span>
                <span className="text-xs text-ink-300">לעמוד המוצר ←</span>
                {it.creator && <span className="text-[10px] text-ink-500" dir="ltr">design: {it.creator}</span>}
              </Link>
            );
          }}
        />
      )}
      {/* Every product as a plain link, for crawlers and screen readers: the
          gallery itself shows one at a time. */}
      <ul className="sr-only">
        {items.map((it) => (
          <li key={it.id}>
            <Link href={it.href}>
              {it.name} ({it.shelfLabel})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
