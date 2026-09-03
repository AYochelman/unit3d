"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type Props = {
  images: string[];
  alt: string;
  className?: string;
  /** When true (default), pauses on user interaction. */
  initialIndex?: number;
};

export default function ImageCarousel({
  images,
  alt,
  className,
  initialIndex = 0,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const total = images.length;
  const trackRef = useRef<HTMLDivElement>(null);

  // Reset when images list changes (e.g. variant switch).
  useEffect(() => {
    setIndex(0);
  }, [images.join("|")]);

  if (total === 0) return null;

  const go = (next: number) => {
    setIndex(((next % total) + total) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    // RTL: swipe-left = forward, but with translateX visually it's the same
    if (Math.abs(dx) > 40) {
      go(dx > 0 ? index - 1 : index + 1);
    }
    setTouchStartX(null);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index + 1); // RTL: left arrow = next
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index - 1);
    }
  };

  const single = total === 1;

  return (
    <div
      className={cn("relative w-full h-full select-none", className)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKey}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={alt}
    >
      <div ref={trackRef} className="absolute inset-0">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${alt} — תמונה ${i + 1} מתוך ${total}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className={cn(
              "object-cover transition-opacity duration-300",
              i === index ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            priority={i === 0}
            unoptimized
          />
        ))}
      </div>

      {!single && (
        <>
          {/* Prev / Next buttons */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              go(index - 1);
            }}
            aria-label="קודם"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-ink-950/60 backdrop-blur text-ink-100 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-flame transition-opacity"
          >
            <Icon name="chevRight" size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              go(index + 1);
            }}
            aria-label="הבא"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-ink-950/60 backdrop-blur text-ink-100 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-flame transition-opacity"
          >
            <Icon name="chevLeft" size={16} />
          </button>

          {/* Dot indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  go(i);
                }}
                aria-label={`עבור לתמונה ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-flame" : "w-1.5 bg-ink-100/40 hover:bg-ink-100/70",
                )}
              />
            ))}
          </div>

          {/* Counter */}
          <div
            className="absolute top-2 left-2 font-mono text-[10px] tracking-wider text-ink-100 bg-ink-950/60 backdrop-blur px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            dir="ltr"
          >
            {index + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}
