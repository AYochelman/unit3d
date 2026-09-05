"use client";
import { useMemo, useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { FIDGETS } from "@/lib/data";
import { PRODUCTS, CONFIG_PRODUCTS, fidgetGrams, CATEGORY_LABEL } from "@/lib/products";
import { MATERIALS, MATERIAL_BY_ID } from "@/lib/materials";
import { estimateCost, parseHours, fmtHours, type CostSettings } from "@/lib/costing";
import { useAdminStore } from "@/lib/admin-store";
import { BRANCH_TREE } from "@/lib/units-hierarchy";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MaterialId } from "@/lib/types";

type Tab = "products" | "materials" | "params" | "emblems" | "backup";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "מוצרים" },
  { id: "materials", label: "גלילים" },
  { id: "params", label: "פרמטרים" },
  { id: "emblems", label: "סמלי יחידות" },
  { id: "backup", label: "גיבוי" },
];

type Row = {
  id: string;
  name: string;
  kind: string;
  grams: number;
  hours: number;
  material: MaterialId;
  price: number;
  colors: number;
};

function baseRows(): Row[] {
  const fidgets: Row[] = FIDGETS.map((f) => ({
    id: f.id,
    name: f.name,
    kind: "פידג'ט",
    grams: fidgetGrams(f),
    hours: parseHours(f.time),
    material: "pla_plus",
    price: f.price,
    colors: f.ams ? 2 : 1,
  }));
  const shop: Row[] = PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    kind: CATEGORY_LABEL[p.category],
    grams: p.grams,
    hours: p.hours,
    material: p.material ?? "pla",
    price: p.price,
    colors: p.colors ?? (p.ams ? 2 : 1),
  }));
  const config: Row[] = CONFIG_PRODUCTS.map((c) => ({
    id: `cfg-${c.id}`,
    name: `מעצב · ${c.label}`,
    kind: "מעצב",
    grams: c.grams,
    hours: c.hours,
    material: c.material,
    price: c.basePrice,
    colors: 1,
  }));
  return [...fidgets, ...shop, ...config];
}

export default function AdminClient() {
  const unlocked = useAdminStore((s) => s.unlocked);
  const unlock = useAdminStore((s) => s.unlock);
  const lock = useAdminStore((s) => s.lock);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [tab, setTab] = useState<Tab>("products");

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto px-6 py-24">
        <Pill tone="neutral" className="mb-4 font-mono">ADMIN</Pill>
        <h1 className="text-3xl font-black tracking-tightest mb-2">אזור ניהול</h1>
        <p className="text-ink-400 text-sm mb-6">
          עלויות ייצור, מחירי גלילים ומרווחים. הקוד מוגדר בקובץ <span className="font-mono text-ink-200" dir="ltr">lib/admin-store.ts</span>.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const ok = unlock(pin);
            setPinErr(!ok);
          }}
          className="flex gap-2"
        >
          <Input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="קוד"
            dir="ltr"
            autoFocus
          />
          <Btn type="submit" variant="primary">כניסה</Btn>
        </form>
        {pinErr && <p className="mt-2 text-xs text-bad">קוד שגוי.</p>}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Pill tone="neutral" className="mb-3 font-mono">ADMIN · COSTING</Pill>
          <h1 className="text-3xl md:text-4xl font-black tracking-tightest">ניהול עלויות</h1>
          <p className="text-ink-400 text-sm mt-1">הנתונים נשמרים לסשן הנוכחי. ייצוא JSON בלשונית &quot;גיבוי&quot; שומר אותם לקובץ.</p>
        </div>
        <Btn variant="ghost" size="sm" icon="x" onClick={lock}>נעילה</Btn>
      </header>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-ink-800 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              tab === t.id ? "bg-flame text-white border-flame" : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsTab />}
      {tab === "materials" && <MaterialsTab />}
      {tab === "params" && <ParamsTab />}
      {tab === "emblems" && <EmblemsTab />}
      {tab === "backup" && <BackupTab />}
    </div>
  );
}

