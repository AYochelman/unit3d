import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "flame" | "cyan" | "good" | "bad";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-800 text-ink-300 border-ink-700",
  flame: "bg-flame/10 text-flame border-flame/30",
  cyan: "bg-cyan2/10 text-cyan2 border-cyan2/30",
  good: "bg-good/10 text-good border-good/30",
  bad: "bg-bad/10 text-bad border-bad/30",
};

export default function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
