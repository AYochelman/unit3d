"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { Icon } from "./ui";

/**
 * Full-size viewing with real zoom. Wheel to zoom at the pointer, drag to pan,
 * arrows to move between a reference's images, Esc to leave. A reference
 * library where you cannot look closely is not a reference library.
 */
export function Lightbox() {
  const lightbox = useStudio((s) => s.lightbox);
  const close = useStudio((s) => s.closeLightbox);
  const open = useStudio((s) => s.openLightbox);
  const reference = useStudio((s) => s.references.find((r) => r.id === lightbox?.refId));

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // `dragging` is read while rendering (it decides the cursor and whether the
  // transform animates), so it is state, not a ref. The grab offset stays in a
  // ref because nothing renders from it.
  const [dragging, setDragging] = useState(false);
  const grab = useRef<{ x: number; y: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);

  const assets = reference?.assets ?? [];
  const index = lightbox?.assetIndex ?? 0;
  const asset = assets[index];

  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  // Moving to another image starts fresh - adjusted during render, not in an
  // effect, so the first paint is already at 100%.
  const viewing = `${lightbox?.refId ?? ""}:${index}`;
  const [seen, setSeen] = useState(viewing);
  if (seen !== viewing) { setSeen(viewing); setZoom(1); setPan({ x: 0, y: 0 }); }

  const step = useCallback((delta: number) => {
    if (!reference || assets.length < 2) return;
    const next = (index + delta + assets.length) % assets.length;
    open(reference.id, next);
  }, [assets.length, index, open, reference]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(8, z * 1.25));
      if (e.key === "-") setZoom((z) => Math.max(1, z / 1.25));
      if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [lightbox, close, step, reset]);

  if (!lightbox || !reference || !asset) return null;

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const rect = viewport.current?.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    const next = Math.min(8, Math.max(1, zoom * factor));
    if (rect) {
      // Keep the point under the cursor fixed while zooming.
      const cx = event.clientX - rect.left - rect.width / 2;
      const cy = event.clientY - rect.top - rect.height / 2;
      const ratio = next / zoom;
      setPan((p) => (next === 1 ? { x: 0, y: 0 } : { x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio }));
    }
    setZoom(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgb(var(--shade) / 0.94)" }}
      role="dialog" aria-modal="true" aria-label={`${reference.title} — full size`}
    >
      <div className="flex items-center gap-2 px-4 py-3 text-white">
        <h2 className="flex-1 truncate text-sm font-medium" dir="auto">{reference.title}</h2>
        <span className="hidden text-xs text-white/60 sm:block">
          {asset.label ?? asset.role} · <span className="ltr">{asset.width}×{asset.height}</span>
          {assets.length > 1 && <> · <span className="ltr">{index + 1}/{assets.length}</span></>}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-sm border-white/20 text-white" onClick={() => setZoom((z) => Math.max(1, z / 1.25))} aria-label="Zoom out">
            <Icon name="zoomOut" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn btn-sm border-white/20 text-white" onClick={() => setZoom((z) => Math.min(8, z * 1.25))} aria-label="Zoom in">
            <Icon name="zoomIn" />
          </button>
          <button type="button" className="btn btn-sm border-white/20 text-white" onClick={reset} aria-label="Reset zoom">100%</button>
          <button type="button" className="btn btn-sm border-white/20 text-white" onClick={close} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div
        ref={viewport}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onWheel={onWheel}
        onPointerDown={(e) => { if (zoom > 1) { grab.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; setDragging(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } }}
        onPointerMove={(e) => { if (grab.current) setPan({ x: e.clientX - grab.current.x, y: e.clientY - grab.current.y }); }}
        onPointerUp={() => { grab.current = null; setDragging(false); }}
        onPointerCancel={() => { grab.current = null; setDragging(false); }}
        onDoubleClick={() => (zoom > 1 ? reset() : setZoom(2.5))}
      >
        {asset.role === "motion" ? (
          <video
            src={`/api/files/${asset.file}`}
            controls
            autoPlay
            muted
            loop
            playsInline
            aria-label={reference.title || "Reference"}
            className="absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2"
          />
        ) : (
        // eslint-disable-next-line @next/next/no-img-element -- local file route
        <img
          src={`/api/files/${asset.file}`}
          alt={reference.title || "Reference"}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
            transition: dragging ? "none" : "transform .12s ease-out",
          }}
        />
        )}

        {assets.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous image"
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20"
              style={{ insetInlineStart: 16 }}>
              <Icon name="chevron" className="h-5 w-5 rotate-180 rtl:rotate-0" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next image"
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20"
              style={{ insetInlineEnd: 16 }}>
              <Icon name="chevron" className="h-5 w-5 rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      <p className="px-4 pb-3 text-center text-xs text-white/45">
        Scroll to zoom · drag to pan · double-click to toggle · ← → to switch image · Esc to close
      </p>
    </div>
  );
}