// ─── Products ────────────────────────────────────────────────────────────────
function ProductsTab() {
  const settings = useAdminStore((s) => s.settings);
  const overrides = useAdminStore((s) => s.overrides);
  const setOverride = useAdminStore((s) => s.setOverride);
  const clearOverride = useAdminStore((s) => s.clearOverride);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "margin" | "profit">("margin");

  // The row ORDER is recomputed only when the sort or the query changes — not on
  // every keystroke inside a cell (which would re-sort mid-edit).
  const order = useMemo(() => {
    const list = baseRows().map((r) => {
      const o = overrides[r.id] ?? {};
      const cost = estimateCost(
        { grams: o.grams ?? r.grams, hours: o.hours ?? r.hours, material: r.material, colors: r.colors, price: o.price ?? r.price },
        settings,
      );
      return { ...r, cost };
    });
    const filtered = q.trim() ? list.filter((r) => r.name.includes(q.trim()) || r.kind.includes(q.trim())) : list;
    return filtered
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "he")
          : sort === "margin"
            ? (a.cost.margin ?? 0) - (b.cost.margin ?? 0)
            : (a.cost.profit ?? 0) - (b.cost.profit ?? 0),
      )
      .map((r) => r.id);
    // Intentionally NOT reacting to `overrides`: see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort]);

  const rows = useMemo(() => {
    const list = baseRows().map((r) => {
      const o = overrides[r.id] ?? {};
      const grams = o.grams ?? r.grams;
      const hours = o.hours ?? r.hours;
      const price = o.price ?? r.price;
      const cost = estimateCost({ grams, hours, material: r.material, colors: r.colors, price }, settings);
      return { ...r, grams, hours, price, cost, overridden: !!overrides[r.id] };
    });
    const filtered = q.trim() ? list.filter((r) => r.name.includes(q.trim()) || r.kind.includes(q.trim())) : list;
    // Order is computed from the SAVED order key, so typing in a cell does not
    // make the row jump out from under the cursor.
    const byId = new Map(filtered.map((r) => [r.id, r]));
    return order.map((id) => byId.get(id)).filter((r): r is (typeof filtered)[number] => !!r);
  }, [overrides, settings, q, order]);

  const avgMargin = rows.length ? rows.reduce((s, r) => s + (r.cost.margin ?? 0), 0) / rows.length : 0;
  const below = rows.filter((r) => (r.cost.margin ?? 0) < settings.targetMargin).length;

  const num = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString();

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Tile label="מוצרים" value={String(rows.length)} />
        <Tile label="מרווח ממוצע" value={`${(avgMargin * 100).toFixed(0)}%`} tone={avgMargin >= settings.targetMargin ? "good" : "warn"} />
        <Tile label={`מתחת ליעד (${(settings.targetMargin * 100).toFixed(0)}%)`} value={String(below)} tone={below ? "warn" : "good"} />
        <Tile label="עלות עבודה ליחידה" value={fmtILS(settings.laborPerItem)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר…" className="max-w-xs h-9" />
        <div className="flex gap-1 mr-auto">
          {([["margin", "לפי מרווח"], ["profit", "לפי רווח"], ["name", "לפי שם"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSort(id)} className={cn("px-2.5 h-9 rounded-lg text-xs border", sort === id ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-400")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-800">
        <table className="w-full text-xs font-mono whitespace-nowrap" dir="rtl">
          <thead className="bg-ink-900 text-ink-400 text-[11px]">
            <tr>
              <Th>מוצר</Th><Th>סוג</Th><Th>חומר</Th>
              <Th>זמן (h)</Th><Th>גרם</Th>
              <Th>חומר ₪</Th><Th>מכונה+חשמל ₪</Th><Th>עלות ₪</Th>
              <Th>מחיר ₪</Th><Th>רווח ₪</Th><Th>מרווח</Th><Th>מומלץ ₪</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {rows.map((r) => (
              <tr key={r.id} className={cn("hover:bg-ink-900/60", r.overridden && "bg-amber-500/5")}>
                <td className="px-3 py-2 font-sans font-semibold text-ink-100 max-w-[220px] truncate" title={r.name}>{r.name}</td>
                <td className="px-3 py-2 font-sans text-ink-400">{r.kind}</td>
                <td className="px-3 py-2 text-ink-300" dir="ltr">{MATERIAL_BY_ID[r.material].short}{r.colors > 1 ? ` ·${r.colors}C` : ""}</td>
                <td className="px-2 py-1"><Cell value={r.hours} step={0.1} onChange={(v) => setOverride(r.id, { hours: v })} /></td>
                <td className="px-2 py-1"><Cell value={r.grams} step={1} onChange={(v) => setOverride(r.id, { grams: v })} /></td>
                <td className="px-3 py-2 text-ink-300">{num(r.cost.materialCost)}</td>
                <td className="px-3 py-2 text-ink-300">{num(r.cost.machineCost + r.cost.electricityCost)}</td>
                <td className="px-3 py-2 text-ink-100 font-bold">{num(r.cost.unitCost)}</td>
                <td className="px-2 py-1"><Cell value={r.price} step={1} onChange={(v) => setOverride(r.id, { price: v })} /></td>
                <td className="px-3 py-2 text-ink-100">{num(r.cost.profit ?? 0, 0)}</td>
                <td className={cn("px-3 py-2 font-bold", (r.cost.margin ?? 0) >= settings.targetMargin ? "text-emerald-400" : (r.cost.margin ?? 0) >= 0.4 ? "text-amber-300" : "text-red-400")}>
                  {((r.cost.margin ?? 0) * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-cyan2">{r.cost.recommendedPrice}</td>
                <td className="px-2 py-1">
                  {r.overridden && (
                    <button type="button" onClick={() => clearOverride(r.id)} title="אפס לברירת מחדל" className="text-ink-500 hover:text-bad"><Icon name="rotate" size={12} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-ink-500 leading-relaxed">
        זמן וגרם הם הערכות עד שיש נתונים מהסלייסר. שדה שנערך נצבע בענבר ואפשר לאפס אותו. &quot;מומלץ&quot; = המחיר שמגיע ליעד המרווח בלשונית פרמטרים.
      </p>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-right font-medium">{children}</th>;
}

function Cell({ value, step, onChange }: { value: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={step}
      min={0}
      value={Math.round(value * 100) / 100}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="h-8 w-20 px-2 rounded-md bg-ink-950 border border-ink-800 text-ink-100 text-xs font-mono text-center focus:border-flame outline-none"
      dir="ltr"
    />
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="p-4 rounded-xl border border-ink-800 bg-ink-900">
      <div className="text-[11px] text-ink-400 mb-1">{label}</div>
      <div className={cn("font-mono text-2xl font-black", tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : "text-ink-50")} dir="ltr">{value}</div>
    </div>
  );
}

// ─── Materials ───────────────────────────────────────────────────────────────
function MaterialsTab() {
  const settings = useAdminStore((s) => s.settings);
  const setSpoolPrice = useAdminStore((s) => s.setSpoolPrice);
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-ink-400 mb-4">מחיר גליל 1 ק&quot;ג בשקלים כולל מע&quot;מ, לפי מה שאתה קונה בפועל. ברירת המחדל היא מחיר שוק ישראלי טיפוסי.</p>
      <div className="rounded-2xl border border-ink-800 divide-y divide-ink-800">
        {MATERIALS.map((m) => {
          const price = settings.spoolPrices[m.id];
          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[90px] font-mono font-bold text-ink-100" dir="ltr">{m.short}</div>
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-ink-500">{m.desc}</div>
              </div>
              <div className="text-xs text-ink-500 font-mono" dir="ltr">{(price / (m.spoolKg * 1000)).toFixed(3)} ₪/g</div>
              <label className="flex items-center gap-2 text-xs text-ink-400">
                ₪ / גליל
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(e) => setSpoolPrice(m.id, Number(e.target.value))}
                  className="h-9 w-24 px-2 rounded-lg bg-ink-950 border border-ink-800 text-ink-100 font-mono text-center focus:border-flame outline-none"
                  dir="ltr"
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Parameters ──────────────────────────────────────────────────────────────
function ParamsTab() {
  const settings = useAdminStore((s) => s.settings);
  const setSetting = useAdminStore((s) => s.setSetting);
  const fields: { k: Exclude<keyof CostSettings, "spoolPrices">; label: string; hint: string; step: number; pct?: boolean }[] = [
    { k: "machineRatePerHour", label: "עלות מכונה לשעה (₪)", hint: "פחת מדפסת, תחזוקה, נוזלים. 6 ₪ לשעה = מדפסת של 4,000 ₪ על ~1,300 שעות עבודה בשנה, פלוס תחזוקה.", step: 0.5 },
    { k: "printerWatts", label: "צריכת חשמל בהדפסה (W)", hint: "Bambu X1C ממוצע ~120W ב-PLA, ~180W ב-ABS עם תא סגור.", step: 5 },
    { k: "kwhPriceILS", label: "מחיר קוט\"ש (₪)", hint: "תעריף חברת החשמל הביתי.", step: 0.01 },
    { k: "laborPerItem", label: "עבודה ליחידה (₪)", hint: "הורדה מהמשטח, ניקוי תמיכות, אריזה. גם אם זה אתה, הזמן שווה כסף.", step: 1 },
    { k: "amsWastePerColor", label: "פחת AMS לכל צבע נוסף", hint: "מגדל הניקוי והפיילים. 12% מהמשקל לכל צבע נוסף זה אומדן סביר לחלקים קטנים.", step: 0.01, pct: true },
    { k: "targetMargin", label: "יעד מרווח גולמי", hint: "משמש לעמודת \"מומלץ\" בטבלת המוצרים.", step: 0.05, pct: true },
  ];
  return (
    <div className="max-w-3xl grid gap-3">
      {fields.map((f) => (
        <div key={f.k} className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-ink-800 bg-ink-900">
          <div className="flex-1 min-w-[220px]">
            <div className="text-sm font-semibold">{f.label}</div>
            <div className="text-xs text-ink-500 leading-relaxed">{f.hint}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={f.pct ? 1 : f.step}
              min={0}
              value={f.pct ? Math.round(settings[f.k] * 100) : settings[f.k]}
              onChange={(e) => setSetting(f.k, f.pct ? Number(e.target.value) / 100 : Number(e.target.value))}
              className="h-9 w-24 px-2 rounded-lg bg-ink-950 border border-ink-800 text-ink-100 font-mono text-center focus:border-flame outline-none"
              dir="ltr"
            />
            {f.pct && <span className="text-ink-400 text-xs">%</span>}
          </div>
        </div>
      ))}
      <div className="p-4 rounded-xl border border-ink-800 bg-ink-950/40 text-xs text-ink-400 leading-relaxed">
        <div className="font-semibold text-ink-200 mb-1">איך מחושבת עלות</div>
        עלות = (גרם × פחת AMS ÷ 1000 × מחיר גליל) + (שעות × עלות מכונה) + (שעות × וואט ÷ 1000 × מחיר קוט&quot;ש) + עבודה.
        זמן הדפסה של שעה על מוצר של 20 גרם ב-PLA+ יוצא בערך {fmtILS(Math.round(estimateCost({ grams: 20, hours: 1, material: "pla_plus" }, settings).unitCost * 10) / 10)}, כאשר {fmtHours(1)} מכונה.
      </div>
    </div>
  );
}

// ─── Emblems check ───────────────────────────────────────────────────────────
type EmblemRow = { slug: string; name: string; level: string };

function expectedEmblems(): EmblemRow[] {
  const rows: EmblemRow[] = [];
  for (const b of BRANCH_TREE) {
    rows.push({ slug: `branch-${b.slug}`, name: b.name, level: "זרוע" });
    for (const c of b.corps) {
      rows.push({ slug: `corps-${c.slug}`, name: c.name, level: "חיל" });
      for (const br of c.brigades) {
        rows.push({ slug: `brigade-${br.slug}`, name: br.name, level: "חטיבה" });
      }
    }
  }
  return rows;
}

function EmblemsTab() {
  const rows = useMemo(() => expectedEmblems(), []);
  const [status, setStatus] = useState<Record<string, "ok" | "missing">>({});
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const check = async () => {
    setRunning(true);
    const next: Record<string, "ok" | "missing"> = {};
    const queue = [...rows];
    const worker = async () => {
      while (queue.length) {
        const r = queue.shift()!;
        try {
          const res = await fetch(`/emblems/${r.slug}.png`, { method: "HEAD", cache: "no-store" });
          const type = res.headers.get("content-type") ?? "";
          next[r.slug] = res.ok && type.includes("image") ? "ok" : "missing";
        } catch {
          next[r.slug] = "missing";
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    setStatus(next);
    setRunning(false);
  };

  const missing = rows.filter((r) => status[r.slug] === "missing");
  const found = rows.filter((r) => status[r.slug] === "ok");
  const checked = Object.keys(status).length > 0;

  const copyMissing = async () => {
    const list = (checked ? missing : rows).map((r) => `${r.slug}.png\t${r.level}\t${r.name}`).join("\n");
    try {
      await navigator.clipboard.writeText(list);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div>
      <div className="p-4 rounded-xl border border-ink-800 bg-ink-900 text-sm text-ink-300 leading-relaxed mb-4 space-y-2">
        <p>
          הקטלוג מחפש קובץ תמונה לכל יחידה בנתיב <span className="font-mono text-ink-100" dir="ltr">public/emblems/&lt;slug&gt;.png</span>.
          כשהקובץ חסר מוצג סמל גנרי, כך שחוסר לא שובר כלום. מומלץ PNG שקוף, 512×512.
        </p>
        <p className="pt-2 border-t border-ink-800">
          <strong className="text-ink-100">הורדה אוטומטית:</strong> הרץ <span className="font-mono text-flame" dir="ltr">npm run emblems</span> בתיקיית
          הפרויקט (או לחיצה כפולה על <span className="font-mono" dir="ltr">emblems.bat</span>).
          אם משהו לא עובד: <span className="font-mono" dir="ltr">npm run emblems -- --doctor</span> בודק Node, קבצים וחיבור ואומר בדיוק מה חסר. הסקריפט מוריד מ-Wikimedia Commons את הסמלים שמופו ב-<span className="font-mono" dir="ltr">scripts/emblems.json</span>,
          שומר בשמות הנכונים, וכותב קרדיטים ב-<span className="font-mono" dir="ltr">public/emblems/CREDITS.md</span>.
          רישיונות CC BY-SA מחייבים ייחוס, אז אל תמחק אותו.
        </p>
        <p>
          <strong className="text-ink-100">מה נמצא:</strong> מתוך 100 היחידות בקטלוג נמצאו 41 קבצים (16 אומתו בבדיקה שנייה, 25 נמצאו ולא נבדקו שנית),
          ו-57 הן קטגוריות כלליות (טייסות, מערכים, חטיבות מילואים כקבוצה) שאין להן סמל אחד ונשארות עם הסמל הגנרי בכוונה.
          שם קובץ שגוי פשוט מדולג, כך שהרצה חלקית בטוחה. פירוט מלא: <span className="font-mono" dir="ltr">docs/emblems-sources.md</span>.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Btn variant="primary" size="sm" onClick={check} disabled={running} icon="search">
          {running ? "בודק…" : "בדוק אילו קבצים קיימים"}
        </Btn>
        <Btn variant="ghost" size="sm" onClick={copyMissing} icon="file">
          {copied ? "הועתק" : checked ? `העתק רשימת חסרים (${missing.length})` : `העתק את כל ${rows.length} שמות הקבצים`}
        </Btn>
        {checked && (
          <span className="font-mono text-xs text-ink-400 mr-auto" dir="ltr">
            <span className="text-emerald-400">{found.length} found</span> · <span className="text-amber-300">{missing.length} missing</span>
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-ink-800 max-h-[520px] overflow-y-auto">
        <table className="w-full text-xs" dir="rtl">
          <thead className="bg-ink-900 text-ink-400 sticky top-0">
            <tr><Th>קובץ</Th><Th>רמה</Th><Th>יחידה</Th><Th>מצב</Th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {rows.map((r) => (
              <tr key={r.slug}>
                <td className="px-3 py-1.5 font-mono text-ink-200" dir="ltr">{r.slug}.png</td>
                <td className="px-3 py-1.5 text-ink-400">{r.level}</td>
                <td className="px-3 py-1.5">{r.name}</td>
                <td className="px-3 py-1.5">
                  {status[r.slug] === "ok" ? <span className="text-emerald-400 font-mono">OK</span> : status[r.slug] === "missing" ? <span className="text-amber-300 font-mono">חסר</span> : <span className="text-ink-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Backup ──────────────────────────────────────────────────────────────────
function BackupTab() {
  const exportJson = useAdminStore((s) => s.exportJson);
  const importJson = useAdminStore((s) => s.importJson);
  const resetAll = useAdminStore((s) => s.resetAll);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="max-w-3xl grid gap-4">
      <div className="p-4 rounded-xl border border-ink-800 bg-ink-900 text-sm text-ink-300 leading-relaxed">
        האתר לא שומר נתונים בדפדפן (זו החלטה של הפרויקט). כדי לא לאבד את מחירי הגלילים והעריכות בין סשנים,
        ייצא אותם לטקסט, שמור בקובץ, וייבא בפעם הבאה. שמירה אמיתית תגיע עם שרת.
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" size="sm" icon="file" onClick={() => { setText(exportJson()); setMsg("ההגדרות מוכנות להעתקה למטה."); }}>ייצוא להגדרות</Btn>
        <Btn variant="ghost" size="sm" icon="check" onClick={() => { const ok = importJson(text); setMsg(ok ? "יובא בהצלחה." : "הטקסט אינו קובץ הגדרות תקין."); }}>ייבוא מהטקסט</Btn>
        <Btn variant="danger" size="sm" icon="rotate" onClick={() => { resetAll(); setText(""); setMsg("אופס לברירות המחדל."); }}>איפוס</Btn>
      </div>
      {msg && <p className="text-xs text-ink-400">{msg}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        dir="ltr"
        className="w-full min-h-[280px] p-3 rounded-xl bg-ink-950 border border-ink-800 font-mono text-xs text-ink-200 focus:border-flame outline-none"
        placeholder='{"version":1, ...}'
      />
    </div>
  );
}
