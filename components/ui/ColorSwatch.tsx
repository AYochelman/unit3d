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
  fill,
}: {
  filament: Filament;
  size?: number;
  className?: string;
  selected?: boolean;
  /** Cover the parent instead of taking a size of its own. */
  fill?: boolean;
}) {
  const { hex, hex2, kind = "solid" } = filament;
  const second = hex2 || "#f2f2ef";

  // The checker is what makes "see-through" read as see-through: a flat pale
  // circle would just look like a washed-out colour.
  const checker =
    "repeating-conic-gradient(rgba(255,255,255,.30) 0% 25%, rgba(0,0,0,.30) 0% 50%) 0 0 / 8px 8px";

  // Marble filament is FLECKED, not splattered: a pale stone with fine dark
  // grains through it and one soft vein. Big soft blobs read as paint spilled
  // on a circle, which is what the first attempt looked like next to a photo
  // of the real print.
  const marble =
    `radial-gradient(circle at 30% 40%, ${second}cc 0 0.9px, transparent 1.1px) 0 0 / 5px 5px, ` +
    `radial-gradient(circle at 70% 75%, ${second}99 0 0.8px, transparent 1px) 2px 3px / 7px 7px, ` +
    `radial-gradient(circle at 45% 20%, ${second}77 0 1.1px, transparent 1.3px) 1px 4px / 9px 9px, ` +
    `linear-gradient(115deg, transparent 44%, ${second}55 48%, transparent 53%), ` +
    `linear-gradient(200deg, transparent 60%, ${second}33 64%, transparent 68%), ${hex}`;

  const background =
    kind === "marble"
      ? marble
      : kind === "clear"
      ? `linear-gradient(${hex}88, ${hex}55), ${checker}`
      : kind === "dual"
      // A dual-colour silk blends along the print; a hard edge looks like two
      // half-circles glued together, which is not a spool anyone sells.
      ? `linear-gradient(135deg, ${hex} 0 34%, ${second} 66% 100%)`
      : kind === "shift"
        // Thermochromic goes THROUGH the change, so the swatch does too.
        ? `linear-gradient(120deg, ${hex} 0 28%, ${second} 72% 100%)`
        : hex;

  return (
    <span
      // `fill` positions from here rather than from a caller's class: two
      // position utilities on one element is a coin toss decided by the order
      // Tailwind happens to emit them in, and it lost.
      className={cn("rounded-full border", fill ? "absolute inset-0" : "relative inline-block", className)}
      style={{
        ...(fill ? {} : { width: size, height: size }),
        background,
        borderColor: selected ? "currentColor" : "rgba(255,255,255,0.18)",
        // Glow reads as glow only if it actually glows.
        boxShadow: kind === "glow" ? `0 0 ${Math.round(size / 2.4)}px ${hex}` : undefined,
      }}
      aria-hidden
    >
      {/* Every spool gets the same soft top-left sheen: without it a flat disc
          reads as a colour chip, and the gradients look like flags. */}
      {kind !== "glow" && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.10) 34%, rgba(255,255,255,0) 58%)," +
              "radial-gradient(circle at 70% 82%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 55%)",
          }}
        />
      )}
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
