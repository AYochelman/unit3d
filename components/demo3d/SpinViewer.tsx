"use client";
import { useEffect, useRef, useState } from "react";
import { assetSrc } from "@/lib/assets";

/**
 * A model seen from all around, without the model file: a ring of photographs
 * taken while it turns, and dragging picks which one is shown. Feels like a 3D
 * viewer, but what reaches the browser is pictures — so it can be used for
 * models whose license allows selling prints and forbids passing on the file.
 */
export default function SpinViewer({ frames }: { frames: string[] }) {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ x: number; at: number } | null>(null);
  const n = frames.length;

  // Turn on its own until someone takes hold of it.
  useEffect(() => {
    if (touched) return;
    // One turn in about 3.3 seconds, whatever the number of frames.
    const id = setInterval(() => setAt((a) => (a + 1) % n), Math.round(3300 / n));
    return () => clearInterval(id);
  }, [touched, n]);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, at };
    setHeld(true);
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const step = Math.round(((e.clientX - drag.current.x) / 360) * n); // a full turn across a phone
    setAt((((drag.current.at - step) % n) + n) % n);
  };
  const onUp = () => { drag.current = null; setHeld(false); };

  return (
    <div
      className={`relative w-full aspect-square rounded-2xl border border-ink-800 bg-[#eef1ef] overflow-hidden select-none touch-none ${held ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {frames.map((f, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={f}
          src={assetSrc(f)}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: i === at ? 1 : 0 }}
        />
      ))}
      <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">360°</div>
      <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center text-[11px] text-ink-600">גוררים ימינה ושמאלה כדי לסובב</div>
    </div>
  );
}
