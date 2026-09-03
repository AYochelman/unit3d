"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Design, DesignElement, DesignShapeKind, DesignTextElement, DesignShapeElement } from "@/lib/types";
import { DESIGN_FONTS, DESIGN_PALETTE, DESIGN_SHAPES, newShape, newText, shapePath } from "@/lib/design";
import DesignGroup from "./DesignGroup";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type FaceKind = "rect" | "roundrect" | "round" | "phone" | "tall";

type Props = {
  design: Design;
  onChange: (d: Design) => void;
  /** Silhouette of the printable face. */
  faceKind: FaceKind;
  /** Base filament colour of the product. */
  baseColor: string;
};

const MARGIN_RATIO = 0.08;

function facePathFor(kind: FaceKind, w: number, h: number): string {
  const r = kind === "round" ? Math.min(w, h) / 2 : kind === "rect" ? Math.min(w, h) * 0.06 : Math.min(w, h) * 0.16;
  if (kind === "round") return `M${w / 2} 0 A${w / 2} ${h / 2} 0 1 0 ${w / 2} ${h} A${w / 2} ${h / 2} 0 1 0 ${w / 2} 0 Z`;
  return `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${h - r} A${r} ${r} 0 0 1 ${w - r} ${h} H${r} A${r} ${r} 0 0 1 0 ${h - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
}

/** Rough text extent for the selection box (no DOM measuring needed). */
function textBox(el: DesignTextElement) {
  const w = Math.max(el.size, el.text.length * el.size * 0.58);
  const h = el.size * 1.2;
  return { w, h };
}

export default function DesignCanvas({ design, onChange, faceKind, baseColor }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const [shapeMenu, setShapeMenu] = useState(false);
  const drag = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; el: DesignElement } | null>(null);

  const { w, h } = design;
  const m = Math.max(w, h) * MARGIN_RATIO;
  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  // ── history ──────────────────────────────────────────────────────────────
  const commit = useCallback(
    (next: Design) => {
      setPast((p) => [...p.slice(-40), design]);
      setFuture([]);
      onChange(next);
    },
    [design, onChange],
  );
  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [design, ...f]);
    onChange(prev);
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, design]);
    onChange(next);
  };

  const patchEl = (id: string, patch: Partial<DesignElement>, withHistory = true) => {
    const next = { ...design, elements: design.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as DesignElement) : e)) };
    if (withHistory) commit(next);
    else onChange(next);
  };

  const addText = () => {
    const el = newText(design);
    commit({ ...design, elements: [...design.elements, el] });
    setSelectedId(el.id);
  };
  const addShape = (kind: DesignShapeKind) => {
    const el = newShape(design, kind);
    commit({ ...design, elements: [...design.elements, el] });
    setSelectedId(el.id);
    setShapeMenu(false);
  };
  const remove = (id: string) => {
    commit({ ...design, elements: design.elements.filter((e) => e.id !== id) });
    setSelectedId(null);
  };
  const duplicate = (id: string) => {
    const src = design.elements.find((e) => e.id === id);
    if (!src) return;
    const copy = { ...src, id: `${src.id}-c${Date.now().toString(36)}`, x: src.x + w * 0.06, y: src.y + h * 0.06 } as DesignElement;
    commit({ ...design, elements: [...design.elements, copy] });
    setSelectedId(copy.id);
  };
  const reorder = (id: string, dir: 1 | -1) => {
    const i = design.elements.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= design.elements.length) return;
    const els = [...design.elements];
    [els[i], els[j]] = [els[j], els[i]];
    commit({ ...design, elements: els });
  };
  const clearAll = () => {
    if (!design.elements.length) return;
    commit({ ...design, elements: [] });
    setSelectedId(null);
  };

  // ── pointer handling (SVG user units == mm) ──────────────────────────────
  const toSvg = (e: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const handle = target.getAttribute("data-handle");
    const elId = target.getAttribute("data-el") ?? (handle ? selectedId : null);
    if (!elId) {
      setSelectedId(null);
      return;
    }
    const el = design.elements.find((x) => x.id === elId);
    if (!el) return;
    setSelectedId(elId);
    const p = toSvg(e);
    drag.current = { id: elId, mode: handle === "resize" ? "resize" : "move", startX: p.x, startY: p.y, el };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    if (d.mode === "move") {
      patchEl(d.id, { x: d.el.x + dx, y: d.el.y + dy }, false);
    } else if (d.el.kind === "shape") {
      patchEl(d.id, { w: Math.max(1, d.el.w + dx * 2), h: Math.max(1, d.el.h + dy * 2) }, false);
    } else {
      patchEl(d.id, { size: Math.max(2, d.el.size + dx * 0.6) }, false);
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    // push the pre-drag state to history now that the gesture is done
    const before = { ...design, elements: design.elements.map((e) => (e.id === d.id ? d.el : e)) };
    setPast((p) => [...p.slice(-40), before]);
    setFuture([]);
  };

  // keyboard: delete / nudge
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!selected) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(selected.id);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.5;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        patchEl(selected.id, { x: selected.x + dx, y: selected.y + dy });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, design]);

  // ── selection box geometry ───────────────────────────────────────────────
  const selBox = selected
    ? selected.kind === "shape"
      ? { w: selected.w, h: selected.h }
      : textBox(selected)
    : null;

  const clipId = "design-face-clip";
  const facePath = facePathFor(faceKind, w, h);

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-ink-950 border border-ink-800">
        <ToolBtn onClick={addText} icon="file" label="טקסט" />
        <div className="relative">
          <ToolBtn onClick={() => setShapeMenu((s) => !s)} icon="cube" label="צורה" active={shapeMenu} />
          {shapeMenu && (
            <div className="absolute top-full right-0 mt-1 z-20 grid grid-cols-5 gap-1 p-2 rounded-xl bg-ink-900 border border-ink-700 shadow-soft w-[240px]">
              {DESIGN_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addShape(s.id)}
                  title={s.label}
                  className="aspect-square rounded-lg border border-ink-800 hover:border-flame flex items-center justify-center"
                >
                  <svg viewBox="-12 -12 24 24" width="26" height="26">
                    <path d={shapePath(s.id, s.id === "line" ? 20 : 18, s.id === "line" ? 2.5 : 18)} fill="#c7c7cc" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="w-px h-6 bg-ink-800 mx-1" />
        <ToolBtn onClick={undo} icon="rotate" label="בטל" disabled={!past.length} />
        <ToolBtn onClick={redo} icon="rotate" label="בצע שוב" disabled={!future.length} flip />
        <span className="w-px h-6 bg-ink-800 mx-1" />
        <ToolBtn onClick={clearAll} icon="x" label="נקה" disabled={!design.elements.length} />
        <span className="mr-auto font-mono text-[10px] text-ink-500" dir="ltr">
          {w}×{h}mm · {design.elements.length} el
        </span>
      </div>

      {/* Canvas */}
      <div className="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden printer-grid">
        <svg
          ref={svgRef}
          viewBox={`${-m} ${-m} ${w + 2 * m} ${h + 2 * m}`}
          className="w-full touch-none select-none"
          style={{ aspectRatio: `${w + 2 * m} / ${h + 2 * m}`, maxHeight: 520 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={facePath} />
            </clipPath>
            <linearGradient id="design-face-shade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
            </linearGradient>
          </defs>

          {/* product face */}
          <path d={facePath} fill={baseColor} stroke="rgba(0,0,0,0.45)" strokeWidth={Math.max(0.3, w * 0.006)} />
          <path d={facePath} fill="url(#design-face-shade)" pointerEvents="none" />
          {faceKind === "phone" && (
            <rect x={w * 0.08} y={h * 0.04} width={w * 0.34} height={h * 0.16} rx={w * 0.06} fill="rgba(0,0,0,0.35)" pointerEvents="none" />
          )}

          {/* mm grid, every 5mm */}
          <g opacity="0.12" pointerEvents="none" clipPath={`url(#${clipId})`}>
            {Array.from({ length: Math.floor(w / 5) + 1 }, (_, i) => (
              <line key={`v${i}`} x1={i * 5} y1={0} x2={i * 5} y2={h} stroke="#fff" strokeWidth={0.15} />
            ))}
            {Array.from({ length: Math.floor(h / 5) + 1 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 5} x2={w} y2={i * 5} stroke="#fff" strokeWidth={0.15} />
            ))}
          </g>

          <g clipPath={`url(#${clipId})`}>
            <DesignGroup design={design} selectedId={selectedId} />
          </g>

          {/* selection box + resize handle */}
          {selected && selBox && (
            <g transform={`translate(${selected.x} ${selected.y}) rotate(${selected.rotation})`} pointerEvents="none">
              <rect
                x={-selBox.w / 2}
                y={-selBox.h / 2}
                width={selBox.w}
                height={selBox.h}
                fill="none"
                stroke="#00C2C7"
                strokeWidth={Math.max(0.25, w * 0.004)}
                strokeDasharray={`${w * 0.02} ${w * 0.012}`}
              />
              <circle
                data-handle="resize"
                cx={selBox.w / 2}
                cy={selBox.h / 2}
                r={Math.max(1.2, w * 0.025)}
                fill="#00C2C7"
                stroke="#0a0a0b"
                strokeWidth={0.4}
                pointerEvents="all"
                style={{ cursor: "nwse-resize" }}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Properties */}
      <div className="rounded-xl border border-ink-800 bg-ink-950 p-3 min-h-[120px]">
        {!selected ? (
          <div className="text-xs text-ink-400 leading-relaxed">
            <div className="font-semibold text-ink-200 mb-1">איך זה עובד</div>
            הוסף טקסט או צורה, גרור אותם על המוצר, משוך את הנקודה בפינה כדי לשנות גודל.
            חצים במקלדת מזיזים חצי מילימטר, Delete מוחק. הצבעים הם צבעי הפילמנט שיש במלאי.
          </div>
        ) : selected.kind === "text" ? (
          <TextProps el={selected} onPatch={(p) => patchEl(selected.id, p)} />
        ) : (
          <ShapeProps el={selected} onPatch={(p) => patchEl(selected.id, p)} />
        )}

        {selected && (
          <div className="mt-3 pt-3 border-t border-ink-800 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <label className="col-span-2 text-[11px] text-ink-400">
              סיבוב · <span className="font-mono text-ink-200" dir="ltr">{Math.round(selected.rotation)}°</span>
              <input
                type="range"
                min={-180}
                max={180}
                value={selected.rotation}
                onChange={(e) => patchEl(selected.id, { rotation: Number(e.target.value) }, false)}
                onPointerUp={(e) => patchEl(selected.id, { rotation: Number((e.target as HTMLInputElement).value) })}
                className="w-full accent-[#089a47]"
                dir="ltr"
              />
            </label>
            <div className="flex gap-1">
              <SmallBtn onClick={() => reorder(selected.id, 1)} title="קדימה">▲</SmallBtn>
              <SmallBtn onClick={() => reorder(selected.id, -1)} title="אחורה">▼</SmallBtn>
              <SmallBtn onClick={() => duplicate(selected.id)} title="שכפל">⧉</SmallBtn>
            </div>
            <SmallBtn onClick={() => remove(selected.id)} title="מחק" danger>
              מחק
            </SmallBtn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ToolBtn({ onClick, icon, label, active, disabled, flip }: { onClick: () => void; icon: "file" | "cube" | "rotate" | "x"; label: string; active?: boolean; disabled?: boolean; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40",
        active ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-200 hover:border-ink-600",
      )}
    >
      <Icon name={icon} size={14} className={flip ? "-scale-x-100" : undefined} />
      {label}
    </button>
  );
}

function SmallBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 min-w-8 px-2 rounded-lg border text-xs font-semibold transition-colors",
        danger ? "border-bad/40 text-bad hover:bg-bad/10" : "border-ink-800 text-ink-300 hover:border-ink-600",
      )}
    >
      {children}
    </button>
  );
}

