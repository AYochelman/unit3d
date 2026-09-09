"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { fmtLeft, usePrinterLive, type PrinterState } from "@/lib/printer";

/**
 * The hero's machine readout — the real one.
 *
 * Every number here comes from the printer itself: the agent beside it writes
 * its state to the shop's table every couple of seconds, and this reads at the
 * same pace, so the panel moves while you watch it. Nothing is simulated. When
 * the machine is off the panel says so rather than performing a print, because
 * a readout that is right only when it flatters us is worth nothing.
 *
 * When public/hero-loop.mp4 exists it plays as a dim underlay; until then the
 * panel simply stands on its own.
 */

const LAYER_COUNT = 26; // bars drawn in the build-plate diagram

const STATE_HE: Record<PrinterState, string> = {
  printing: "מדפיסה עכשיו",
  paused: "מושהית",
  idle: "דולקת, לא מדפיסה",
  finished: "סיימה הדפסה",
  failed: "ההדפסה נעצרה",
  offline: "כבויה כרגע",
};

const STATE_EN: Record<PrinterState, string> = {
  printing: "PRINTING",
  paused: "PAUSED",
  idle: "IDLE",
  finished: "FINISHED",
  failed: "STOPPED",
  offline: "OFFLINE",
};

const num = (v: number | null | undefined, suffix = "") =>
  v == null ? "—" : `${Math.round(v)}${suffix}`;

export default function PrinterPanel() {
  const { live, camera, ready, online } = usePrinterLive();
  const [hasVideo, setHasVideo] = useState(false);
  const [tick, setTick] = useState(0);
  const reduced = useRef(false);

  // A single slow tick, used only to sweep the drawn nozzle while a real print
  // is running. It never feeds a number.
  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced.current) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const state: PrinterState = live?.state ?? "offline";
  const printing = state === "printing" || state === "paused";
  const progress = Math.max(0, Math.min(100, live?.progress ?? 0));

  const doneLayers =
    live?.layer != null && live?.layers_total
      ? Math.round((live.layer / live.layers_total) * LAYER_COUNT)
      : Math.round((progress / 100) * LAYER_COUNT);
  const headX = printing ? 18 + ((tick * 11) % 64) : 50;
  const headY = 43 - doneLayers * 1.35 - 9;

  const ROWS: { k: string; v: string; tone?: "hot" | "cool" }[] = [
    { k: "NOZZLE", v: num(live?.nozzle_temp, "°C"), tone: "hot" },
    { k: "BED", v: num(live?.bed_temp, "°C"), tone: "hot" },
    {
      k: "LAYER",
      v: live?.layer != null && live?.layers_total ? `${live.layer}/${live.layers_total}` : "—",
    },
    { k: "REMAINING", v: fmtLeft(live?.minutes_left ?? null) },
    { k: "FAN", v: live?.fan != null ? `${live.fan}` : "—", tone: "cool" },
    { k: "FILAMENT", v: live?.filament || "—" },
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
          <ProgressRing pct={progress} live={printing} />
          <div className="min-w-0">
            <div
              className={`flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase ${
                printing ? "text-flame" : online ? "text-good" : "text-ink-500"
              }`}
              dir="ltr"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  printing ? "bg-flame live-dot" : online ? "bg-good" : "bg-ink-600"
                }`}
              />
              {ready ? STATE_EN[state] : "CONNECTING"}
            </div>
            <div className="font-bold text-sm md:text-base mt-1 truncate">
              {printing
                ? live?.job_name || "הדפסה"
                : online
                  ? "אין הדפסה פעילה"
                  : ready
                    ? "המדפסת כבויה"
                    : "מתחבר למדפסת…"}
            </div>
            <div className="font-mono text-[11px] text-ink-400 mt-0.5" dir="ltr">
              {printing ? `${fmtLeft(live?.minutes_left ?? null)} remaining` : STATE_HE[state]}
            </div>
          </div>
        </div>

        {/* ── The chamber, or a diagram of the real layer count ───────── */}
        <div className="relative rounded-xl border border-ink-50/10 bg-ink-950/50 p-3 overflow-hidden">
          <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-ink-500 uppercase mb-2" dir="ltr">
            <span>{online && camera ? "CHAMBER · LIVE" : "BUILD PLATE"}</span>
            <span className="text-ink-400 truncate max-w-[55%]">{live?.filament || live?.model || "BAMBU LAB P2S"}</span>
          </div>

          {online && camera ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={camera}
              alt="המדפסת עכשיו"
              className="w-full h-[86px] md:h-[104px] object-cover rounded-lg bg-ink-950"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
            />
          ) : (
            <svg
              viewBox="0 0 100 46"
              className="w-full h-[86px] md:h-[104px]"
              role="img"
              aria-label={
                printing && live?.layers_total
                  ? `הדפסה בעיצומה, שכבה ${live.layer ?? 0} מתוך ${live.layers_total}`
                  : "המדפסת אינה מדפיסה כרגע"
              }
            >
              {/* nozzle head */}
              <g transform={`translate(${headX} ${headY})`} className="transition-transform duration-1000 ease-linear">
                <rect x="-3.5" y="0" width="7" height="4" rx="1" fill="#C7C7CC" />
                <path d="M-2.5 4 L2.5 4 L1 7.5 L-1 7.5 Z" fill="#8E8E93" />
                <circle cx="0" cy="8.6" r="1" fill={printing ? "#3FB872" : "#3A3A3F"} />
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
          )}
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
                    r.v === "—"
                      ? "text-ink-600 tabular-nums"
                      : r.tone === "hot"
                        ? "text-amber2 tabular-nums"
                        : r.tone === "cool"
                          ? "text-cyan2 tabular-nums"
                          : "text-ink-100 tabular-nums"
                  }
                >
                  <span className="truncate block">{r.v}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 pt-2 border-t border-ink-800 flex items-center gap-1.5 text-[10px] text-ink-400">
            <Icon name={online ? "check" : "clock"} size={11} className={online ? "text-flame" : "text-ink-600"} />
            <span className="font-sans">
              {online ? `${STATE_HE[state]} · גבעתיים` : "המדפסת כבויה · גבעתיים"}
            </span>
          </div>
        </div>
      </div>

      {/* layer progress */}
      <div className="relative h-1 bg-ink-800">
        <div
          className="h-full bg-flame transition-[width] duration-1000 ease-linear"
          style={{ width: `${printing ? progress : 0}%` }}
        />
      </div>
    </div>
  );
}

function ProgressRing({ pct, live }: { pct: number; live: boolean }) {
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
          stroke={live ? "#089a47" : "#2A2A2E"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (live ? pct : 0) / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-mono font-black text-lg tabular-nums ${
          live ? "" : "text-ink-600"
        }`}
        dir="ltr"
      >
        {live ? `${Math.round(pct)}%` : "—"}
      </div>
    </div>
  );
}
