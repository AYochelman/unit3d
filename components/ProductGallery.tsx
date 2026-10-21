"use client";
import Image from "next/image";
import type { ReactNode } from "react";
import MorphGallery from "@/components/ui/morph-gallery";
import { cn } from "@/lib/cn";

/**
 * The product page's photographs, in the same gallery as the home page: the
 * slides dissolve into each other, arrows on the sides, the strip of
 * thumbnails over the bottom of the frame.
 *
 * The frame stays square (every product frame on the site is), and whatever
 * the page lays over it — badges, the chosen colour — comes in as children.
 * Phones hide the in-frame strip, so a row of thumbnails sits under the frame
 * there instead.
 */
export default function ProductGallery({
  images,
  alt,
  index,
  onIndexChange,
  children,
  fallback,
}: {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (i: number) => void;
  /** Badges and chips laid over the frame. */
  children?: ReactNode;
  /** What the frame shows when there is no photograph. */
  fallback?: ReactNode;
}) {
  // A GIF is uploaded to WebGL as one still frame; cross-fade instead.
  const plain = images.some((s) => /\.(gif|anim\.webp)(\?|$)/i.test(s));
  return (
    <>
      <div className="relative aspect-square rounded-2xl overflow-hidden border border-ink-800 bg-ink-950">
        {images.length ? (
          <MorphGallery
            items={images.map((src, i) => ({ src, alt: `${alt} — תמונה ${i + 1}` }))}
            height="100%"
            index={index}
            onIndexChange={onIndexChange}
            plain={plain}
            className="!absolute inset-0"
          />
        ) : (
          fallback
        )}
        {children}
      </div>

      {images.length > 1 && (
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-0.5 mt-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`תמונה ${i + 1}`}
              aria-pressed={i === index}
              className={cn(
                "relative shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all",
                i === index ? "border-flame" : "border-ink-800 opacity-70",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
