"use client";
import { useAdminStore } from "@/lib/admin-store";
import { useDesignPreview, type SignatureId } from "@/lib/design-preview";
import { cn } from "@/lib/cn";

/**
 * "Unit 3D is Erez Yochelman's" — the owner's mark in the footer.
 *
 * Four treatments; the live site shows `LIVE`. The others are previewed from
 * /admin → "תצוגת עיצוב", in the owner's browser only.
 */
const LIVE: SignatureId = "text";
const NAME = "ארז יוכלמן";

export function Signature({ variant, className }: { variant: SignatureId; className?: string }) {
  if (variant === "script") {
    return (
      <div className={cn("inline-flex items-end gap-2 text-ink-300", className)}>
        <span className="text-xs pb-1.5">Unit 3D הוא מוצר של</span>
        <span className="relative inline-block">
          <span className="text-[26px] leading-none text-ink-50" style={{ fontFamily: '"Frank Ruhl Libre", serif', fontWeight: 400 }}>
            {NAME}
          </span>
          {/* A pen stroke under the name, drawn right to left like the hand that signs it. */}
          <svg viewBox="0 0 120 12" className="absolute -bottom-2.5 inset-x-0 w-full h-3 text-flame" preserveAspectRatio="none" aria-hidden>
            <path d="M118 4 C 90 10, 60 2, 34 7 S 6 9, 2 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    );
  }
  if (variant === "seal") {
    return (
      <div className={cn("inline-flex items-center gap-3 text-ink-300", className)}>
        <svg viewBox="0 0 100 100" className="h-[72px] w-[72px] shrink-0 text-flame" aria-hidden>
          <defs>
            <path id="sig-ring" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
          </defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="1" opacity=".6" />
          {/* direction="ltr": the page is right to left, and an RTL run on a
              textPath starts at the path's end and runs off it, so nothing
              drew. textLength wraps it exactly once round the ring. */}
          <text fontSize="9" fill="currentColor" fontFamily="JetBrains Mono, monospace" direction="ltr">
            <textPath href="#sig-ring" textLength="224" lengthAdjust="spacing">EREZ YOCHELMAN · UNIT 3D · GIVATAYIM ·</textPath>
          </text>
          <text x="50" y="57" textAnchor="middle" fontSize="20" fontWeight="700" fill="#F7FAF8" direction="rtl">א״י</text>
        </svg>
        <span className="text-sm">
          Unit 3D הוא מוצר של <span className="font-semibold text-ink-50">{NAME}</span>
        </span>
      </div>
    );
  }
  if (variant === "monogram") {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-flame/50 bg-flame/10 text-sm font-bold text-flame-300">א״י</span>
        <span className="grid leading-tight">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-400" dir="ltr">DESIGNED &amp; BUILT BY</span>
          <span className="text-sm font-semibold text-ink-50">{NAME}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={cn("text-sm text-ink-300", className)}>
      Unit 3D הוא מוצר של <span className="font-semibold text-ink-50">{NAME}</span>
    </div>
  );
}

export default function OwnerSignature() {
  const unlocked = useAdminStore((s) => s.unlocked);
  const preview = useDesignPreview((s) => s.signature);
  return <Signature variant={(unlocked && preview) || LIVE} />;
}
