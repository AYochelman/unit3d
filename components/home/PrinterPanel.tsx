"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

/**
 * The hero's machine readout. It replaces the missing hero-loop.mp4 with
 * something more useful than a video: a live-looking printer dashboard.
 *
 * Everything is derived from one tick counter so the first render is
 * deterministic (no Math.random during render, no hydration mismatch), and the
 * whole thing freezes into a readable still under prefers-reduced-motion.
 *
 * When public/hero-loop.mp4 comes back it plays as a dim underlay; until then
 * the panel simply stands on its own.
 */

const JOB = { name: "סמל יחידה · גולני", layersTotal: 142, filamentG: 24, material: "PLA+ · ירוק זית" };
const LAYER_COUNT = 26; // bars drawn in the build-plate view

export default function PrinterPanel() {
  const [tick, setTick] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced.current) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Derived telemetry — a slow drift around plausible Bambu X1C values.
  const progress = 47 + ((tick / 8) % 12); // 47% → 59% then wraps
  const layer = Math.round((progress / 100) * JOB.layersTotal);
  const nozzle = 209 + Math.round(Math.sin(tick / 3) * 2);
  const bed = 60 + Math.round(Math.sin(tick / 7));
  const speed = 118 + Math.round(Math.sin(tick / 2) * 9);
  const fan = 82 + Math.round(Math.sin(tick / 5) * 6);
  const used = Math.round(JOB.filamentG * (progress / 100) * 10) / 10;
  const minsLeft = Math.max(1, Math.round(82 - (progress - 47) * 6));
  const eta = `${Math.floor(minsLeft / 60)}h ${String(minsLeft % 60).padStart(2, "0")}m`;

  const doneLayers = Math.round((progress / 100) * LAYER_COUNT);
  const headX = 18 + ((tick * 11) % 64); // nozzle sweeping across the plate
  // Ride just above the topmost finished layer — same coordinate system as the bars below.
  const headY = 43 - doneLayers * 1.35 - 9;

  const ROWS: { k: string; v: string; tone?: "hot" | "cool" }[] = [
    { k: "NOZZLE", v: `${nozzle}°C`, tone: "hot" },
    { k: "BED", v: `${bed}°C`, tone: "hot" },
    { k: "LAYER", v: `${layer}/${JOB.layersTotal}` },
    { k: "SPEED", v: `${speed} mm/s` },
    { k: "FAN", v: `${fan}%`, tone: "cool" },
    { k: "FILAMENT", v: `${used}g / ${JOB.filamentG}g` },
  ];

  return (
    <div className="hero-tinted relative isolate overflow-hidden rounded-2xl border border-ink-50/10 shadow-2xl">
      {/* Optional video underlay — only visible once the file actually loads. */}
      <video
        className="hero-video absolute inset-0 w-full h-full object-cover opacity-25"
        src="/hero-loop.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        onCanPlay={() => setHasVideo(true)}
        style={{ display: hasVideo ? "block" : "none" }}
      />
      <div className="absolute inset-0 printer-grid opacity-25" aria-hidden="true" />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(8,154,71,0.16), transparent 65%)" }}
      />

      <div className="relative grid gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6 lg:items-center">
        {/* ── Job + progress ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <ProgressRing pct={progress} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-flame uppercase" dir="ltr">
              <span className="w-1.5 h-1.5 rounded-full bg-flame live-dot" />
              PRINTING
            </div>
            <div className="font-bold text-sm md:text-base mt-1 truncate">{JOB.name}</div>
            <div className="font-mono text-[11px] text-ink-400 mt-0.5" dir="ltr">
              {eta} remaining · #4781
            </div>
          </div>
        </div>

        {/* ── Build plate: layers stacking under a sweeping nozzle ───── */}
        <div className="relative rounded-xl border border-ink-50/10 bg-ink-950/50 p-3 overflow-hidden">
          <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-ink-500 uppercase mb-2" dir="ltr">
            <span>BUILD PLATE</span>
            <span className="text-ink-400">{JOB.material}</span>
          </div>
          <svg viewBox="0 0 100 46" className="w-full h-[86px] md:h-[104px]" role="img" aria-label={`הדפסה בעיצומה, שכבה ${layer} מתוך ${JOB.layersTotal}`}>
            {/* nozzle head */}
            <g transform={`translate(${headX} ${headY})`} className="transition-transform duration-1000 ease-linear">
              <rect x="-3.5" y="0" width="7" height="4" rx="1" fill="#C7C7CC" />
              <path d="M-2.5 4 L2.5 4 L1 7.5 L-1 7.5 Z" fill="#8E8E93" />
              <circle cx="0" cy="8.6" r="1" fill="#3FB872" />
            </g>
            {/* layer stack, newest on top */}
            {Array.from({ length: LAYER_COUNT }).map((_, i) => {
              const done = i < doneLayers;
              const y = 43 - i * 1.35;
              const wobble = ((i * 37) % 11) - 5; // deterministic, not random
              return (
                <rect
                  key={i}
                  x={26 + wobble * 0.35}
                  y={y}
                  width={48 - Math.abs(wobble) * 0.5}
                  height={1}
                  rx={0.5}
                  fill={done ? "#089a47" : "#1C1C1F"}
                  opacity={done ? (i > doneLayers - 3 ? 1 : 0.55) : 0.5}
                />
              );
            })}
            {/* plate */}
            <rect x="14" y="44" width="72" height="2" rx="1" fill="#2A2A2E" />
          </svg>
        </div>

        {/* ── Telemetry ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-ink-50/10 bg-ink-950/50 p-3" dir="ltr">
          <div className="font-mono text-[9px] tracking-widest text-ink-500 uppercase mb-2">TELEMETRY</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
            {ROWS.map((r) => (
              <div key={r.k} className="contents">
                <dt className="text-ink-500">{r.k}</dt>
                <dd
                  className={
                    r.tone === "hot" ? "text-amber2 tabular-nums" : r.tone === "cool" ? "text-cyan2 tabular-nums" : "text-ink-100 tabular-nums"
                  }
                >
                  {r.v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 pt-2 border-t border-ink-800 flex items-center gap-1.5 text-[10px] text-ink-400">
            <Icon name="check" size={11} className="text-flame" />
            <span className="font-sans">מדפסת פעילה · פתח תקווה</span>
          </div>
        </div>
      </div>

      {/* layer progress */}
      <div className="relative h-1 bg-ink-800">
        <div className="h-full bg-flame transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: 78, height: 78 }}>
      <svg viewBox="0 0 78 78" className="w-full h-full -rotate-90">
        <circle cx="39" cy="39" r={r} fill="none" stroke="#1C1C1F" strokeWidth="7" />
        <circle
          cx="39"
          cy="39"
          r={r}
          fill="none"
          stroke="#089a47"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-lg tabular-nums" dir="ltr">
        {Math.round(pct)}%
      </div>
    </div>
  );
}
