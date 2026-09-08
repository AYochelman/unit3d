"use client";
import { cn } from "@/lib/cn";
import type { Filament } from "@/lib/types";

/**
 * A filament, drawn honestly.
 *
 * A flat circle is a lie for three of the four kinds we stock. Glow filament is
 * a pale green in daylight and the point of it is what happens in the dark; a
 * thermochromic spool is two colours depending on the temperature of the thing
 * you are holding; a dual-colour silk is two colours at once, along the length
 * of the print; a translucent spool is a colour you can see through, which is
 * the reason anyone buys it. Each gets a drawing that says which it is before
 * anyone reads the name.
 */
export default function ColorSwatch({
  filament,
  size = 40,
  className,
  selected,
}: {
  filament: Filament;
  size?: number;
  className?: string;
  selected?: boolean;
}) {
  const { hex, hex2, kind = "solid" } = filament;
  const second = hex2 || "#f2f2ef";

  // The checker is what makes "see-through" read as see-through: a flat pale
  // circle would just look like a washed-out colour.
  const checker =
    "repeating-conic-gradient(rgba(255,255,255,.30) 0% 25%, rgba(0,0,0,.30) 0% 50%) 0 0 / 8px 8px";

  // Marble is the veins, not the base: a stone-look spool sold as a flat grey
  // circle looks like plain grey, which is the one thing it is not.
  const marble =
    `radial-gradient(ellipse at 28% 32%, ${second}88 0 11%, transparent 12%), ` +
    `radial-gradient(ellipse at 72% 64%, ${second}77 0 8%, transparent 9%), ` +
    `radial-gradient(ellipse at 55% 18%, ${second}55 0 6%, transparent 7%), ` +
    `linear-gradient(118deg, transparent 38%, ${second}66 43%, transparent 47%), ` +
    `linear-gradient(64deg, transparent 62%, ${second}44 66%, transparent 70%), ${hex}`;

  const background =
    kind === "marble"
      ? marble
      : kind === "clear"
      ? `linear-gradient(${hex}88, ${hex}55), ${checker}`
      : kind === "dual"
      ? `linear-gradient(135deg, ${hex} 0 48%, ${second} 52% 100%)`
      : kind === "shift"
        ? `conic-gradient(from 210deg, ${hex} 0 50%, ${second} 50% 100%)`
        : hex;

  return (
    <span
      className={cn("relative inline-block rounded-full border", className)}
      style={{
        width: size,
        height: size,
        background,
        borderColor: selected ? "currentColor" : "rgba(255,255,255,0.18)",
        // Glow reads as glow only if it actually glows.
        boxShadow: kind === "glow" ? `0 0 ${Math.round(size / 2.4)}px ${hex}` : undefined,
      }}
      aria-hidden
    >
      {kind === "glow" && (
        <span
          className="absolute inset-[22%] rounded-full opacity-70"
          style={{ background: `radial-gradient(circle, #fff 0%, ${hex} 70%)` }}
        />
      )}
    </span>
  );
}

/** Two words for the kind, for a label under the swatch. */
export const KIND_LABEL: Record<NonNullable<Filament["kind"]>, string> = {
  solid: "רגיל",
  glow: "זוהר בחושך",
  shift: "מחליף צבע",
  dual: "דו-גוני",
  clear: "שקוף",
  marble: "שיש",
};
