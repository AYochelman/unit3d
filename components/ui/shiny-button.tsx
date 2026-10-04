"use client";
import type { ButtonHTMLAttributes, PointerEvent } from "react";
import "./shiny-button.css";

export type ShinyVariant = "sweep" | "orbit" | "metal";

/**
 * A shiny call-to-action, after the "Shiny Button" reference (21st.dev),
 * in the shop's colours. Three variants; the label stays plain text on a
 * solid, high-contrast face so the shine never costs legibility.
 */
export default function ShinyButton({
  variant = "sweep",
  className,
  onPointerMove,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ShinyVariant }) {
  const track = (e: PointerEvent<HTMLButtonElement>) => {
    if (variant === "metal") {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--sb-x", `${((e.clientX - r.left) / r.width) * 100}%`);
    }
    onPointerMove?.(e);
  };
  return (
    <button
      type="button"
      {...rest}
      onPointerMove={track}
      className={`sb sb-${variant}${className ? " " + className : ""}`}
    >
      <span>{children}</span>
    </button>
  );
}
