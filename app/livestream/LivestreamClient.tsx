"use client";
import { useEffect, useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import Emblem from "@/components/Emblem";

const QUEUE = [
  { id: "#4782", name: "מחזיק · נטע", eta: "2h 40m", hue: 200, shape: "circle" as const },
  { id: "#4783", name: "סמל פלוגה · ד׳", eta: "5h 10m", hue: 18, shape: "shield" as const },
  { id: "#4784", name: "Dragon · אביב", eta: "9h", hue: 90, shape: "hex" as const },
  { id: "#4785", name: "Welcome kit ×25", eta: "1d 12h", hue: 120, shape: "rect" as const },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function LivestreamClient() {
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState("00:00:00");
  const [orderQuery, setOrderQuery] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const headX = Math.sin(tick / 2) * 40;
  const nozzleTemp = 209 + Math.round(Math.sin(tick / 3) * 2);
  const bedTemp = 60 + Math.round(Math.sin(tick / 4));
  const speed = 118 + Math.round(Math.sin(tick / 2) * 6);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <Pill tone="bad" className="mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-bad live-dot" />
          LIVE NOW
        </Pill>
        <h1 className="font-display text-3xl md:text-[42px] font-bold mb-2">
          המדפסת רצה עכשיו.
        </h1>
        <p className="text-ink-300">
          שקוף, חי, ובלי פילטרים. הסטודיו בפתח תקווה — Bambu Lab P2S — 24/7 כמעט.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-ink-800 timelapse">
            <div className="absolute inset-0 printer-grid opacity-40" />

            {/* Printer schematic */}
            <svg
              viewBox="0 0 600 360"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Bed */}
              <rect x="80" y="280" width="440" height="20" rx="2" fill="#1C1C1F" stroke="#3A3A3F" />
              <rect x="80" y="280" width="440" height="6" fill="#089a47" opacity="0.3" />
              {/* Gantry */}
              <rect x="60" y="60" width="20" height="240" fill="#1C1C1F" stroke="#3A3A3F" />
              <rect x="520" y="60" width="20" height="240" fill="#1C1C1F" stroke="#3A3A3F" />
              <rect x="60" y="60" width="480" height="14" fill="#1C1C1F" stroke="#3A3A3F" />
              {/* Print head */}
              <g transform={`translate(${300 + headX}, 110)`}>
                <rect x="-30" y="-12" width="60" height="40" rx="4" fill="#2A2A2E" stroke="#3A3A3F" />
                <polygon points="-10,28 10,28 0,42" fill="#089a47" />
                <line x1="0" y1="42" x2="0" y2="270" stroke="#089a47" strokeWidth="1" opacity="0.5" strokeDasharray="3 3" />
              </g>
              {/* Already-printed object */}
              <g>
                <rect x="200" y="240" width="200" height="40" rx="4" fill="#FF6B1A" opacity="0.85" />
                <rect x="220" y="225" width="160" height="20" rx="3" fill="#FF6B1A" opacity="0.9" />
                <rect x="240" y="212" width="120" height="16" rx="2" fill="#FF6B1A" />
              </g>
            </svg>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <Pill tone="bad">
                <span className="w-1.5 h-1.5 rounded-full bg-bad live-dot" />
                LIVE
              </Pill>
              <span className="font-mono text-[10px] tracking-wider text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1 rounded" dir="ltr">
                1080p · 30fps
              </span>
            </div>

            <div
              className="absolute top-4 left-4 z-10 font-mono text-[11px] text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1.5 rounded"
              dir="ltr"
            >
              <div>מצלמה · BAMBU LAB P2S</div>
              <div className="text-flame">{clock}</div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10">
              <div className="bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent p-4 pt-12">
                <div className="font-mono text-[11px] text-ink-400 mb-1" dir="ltr">
                  JOB #4781 · keychain_yoav_unit51.gcode
                </div>
                <div className="flex items-end justify-between gap-3">
                  <h2 className="font-bold text-lg">מחזיק · יואב · חטיבה 51</h2>
                  <div
                    className="font-mono text-3xl font-extrabold text-flame tabular-nums"
                    dir="ltr"
                  >
                    47%
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-flame progress-fill" style={{ width: "47%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Is this mine? */}
          <form
            className="mt-6 p-5 rounded-2xl bg-ink-900 border border-ink-800 flex flex-wrap items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex-1 min-w-[200px]">
              <div className="font-bold text-sm mb-1">זאת ההזמנה שלי?</div>
              <div className="text-ink-400 text-xs">
                הזן מספר הזמנה כדי לבדוק.
              </div>
            </div>
            <Input
              placeholder="#4781"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="w-40 font-mono text-center"
              dir="ltr"
            />
            <Btn type="submit" icon="search">
              בדוק
            </Btn>
          </form>
        </div>

        {/* Dashboard */}
        <aside className="grid grid-cols-2 gap-3 h-fit">
          <div className="col-span-2 p-5 rounded-2xl bg-ink-900 border border-ink-800">
            <div className="flex items-center justify-between mb-2">
              <Pill tone="flame">#4781</Pill>
              <span className="font-mono text-[10px] tracking-widest text-ink-500" dir="ltr">
                CURRENT JOB
              </span>
            </div>
            <div className="font-bold text-base mb-3">מחזיק · יואב · חטיבה 51</div>
            <div className="grid grid-cols-2 divide-x divide-ink-800 rtl:divide-x-reverse" dir="ltr">
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums">1:22</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-widest mt-0.5">נותרו</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums">87 / 142</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-widest mt-0.5">שכבה</div>
              </div>
            </div>
          </div>

          {[
            { label: "NOZZLE TEMP", value: `${nozzleTemp}°C`, iconKey: "thermometer" as const, tone: "bad" as const },
            { label: "BED TEMP", value: `${bedTemp}°C`, iconKey: "layers" as const, tone: "flame" as const },
            { label: "PRINT SPEED", value: `${speed} mm/s`, iconKey: "zap" as const, tone: "cyan" as const },
            { label: "LAYER HEIGHT", value: `0.16 mm`, iconKey: "layers" as const, tone: "neutral" as const },
            { label: "FILAMENT USED", value: `14.2 / 23 g`, iconKey: "droplet" as const, tone: "neutral" as const },
            { label: "CAMERA", value: `ONLINE`, iconKey: "camera" as const, tone: "good" as const },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-2xl bg-ink-900 border border-ink-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ink-500" aria-hidden="true">
                  <Icon name={s.iconKey} size={16} />
                </span>
              </div>
              <div className="font-mono text-xl font-bold tabular-nums" dir="ltr">
                {s.value}
              </div>
              <div className="font-mono text-[10px] text-ink-500 uppercase tracking-widest mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {/* Queue */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">
              QUEUE · 4 NEXT
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              מה אחרי.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUEUE.map((q) => (
            <article
              key={q.id}
              className="p-4 rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[11px] text-ink-400" dir="ltr">
                  {q.id}
                </span>
                <Pill tone="neutral">בתור</Pill>
              </div>
              <div className="flex items-center justify-center my-3">
                <Emblem shape={q.shape} hue={q.hue} size={70} />
              </div>
              <div className="font-bold text-sm leading-tight">{q.name}</div>
              <div className="font-mono text-[11px] text-ink-400 mt-1.5" dir="ltr">
                ETA · {q.eta}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
