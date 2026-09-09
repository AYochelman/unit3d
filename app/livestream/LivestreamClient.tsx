"use client";
import { useEffect, useState } from "react";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtLeft, jobStats, usePrinterJobs, usePrinterLive, useTimelapses, type PrinterState } from "@/lib/printer";

const pad = (n: number) => n.toString().padStart(2, "0");

const STATE_HE: Record<PrinterState, string> = {
  printing: "מדפיסה עכשיו",
  paused: "מושהית",
  idle: "דולקת, לא מדפיסה",
  finished: "סיימה הדפסה",
  failed: "ההדפסה נעצרה",
  offline: "כבויה",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

/**
 * The printer, as it actually is.
 *
 * Everything here comes from the machine itself: the agent beside it writes its
 * state, a chamber still and every finished job to the shop's table, and this
 * page reads them. When the printer is off, the page says so — a studio that
 * pretends to print around the clock is worth less than one that tells the
 * truth, and the truth is checkable against the photo.
 */
export default function LivestreamClient() {
  const { live, camera, ready, online } = usePrinterLive();
  const jobs = usePrinterJobs();
  const clips = useTimelapses();
  const stats = jobStats(jobs);

  // The camera URL is assembled from the shop's config, so it exists whether or
  // not a picture was ever uploaded. Only the browser can say whether one really
  // came back, so the page waits to be told rather than assuming.
  const [shot, setShot] = useState<"waiting" | "ok" | "missing">("waiting");

  const [clock, setClock] = useState("00:00:00");
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const state: PrinterState = live?.state ?? "offline";
  const printing = state === "printing" || state === "paused";
  const progress = Math.max(0, Math.min(100, live?.progress ?? 0));

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <Pill tone={online ? (printing ? "bad" : "good") : "neutral"} className="mb-3">
          {online && <span className={`w-1.5 h-1.5 rounded-full ${printing ? "bg-bad live-dot" : "bg-good"}`} />}
          {online ? (printing ? "LIVE NOW" : "ONLINE") : "OFFLINE"}
        </Pill>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tightest mb-2">
          {printing ? "המדפסת רצה עכשיו." : online ? "המדפסת דלוקה." : "המדפסת כבויה כרגע."}
        </h1>
        <p className="text-ink-300">
          שקוף, חי, ובלי פילטרים. הסטודיו בגבעתיים — {live?.model || "Bambu Lab P2S"}.
          {!online && " כשהיא נדלקת, כל מה שקורה בה מופיע כאן מעצמו."}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The chamber */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-ink-800 bg-ink-950">
            {camera && online && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={camera}
                src={camera}
                alt="המדפסת עכשיו"
                className="absolute inset-0 h-full w-full object-cover z-[1] transition-opacity duration-300"
                style={{ opacity: shot === "ok" ? 1 : 0 }}
                onLoad={() => setShot("ok")}
                onError={() => setShot("missing")}
              />
            )}
            {shot !== "ok" && (
              <>
                <div className="absolute inset-0 printer-grid opacity-40" />
                <svg viewBox="0 0 600 360" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <rect x="80" y="280" width="440" height="20" rx="2" fill="#1C1C1F" stroke="#3A3A3F" />
                  <rect x="80" y="280" width="440" height="6" fill="#089a47" opacity="0.3" />
                  <rect x="60" y="60" width="20" height="240" fill="#1C1C1F" stroke="#3A3A3F" />
                  <rect x="520" y="60" width="20" height="240" fill="#1C1C1F" stroke="#3A3A3F" />
                  <rect x="60" y="60" width="480" height="14" fill="#1C1C1F" stroke="#3A3A3F" />
                  <g transform="translate(300, 110)">
                    <rect x="-30" y="-12" width="60" height="40" rx="4" fill="#2A2A2E" stroke="#3A3A3F" />
                    <polygon points="-10,28 10,28 0,42" fill="#089a47" />
                  </g>
                </svg>
                <div className="absolute inset-0 flex items-end justify-center pb-10">
                  <div className="text-center">
                    <div className="text-ink-400 text-sm">
                      {!ready ? "טוען…" : shot === "missing" ? "אין תמונה מהמצלמה" : "אין תמונה כרגע"}
                    </div>
                    <div className="text-ink-600 text-xs mt-1">
                      {shot === "missing" ? "המצלמה לא שולחת כרגע. הנתונים למטה עדיין חיים." : "המצלמה משדרת כשהמדפסת דולקת"}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <Pill tone={printing ? "bad" : "neutral"}>
                {printing && <span className="w-1.5 h-1.5 rounded-full bg-bad live-dot" />}
                {STATE_HE[state]}
              </Pill>
            </div>

            <div className="absolute top-4 left-4 z-10 font-mono text-[11px] text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1.5 rounded" dir="ltr">
              <div>CAM · {(live?.model || "PRINTER").toUpperCase()}</div>
              <div className="text-flame">{clock}</div>
            </div>

            {/* A printer standing idle is not a dead page — it is an opening. The
                same strip that carries the job while one is running says what
                the empty plate means, and gives it somewhere to go. */}
            {online && !printing && (
              <div className="absolute inset-x-0 bottom-0 z-10">
                <div className="bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent p-4 pt-14">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] tracking-widest uppercase text-ink-500" dir="ltr">READY</div>
                      <h2 className="font-extrabold text-lg md:text-xl mt-0.5">
                        הפלטה פנויה — מחכים רק <span className="text-flame">להזמנה שלך</span>.
                      </h2>
                    </div>
                    <Btn as="a" href="/contact" size="sm" icon="arrowLeft" className="shrink-0">
                      להזמנה
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {printing && (
              <div className="absolute inset-x-0 bottom-0 z-10">
                <div className="bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent p-4 pt-12">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="font-bold text-lg truncate">{live?.job_name || "הדפסה"}</h2>
                    <div className="font-mono text-3xl font-extrabold text-flame tabular-nums" dir="ltr">
                      {Math.round(progress)}%
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-flame transition-[width] duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-ink-500">
            התמונה והנתונים נמשכים מהמדפסת עצמה ומתעדכנים מעצמם כל שתי שניות — בלי לרענן את הדף.
            {live?.updated_at && ` עדכון אחרון: ${when(live.updated_at)}.`}
          </p>
        </div>

        {/* Readout */}
        <aside className="grid grid-cols-2 gap-3 h-fit">
          <div className="col-span-2 p-5 rounded-2xl bg-ink-900 border border-ink-800">
            <div className="flex items-center justify-between mb-2">
              <Pill tone={printing ? "flame" : "neutral"}>{STATE_HE[state]}</Pill>
              <span className="font-mono text-[10px] tracking-widest text-ink-500" dir="ltr">CURRENT JOB</span>
            </div>
            <div className="font-bold text-base mb-3 truncate">{live?.job_name || (online ? "אין הדפסה פעילה" : "—")}</div>
            <div className="grid grid-cols-2 divide-x divide-ink-800 rtl:divide-x-reverse" dir="ltr">
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums">{fmtLeft(live?.minutes_left ?? null)}</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-widest mt-0.5">REMAINING</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {live?.layer != null && live?.layers_total ? `${live.layer} / ${live.layers_total}` : "—"}
                </div>
                <div className="text-[10px] text-ink-500 uppercase tracking-widest mt-0.5">LAYER</div>
              </div>
            </div>
          </div>

          {[
            { label: "NOZZLE", value: live?.nozzle_temp != null ? `${Math.round(live.nozzle_temp)}°C` : "—", iconKey: "thermometer" as const },
            { label: "BED", value: live?.bed_temp != null ? `${Math.round(live.bed_temp)}°C` : "—", iconKey: "layers" as const },
            { label: "FILAMENT", value: live?.filament || "—", iconKey: "droplet" as const },
            { label: "FAN", value: live?.fan != null ? `${live.fan}` : "—", iconKey: "zap" as const },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-2xl bg-ink-900 border border-ink-800">
              <span className="text-ink-500" aria-hidden="true"><Icon name={s.iconKey} size={16} /></span>
              <div className="font-mono text-xl font-bold tabular-nums mt-2 truncate" dir="ltr">{s.value}</div>
              <div className="font-mono text-[10px] text-ink-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </aside>
      </div>

      {/* The numbers, openly */}
      {jobs.length > 0 && (
        <section className="mt-12">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">THE NUMBERS</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">מה יצא מהמדפסת הזאת.</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "הדפסות שהסתיימו", value: String(stats.ok) },
              { label: "שעות הדפסה", value: String(stats.hours) },
              { label: "בחודש האחרון", value: String(stats.lastMonth) },
              { label: "אחוז הצלחה", value: stats.successRate != null ? `${stats.successRate}%` : "—" },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-2xl bg-ink-900 border border-ink-800">
                <div className="font-mono text-3xl font-black text-flame tabular-nums" dir="ltr">{s.value}</div>
                <div className="text-xs text-ink-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-500">
            נספר על ידי המדפסת, לא על ידי. כולל הדפסות שנכשלו — {stats.failed} מהן.
          </p>
        </section>
      )}

      {/* Timelapses */}
      {clips.length > 0 && (
        <section className="mt-12">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">TIMELAPSE</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">שעות בתוך חצי דקה.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((c) => (
              <figure key={c.file} className="rounded-2xl overflow-hidden bg-ink-900 border border-ink-800">
                <video src={c.url} controls preload="metadata" playsInline className="w-full aspect-video bg-ink-950" />
                <figcaption className="p-3 text-[11px] text-ink-400 flex items-center justify-between gap-2">
                  <span className="truncate" dir="ltr">{c.file}</span>
                  <span className="shrink-0">{when(c.recorded_at)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Last prints */}
      {jobs.length > 0 && (
        <section className="mt-12">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">RECENT</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">מה רץ כאן לאחרונה.</h2>
          <div className="space-y-2">
            {jobs.slice(0, 8).map((j) => (
              <div key={j.key} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-ink-900 border border-ink-800">
                <Pill tone={j.ok ? "good" : "neutral"} className="text-[10px]">{j.ok ? "הושלמה" : "נעצרה"}</Pill>
                <span className="font-semibold text-sm truncate">{j.name}</span>
                <span className="flex-1" />
                {j.minutes != null && <span className="font-mono text-[11px] text-ink-400" dir="ltr">{fmtLeft(j.minutes)}</span>}
                <span className="text-[11px] text-ink-500">{when(j.finished_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {ready && !online && jobs.length === 0 && (
        <section className="mt-12 p-8 rounded-2xl border border-ink-800 text-center">
          <div className="font-bold mb-1">עוד אין נתונים מהמדפסת.</div>
          <p className="text-sm text-ink-400">
            ברגע שהמדפסת והמחשב שלידה דולקים, המצב, התמונה, ההדפסות והטיימלפסים מופיעים כאן מעצמם.
          </p>
        </section>
      )}
    </div>
  );
}
