"use client";

import ColorSwatch from "@/components/ui/ColorSwatch";
import type { Filament, Material, MaterialId } from "@/lib/types";

/** "Also on PLA: ●●●" — colours the selected finish does not have, one tap to switch. */
export default function OtherFinishColors({
  groups,
  onPick,
}: {
  groups: { material: Material; colors: Filament[] }[];
  onPick: (material: MaterialId, colorId: string) => void;
}) {
  if (!groups.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {groups.map(({ material: m, colors }) => (
        <div key={m.id} className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink-500">
            צבעים נוספים ב-<bdi dir="ltr" className="font-mono">{m.short}</bdi>:
          </span>
          {colors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(m.id, c.id)}
              title={`${c.name} · מעבר ל-${m.short}`}
              aria-label={`${c.name}, מעבר ל-${m.short}`}
              className="relative h-7 w-7 rounded-full border-2 border-ink-700/50 overflow-hidden transition-transform hover:scale-110 active:scale-95"
            >
              <ColorSwatch filament={c} fill />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
