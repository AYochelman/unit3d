"use client";
import { useState } from "react";
import Image from "next/image";
import Icon from "@/components/ui/Icon";

// What sits under the hero.
//
// This used to be a live-looking printer dashboard: nozzle temperature, layer
// 67 of 142, 47% done, order #4781. None of it was real. A visitor who looks
// twice sees numbers drifting in a loop, and a fabricated readout is the
// loudest "this site was generated" signal a workshop can carry — so it is
// gone.
//
// In its place: two photographs of the actual studio — the machine and the
// filament shelf — with a caption saying where it is. Each falls back to a
// checkable fact if its file is missing, so the section is never broken and
// never invents anything. Drop the two files in and it becomes the pictures,
// with no code change:
//
//   public/studio/printer.jpg     the Bambu Lab P2S, mid-print if possible
//   public/studio/filaments.jpg   the spool shelf / colour gallery
//
// Landscape, roughly 4:3, and the owner's own photo beats a stock one every
// time — a slightly imperfect picture of a real bench is the whole point.

type Frame = {
  src: string;
  alt: string;
  caption: string;
  /** Shown instead of the picture until the file exists. */
  icon: "cube" | "layers";
  fallbackTitle: string;
  fallbackBody: string;
};

const FRAMES: Frame[] = [
  {
    src: "/studio/printer.jpg",
    alt: "מדפסת Bambu Lab P2S בסטודיו של Unit 3D באמצע הדפסה",
    caption: "Bambu Lab P2S עם AMS — עד ארבעה צבעים בהדפסה אחת",
    icon: "cube",
    fallbackTitle: "המכונה",
    fallbackBody: "Bambu Lab P2S עם AMS. ארבעה צבעים בהדפסה אחת, נחושת מחוממת, תא סגור.",
  },
  {
    src: "/studio/filaments.jpg",
    alt: "מדף הפילמנטים של Unit 3D — גלילים בצבעים שונים",
    caption: "מדף הגלילים — מה שנמצא כאן אפשר להדפיס היום",
    icon: "layers",
    fallbackTitle: "החומרים",
    fallbackBody: "PLA, PLA+, מאט, משי, PETG ו-TPU. מה שבמלאי מופיע בעמוד המוצר.",
  },
];

function StudioFrame({ f }: { f: Frame }) {
  const [ok, setOk] = useState(true);
  return (
    <figure className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
      {ok ? (
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={f.src}
            alt={f.alt}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover"
            unoptimized
            onError={() => setOk(false)}
          />
        </div>
      ) : (
        // No picture yet: say the fact compactly rather than hold open a
        // photo-shaped hole.
        <div className="flex items-start gap-3 p-5">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-700 text-ink-300">
            <Icon name={f.icon} size={18} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink-100">{f.fallbackTitle}</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-400">{f.fallbackBody}</p>
          </div>
        </div>
      )}
      <figcaption className="border-t border-ink-800 px-4 py-2.5 text-xs text-ink-400">
        {f.caption}
      </figcaption>
    </figure>
  );
}

export default function StudioPanel() {
  return (
    <section aria-label="הסטודיו">
      <div className="grid gap-4 sm:grid-cols-2">
        {FRAMES.map((f) => (
          <StudioFrame key={f.src} f={f} />
        ))}
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
        <Icon name="pin" size={12} className="shrink-0" />
        <span>הסטודיו בפתח תקווה</span>
        <span className="text-ink-600">·</span>
        <span>כל מה שבאתר יצא מהמכונה הזאת</span>
      </p>
    </section>
  );
}