function Palette({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DESIGN_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          aria-label={c}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
            value.toLowerCase() === c.toLowerCase() ? "border-white scale-110" : "border-ink-700",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="h-6 w-6 rounded-full border-2 border-dashed border-ink-600 overflow-hidden cursor-pointer relative" title="צבע חופשי">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-400">+</span>
      </label>
    </div>
  );
}

function TextProps({ el, onPatch }: { el: DesignTextElement; onPatch: (p: Partial<DesignTextElement>) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={el.text}
          onChange={(e) => onPatch({ text: e.target.value.slice(0, 40) })}
          className="h-9 px-3 rounded-lg bg-ink-900 border border-ink-700 text-sm focus:border-flame outline-none"
          placeholder="הקלד טקסט"
        />
        <button
          type="button"
          onClick={() => onPatch({ bold: !el.bold })}
          className={cn("h-9 w-9 rounded-lg border font-black", el.bold ? "border-flame text-flame bg-flame/10" : "border-ink-700 text-ink-300")}
          title="מודגש"
        >
          B
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
        {DESIGN_FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPatch({ font: f.id })}
            title={f.name}
            className={cn(
              "h-10 rounded-lg border text-sm leading-none flex items-center justify-center overflow-hidden",
              el.font === f.id ? "border-flame bg-flame/10 text-ink-50" : "border-ink-800 text-ink-300 hover:border-ink-600",
            )}
            style={{ fontFamily: f.css }}
          >
            אב
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
        <label className="text-[11px] text-ink-400 flex items-center gap-2">
          גודל
          <input
            type="number"
            min={2}
            max={200}
            step={0.5}
            value={Math.round(el.size * 2) / 2}
            onChange={(e) => onPatch({ size: Math.max(2, Number(e.target.value)) })}
            className="h-8 w-16 px-2 rounded-lg bg-ink-900 border border-ink-700 text-xs font-mono text-center"
            dir="ltr"
          />
          <span className="font-mono">mm</span>
        </label>
        <Palette value={el.fill} onChange={(fill) => onPatch({ fill })} />
      </div>
    </div>
  );
}

