"use client";
import { useState } from "react";
import Image from "next/image";
import { photoSrc } from "@/lib/assets";
import Emblem from "./Emblem";
import type { EmblemShape } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  slug: string;
  fallbackShape?: EmblemShape;
  fallbackHue?: number;
  /** Fixed pixel size. If omitted, the image fills its parent (which must be relatively positioned and sized). */
  size?: number;
  label?: string;
  className?: string;
  /** When true, image is shown as a circular avatar with cover. */
  circular?: boolean;
  /** Padding ratio inside the frame (0..0.3). Default 0.05 = 5% breathing room. */
  paddingRatio?: number;
};

/**
 * Tries to load /emblems/<slug>.png. Falls back to generative Emblem SVG if missing.
 * When `size` is omitted, fills the parent container (parent must be position:relative).
 */
export default function EmblemImage({
  slug,
  fallbackShape = "shield",
  fallbackHue = 18,
  size,
  label,
  className,
  circular,
  paddingRatio = 0.05,
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = photoSrc(`/emblems/${slug}.png`);
  const fillMode = size === undefined;

  if (failed) {
    // Fallback SVG: scale to fit container width or fixed size
    const fallbackSize = size ?? 100;
    return fillMode ? (
      <div className={cn("absolute inset-0 flex items-center justify-center", className)}>
        <Emblem shape={fallbackShape} hue={fallbackHue} size={fallbackSize * 1.2} label={label} />
      </div>
    ) : (
      <Emblem
        shape={fallbackShape}
        hue={fallbackHue}
        size={fallbackSize}
        label={label}
        className={className}
      />
    );
  }

  const padPercent = paddingRatio * 100;
  const innerStyle = {
    width: `${100 - padPercent * 2}%`,
    height: `${100 - padPercent * 2}%`,
  };

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center",
        fillMode ? "absolute inset-0" : "relative overflow-hidden",
        circular && "rounded-full",
        className,
      )}
      style={fillMode ? undefined : { width: size, height: size }}
    >
      <div className="relative" style={innerStyle}>
        <Image
          src={src}
          alt={label || slug}
          fill
          sizes={fillMode ? "(max-width: 768px) 50vw, 33vw" : `${size}px`}
          className={cn(
            "object-contain",
            circular && "object-cover",
          )}
          onError={() => setFailed(true)}
          unoptimized
        />
      </div>
    </div>
  );
}
