"use client";
import { useRef } from "react";
import { VariableFontCursorProximity } from "@/components/ui/variable-font-cursor-proximity";

/**
 * The home headline, with letters that swell towards the cursor anywhere over
 * the hero copy. With a mouse it rests at 400 (set in CSS, so the first paint
 * already has it) and reaches 800 under the pointer; on touch and under
 * reduced motion it is the plain bold headline it always was.
 */
const AXES = { from: "'wght' 400", to: "'wght' 800" };

export default function HeroTitle() {
  const ref = useRef<HTMLHeadingElement>(null);
  const line = (text: string, className?: string) => (
    <VariableFontCursorProximity
      containerRef={ref}
      fromFontVariationSettings={AXES.from}
      toFontVariationSettings={AXES.to}
      radius={150}
      falloff="gaussian"
      className={className}
    >
      {text}
    </VariableFontCursorProximity>
  );
  return (
    <h1
      ref={ref}
      aria-label="כל רעיון. מודפס. בידיים שלך."
      className="text-[40px] xs:text-[44px] md:text-[88px] leading-heading font-bold [@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:font-normal text-ink-50"
    >
      {line("כל רעיון.")}
      <br />
      {line("מודפס.")}
      <br />
      {line("בידיים שלך.", "text-flame")}
    </h1>
  );
}