function ShapeProps({ el, onPatch }: { el: DesignShapeElement; onPatch: (p: Partial<DesignShapeElement>) => void }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1">
        {DESIGN_SHAPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPatch({ shape: s.id })}
            title={s.label}
            className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", el.shape === s.id ? "border-flame bg-flame/10" : "border-ink-800 hover:border-ink-600")}
          >
            <svg viewBox="-12 -12 24 24" width="22" height="22">
              <path d={shapePath(s.id, s.id === "line" ? 20 : 18, s.id === "line" ? 2.5 : 18)} fill="#c7c7cc" />
            </svg>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] text-ink-400 flex items-center gap-1.5">
          רוחב
          <input type="number" min={1} step={0.5} value={Math.round(el.w * 2) / 2} onChange={(e) => onPatch({ w: Math.max(1, Number(e.target.value)) })} className="h-8 w-16 px-2 rounded-lg bg-ink-900 border border-ink-700 text-xs font-mono text-center" dir="ltr" />
        </label>
        <label className="text-[11px] text-ink-400 flex items-center gap-1.5">
          גובה
          <input type="number" min={0.5} step={0.5} value={Math.round(el.h * 2) / 2} onChange={(e) => onPatch({ h: Math.max(0.5, Number(e.target.value)) })} className="h-8 w-16 px-2 rounded-lg bg-ink-900 border border-ink-700 text-xs font-mono text-center" dir="ltr" />
        </label>
        <label className="text-[11px] text-ink-400 flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={!!el.stroke}
            onChange={(e) => onPatch(e.target.checked ? { stroke: "#0a0a0b", strokeWidth: Math.max(0.4, Math.min(el.w, el.h) * 0.06) } : { stroke: null, strokeWidth: 0 })}
            className="accent-[#089a47]"
          />
          קו מתאר
        </label>
      </div>
      <Palette value={el.fill} onChange={(fill) => onPatch({ fill })} />
    </div>
  );
}
