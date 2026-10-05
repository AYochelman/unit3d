"use client";
import { useRef } from "react";
import { VariableFontCursorProximity } from "@/components/ui/variable-font-cursor-proximity";

/** The pasted hero, in the site's palette and in Hebrew. Assistant's weight axis stops at 200 and 800. */
export default function VariableFontCursorProximityHero({ text = "כל רעיון. מודפס." }: { text?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 px-6 text-center" ref={containerRef}>
      <p className="mb-3 text-ink-400 text-sm">העבר את העכבר על הכותרת</p>
      <VariableFontCursorProximity
        className="text-4xl sm:text-5xl leading-snug text-ink-50"
        containerRef={containerRef}
        fromFontVariationSettings="'wght' 200"
        radius={90}
        toFontVariationSettings="'wght' 800"
      >
        {text}
      </VariableFontCursorProximity>
    </div>
  );
}
