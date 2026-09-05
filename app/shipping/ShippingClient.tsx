"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PRODUCTS } from "@/lib/products";
import {
  CLICK_DISCOUNT,
  PACKAGING,
  PACKAGING_SOURCE,
  RATES_SOURCE,
  VOLUME_TIERS,
  pickPackaging,
  quote,
  shippedWeight,
  type Destination,
  type VolumeTier,
} from "@/lib/shipping";

/** A few real products, so you can price a shipment without measuring anything. */
const PRESETS = ["pet-bone", "st-moon", "st-dragon", "home-coasters", "off-phone-stand"] as const;

const SIZE_GUESS: Record<string, { l: number; w: number; h: number }> = {
  "pet-bone": { l: 40, w: 22, h: 4 },
  "st-moon": { l: 150, w: 150, h: 150 },
  "st-dragon": { l: 220, w: 130, h: 90 },
  "home-coasters": { l: 100, w: 100, h: 40 },
  "off-phone-stand": { l: 110, w: 80, h: 90 },
};

export default function ShippingClient() {
  const [grams, setGrams] = useState(120);
  const [l, setL] = useState(150);
  const [w, setW] = useState(100);
  const [h, setH] = useState(60);
  const [destination, setDestination] = useState<Destination>("intercity");
  const [tier, setTier] = useState<VolumeTier>("upto10");
  const [click, setClick] = useState(true);
  const [fragile, setFragile] = useState(true);

  const size = useMemo(() => ({ l, w, h }), [l, w, h]);
  const options = useMemo(
    () => quote({ grams, size, destination, tier, click, fragile }),
    [grams, size, destination, tier, click, fragile],
  );
  const pack = useMemo(() => pickPackaging(size, fragile), [size, fragile]);
  const shipped = shippedWeight(grams, pack);
  const best = options.find((o) => !o.unavailable);

  const applyPreset = (id: string) => {
    const p = PRODUCTS.find((x) => x.id === id);
    const s = SIZE_GUESS[id];
    if (!p || !s) return;
    setGrams(p.grams);
    setL(s.l);
    setW(s.w);
    setH(s.h);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-4">משלוחים</Pill>
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.15] mb-3">
          כמה עולה לשלוח את זה.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          המחשבון מחשב את מחיר המשלוח לפי המחירון הרשמי של דואר ישראל, ומוסיף עליו את עלות
          האריזה בפועל. דואר ישראל לא מתמחר לפי קילומטרים — המשקל קובע את המדרגה, והמרחק
          משפיע רק בשאלה אם המשלוח בתוך העיר או בין-עירוני.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-8">
        {/* ── Inputs ────────────────────────────────────────────────────── */}
        <div className="space-y-5 p-5 rounded-2xl bg-ink-900 border border-ink-800 h-fit">
          <div>
            <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase mb-2">מוצר לדוגמה</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((id) => {
                const p = PRODUCTS.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyPreset(id)}
                    className="px-2.5 py-1 rounded-full border border-ink-700 bg-ink-950/50 text-xs text-ink-300 hover:border-flame hover:text-flame transition-colors"
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Num label="משקל המוצר (גרם)" value={grams} onChange={setGrams} step={5} />

          <div>
            <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase mb-2">מידות (מ&quot;מ)</div>
            <div className="grid grid-cols-3 gap-2">
              <Num label="אורך" value={l} onChange={setL} step={5} compact />
              <Num label="רוחב" value={w} onChange={setW} step={5} compact />
              <Num label="גובה" value={h} onChange={setH} step={5} compact />
            </div>
          </div>

          <Choice
            label="יעד"
            value={destination}
            onChange={(v) => setDestination(v as Destination)}
            options={[
              { id: "city", label: "בתוך העיר" },
              { id: "intercity", label: "בין-עירוני" },
            ]}
          />

          <div>
            <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase mb-2">
              כמה חבילות אתה שולח בחודש
            </div>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as VolumeTier)}
              className="w-full h-10 px-3 rounded-xl bg-ink-950 border border-ink-700 text-sm text-ink-100 focus:border-flame focus:outline-none"
            >
              {VOLUME_TIERS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-ink-500">ככל שאתה שולח יותר, מחיר החבילה יורד.</p>
          </div>

          <Toggle label="פריט שביר — עוטף בבועות" value={fragile} onChange={setFragile} />
          <Toggle label={`מכין את המשלוח מהבית (דואר בקליק, ${fmtILS(CLICK_DISCOUNT)} הנחה)`} value={click} onChange={setClick} />
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        <div>
          <div className="p-4 rounded-2xl bg-ink-900 border border-ink-800 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-ink-400">
              משקל למשלוח: <span className="text-ink-100 font-mono" dir="ltr">{shipped} g</span>
            </span>
            <span className="text-ink-400">
              אריזה: <span className="text-ink-100">{pack ? pack.label : "אין אריזה שמתאימה"}</span>
            </span>
            {best && (
              <span className="mr-auto text-good font-bold">
                הזול ביותר: {best.service} · {fmtILS(best.total)}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-ink-800 overflow-hidden">
            <table className="w-full text-sm" dir="rtl">
              <thead className="bg-ink-900">
                <tr className="text-ink-400 text-[11px] font-mono tracking-widest uppercase">
                  <th className="text-right font-normal p-3">שירות</th>
                  <th className="text-left font-normal p-3">משלוח</th>
                  <th className="text-left font-normal p-3">אריזה</th>
                  <th className="text-left font-normal p-3">סה&quot;כ</th>
                </tr>
              </thead>
              <tbody>
                {options.map((o) => (
                  <tr key={o.id} className={cn("border-t border-ink-800", o.unavailable && "opacity-45")}>
                    <td className="p-3">
                      <div className="font-bold">{o.service}</div>
                      <div className="text-[11px] text-ink-500">{o.unavailable ?? o.detail}</div>
                      {!o.unavailable && (
                        <div className="text-[11px] text-ink-600 mt-0.5">{o.packagingLabel}</div>
                      )}
                    </td>
                    <td className="p-3 text-left font-mono text-ink-200" dir="ltr">
                      {o.unavailable ? "—" : fmtILS(o.shipping)}
                    </td>
                    <td className="p-3 text-left font-mono text-ink-400" dir="ltr">
                      {o.unavailable ? "—" : fmtILS(o.packaging)}
                    </td>
                    <td className="p-3 text-left font-mono font-black text-flame text-base" dir="ltr">
                      {o.unavailable ? "—" : fmtILS(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <section className="p-5 rounded-2xl bg-ink-900 border border-ink-800">
              <h2 className="font-bold mb-2">מחירי האריזות</h2>
              <ul className="space-y-1 text-sm">
                {PACKAGING.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="text-ink-300 truncate">{p.label}</span>
                    <span className="font-mono text-ink-100 shrink-0" dir="ltr">{fmtILS(p.ils)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-500">
                מחירים ליחידה מ־
                <a href={PACKAGING_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-cyan2 hover:underline">
                  {PACKAGING_SOURCE.name}
                </a>
                . בנוסף מחושבים ניילון בועות, סרט הדבקה ומדבקת משלוח.
              </p>
            </section>

            <section className="p-5 rounded-2xl bg-ink-900 border border-ink-800">
              <h2 className="font-bold mb-2">מאיפה המחירים</h2>
              <p className="text-sm text-ink-300 leading-relaxed">
                כל מחירי המשלוח לקוחים מ־<span className="text-ink-100">{RATES_SOURCE.title}</span>.
                {" "}
                <a href={RATES_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-cyan2 hover:underline">
                  לקובץ המקורי
                </a>
                . {RATES_SOURCE.note}
              </p>
              <p className="mt-3 text-sm text-ink-400 leading-relaxed">
                מחשבון המחירים באתר של דואר ישראל חסום בפני גישה אוטומטית, ולכן הטבלה נקראה
                מהמחירון הרשמי ולא נשלפת בזמן אמת. כשיוצא מחירון חדש — מעדכנים קובץ אחד.
              </p>
            </section>
          </div>

          <Link
            href="/contact"
            className="mt-6 block p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2">
                <Icon name="truck" size={20} />
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold mb-0.5">משלוח חינם מעל ₪200</div>
                <div className="text-sm text-ink-300">מתחת לזה — בוחרים בטופס ההזמנה איך לשלוח.</div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">
                להזמנה<Icon name="arrowLeft" size={14} />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Num({
  label, value, onChange, step = 1, compact,
}: { label: string; value: number; onChange: (v: number) => void; step?: number; compact?: boolean }) {
  return (
    <label className="block">
      <span className={cn("block text-ink-400 mb-1.5", compact ? "text-[11px]" : "text-[11px] font-mono tracking-widest uppercase text-ink-500")}>
        {label}
      </span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v) && v >= 0) onChange(v);
        }}
        className="w-full h-10 px-3 rounded-xl bg-ink-950 border border-ink-700 text-sm font-mono text-ink-100 focus:border-flame focus:outline-none"
        dir="ltr"
      />
    </label>
  );
}

function Choice({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div>
      <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase mb-2">{label}</div>
      <div className="inline-flex rounded-full border border-ink-700 bg-ink-950 p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "px-3 h-8 rounded-full text-xs font-medium transition-colors",
              value === o.id ? "bg-cyan2/20 text-cyan2" : "text-ink-300 hover:text-ink-50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn("h-5 w-9 rounded-full transition-colors relative shrink-0", value ? "bg-flame" : "bg-ink-700")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            value ? "right-0.5" : "right-4.5",
          )}
          style={{ right: value ? 2 : 18 }}
        />
      </button>
      <span className="text-sm text-ink-300">{label}</span>
    </label>
  );
}
