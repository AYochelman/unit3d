"use client";

import { cn } from "@/lib/cn";
import { fmtILS } from "@/lib/format";

/*
 * One colour unless you choose otherwise — said three times on purpose.
 *
 * MakerWorld photographs are of the designer's multi-colour print, and the
 * shop's default is one spool. Customers read the photo as the product. So:
 * the photo says what it shows (PhotoColorsBadge), the choice is two visible
 * cards with their prices instead of a switch (ColorModeCards), and the
 * colour row says out loud what one colour means (SingleColorNote).
 *
 * `photoColors` is the number of filaments the designer sliced the model with
 * (MakerWorld's own figure, see lib/imported.ts) — 1 when it is not known.
 */

/** The model's own default for "as in the photo": its colour count, within what AMS offers. */
export function photoAmsColors(photoColors: number): 2 | 3 | 4 {
  return Math.min(4, Math.max(2, photoColors)) as 2 | 3 | 4;
}

/** On the photograph: what the picture shows vs. what the price buys. */
export function PhotoColorsBadge({
  photoColors,
  amsOn,
  amsColors,
}: {
  photoColors: number;
  amsOn: boolean;
  amsColors: number;
}) {
  if (amsOn) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur bg-cyan2/15 text-cyan2 border-cyan2/40 shadow-lg">
        הדפסה ב-<bdi dir="ltr" className="font-mono">{amsColors}</bdi> צבעים
      </span>
    );
  }
  if (photoColors <= 1) return null;
  return (
    <span className="inline-flex flex-col items-start px-2 py-1 rounded-lg text-[10px] leading-tight border backdrop-blur bg-ink-950/80 text-ink-100 border-white/15 shadow-lg">
      <span className="font-bold">
        בתמונה: <bdi dir="ltr" className="font-mono">{photoColors}</bdi> צבעים
      </span>
      <span className="text-ink-300">המחיר הוא לצבע אחד</span>
    </span>
  );
}

/** "One colour · ₪45" vs "As in the photo · ₪75" — a choice you can see, not a switch. */
export function ColorModeCards({
  photoColors,
  amsOn,
  amsColors,
  single,
  extra,
  options,
  onSingle,
  onMulti,
}: {
  photoColors: number;
  amsOn: boolean;
  amsColors: number;
  /** Unit price in one colour. */
  single: number;
  /** Surcharge for n colours. */
  extra: (n: number) => number;
  options: readonly { colors: number; label: string }[];
  onSingle: () => void;
  onMulti: (n: 2 | 3 | 4) => void;
}) {
  const asPhoto = photoColors > 1;
  const preview = amsOn ? amsColors : photoAmsColors(photoColors);
  const card = (on: boolean) =>
    cn(
      "relative flex-1 rounded-xl border p-3 text-start transition-colors",
      on ? "border-flame bg-flame/10 shadow-[0_0_0_2px_rgba(8,154,71,0.18)]" : "border-ink-700 bg-ink-900/40 hover:border-ink-500",
    );
  return (
    <div>
      <div className="text-xs font-bold text-ink-300 mb-2">כמה צבעים?</div>
      <div className="flex gap-2">
        <button type="button" aria-pressed={!amsOn} onClick={onSingle} className={card(!amsOn)}>
          <div className="text-sm font-semibold">צבע אחד</div>
          <div className="text-[11px] text-ink-400 mt-0.5">כל המוצר בצבע שבחרת</div>
          <div className="font-mono text-sm mt-1.5 text-ink-100">{fmtILS(single)}</div>
        </button>
        <button
          type="button"
          aria-pressed={amsOn}
          onClick={() => onMulti(photoAmsColors(amsOn ? amsColors : photoColors))}
          className={card(amsOn)}
        >
          <div className="text-sm font-semibold">{asPhoto ? "כמו בתמונה" : "כמה צבעים"}</div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            <bdi dir="ltr" className="font-mono">{preview}</bdi> צבעים בהדפסה אחת
          </div>
          <div className="font-mono text-sm mt-1.5 text-ink-100">{fmtILS(single + extra(preview))}</div>
        </button>
      </div>
      {amsOn && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {options.map((o) => (
            <button
              key={o.colors}
              type="button"
              onClick={() => onMulti(o.colors as 2 | 3 | 4)}
              className={cn(
                "py-2 rounded-xl text-xs font-semibold border transition-all",
                amsColors === o.colors ? "bg-cyan2/20 border-cyan2 text-cyan2" : "border-ink-700 text-ink-400 hover:border-ink-500",
              )}
            >
              {o.label}
              <div className="font-mono text-[10px] mt-0.5 opacity-80">+{fmtILS(extra(o.colors))}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Under the colour row: what picking one colour actually means. */
export function SingleColorNote({
  photoColors,
  amsOn,
  canMulti,
  onMulti,
}: {
  photoColors: number;
  amsOn: boolean;
  canMulti: boolean;
  onMulti: () => void;
}) {
  if (amsOn) return null;
  return (
    <p className="mt-3 text-[11px] text-ink-400 leading-relaxed">
      כל המוצר יודפס בצבע שבחרת.
      {canMulti && (
        <>
          {" "}
          <button type="button" onClick={onMulti} className="text-flame font-semibold hover:underline">
            {photoColors > 1 ? "רוצה כמה צבעים כמו בתמונה? ←" : "רוצה כמה צבעים? ←"}
          </button>
        </>
      )}
    </p>
  );
}

/**
 * "How will mine look?" — the photo, re-coloured in the picked filament.
 *
 * A permanent tint was tried and removed: every model looked lit through
 * coloured glass. This one is the customer's own choice, labelled as a
 * simulation, and drawn as luminance × colour (greyscale photo, multiply) so
 * shading survives and a black spool reads black rather than grey.
 * The parent marks itself `data-tint` so its <img>s go greyscale (globals.css).
 */
export function TintOverlay({ on, hex }: { on: boolean; hex: string }) {
  if (!on) return null;
  return (
    <>
      <div aria-hidden className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ background: hex }} />
      <span className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-ink-950/75 text-ink-100 border border-white/15 backdrop-blur">
        הדמיה בצבע שבחרת
      </span>
    </>
  );
}

export function TintToggle({
  on,
  onChange,
  colorName,
  hex,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  colorName: string;
  hex: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(
        "w-full flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-semibold transition-colors",
        on ? "border-flame bg-flame/10 text-flame" : "border-ink-700 text-ink-200 hover:border-ink-500",
      )}
    >
      <span className="h-4 w-4 rounded-full border border-white/25" style={{ background: hex }} />
      {on ? "חזרה לתמונה המקורית" : `איך זה ייראה אצלי? (${colorName})`}
    </button>
  );
}
