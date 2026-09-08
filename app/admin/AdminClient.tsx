"use client";
import { useMemo, useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { FIDGETS } from "@/lib/data";
import { filamentsFor, useFilaments, useMaterials } from "@/lib/palette";
import { useSiteFile } from "@/lib/site-file";
import ColorSwatch, { KIND_LABEL } from "@/components/ui/ColorSwatch";
import type { Filament, FilamentKind, Material } from "@/lib/types";
import { MATERIAL_BY_ID } from "@/lib/materials";
import { PRODUCTS, CONFIG_PRODUCTS, fidgetGrams, CATEGORY_LABEL } from "@/lib/products";
import { DEFAULT_MATERIAL, buyAdvice, colorsInStock, isColorInStock, isMaterialInStock, type Sellable } from "@/lib/inventory";
import { estimateCost, parseHours, fmtHours, type CostSettings } from "@/lib/costing";
import { useAdminStore } from "@/lib/admin-store";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import ApprovalsTab from "@/components/admin/ApprovalsTab";
import { BRANCH_TREE } from "@/lib/units-hierarchy";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MaterialId } from "@/lib/types";

type Tab = "products" | "approvals" | "stock" | "materials" | "params" | "emblems" | "backup";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "מוצרים" },
  { id: "approvals", label: "מודלים לאישור" },
  { id: "stock", label: "מלאי" },
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
          <p className="text-ink-400 text-sm mt-1">הנתונים חיים לסשן הנוכחי. לשונית &quot;גיבוי&quot; ← &quot;שמירה&quot; מורידה קובץ שמעדכן את המחירים והמלאי לכל מי שנכנס לאתר.</p>
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
      {tab === "approvals" && <ApprovalsTab />}
      {tab === "stock" && <StockTab />}
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
/**
 * Add a filament family the built-in list never heard of.
 *
 * The shop is not a fixed menu of seven materials: a spool of something new
 * turns up and it has to be sellable that evening, not after a deploy.
 */
function AddMaterialForm() {
  const addMaterial = useAdminStore((s) => s.addMaterial);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [price, setPrice] = useState(120);
  const [add, setAdd] = useState(0);
  const [desc, setDesc] = useState("");

  const submit = () => {
    const clean = name.trim();
    if (!clean) return;
    const id = `custom_${clean.replace(/\s+/g, "_").toLowerCase()}`;
    const m: Material = {
      id,
      name: clean,
      short: (short.trim() || clean).slice(0, 10),
      desc: desc.trim() || "חומר שהוספת.",
      spoolPriceILS: Math.max(0, price),
      spoolKg: 1,
      priceAdd: Math.max(0, add),
    };
    addMaterial(m);
    setName(""); setShort(""); setDesc(""); setPrice(120); setAdd(0);
  };

  return (
    <div className="mt-4 p-4 rounded-2xl border border-flame/35 bg-flame/5">
      <div className="font-bold mb-1">הוספת חומר חדש</div>
      <p className="text-xs text-ink-400 mb-3">
        כל מה שקנית ולא ברשימה — נילון, שרף, פילמנט מיוחד. מופיע מיד בכל האתר.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם החומר (למשל: PLA-CF סיבי פחמן)"
          className="h-10 px-3 rounded-lg bg-ink-950 border border-ink-800 text-sm outline-none focus:border-flame" />
        <input value={short} onChange={(e) => setShort(e.target.value)} placeholder="קיצור (PLA-CF)" dir="ltr"
          className="h-10 px-3 rounded-lg bg-ink-950 border border-ink-800 text-sm font-mono outline-none focus:border-flame" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="תיאור קצר ללקוח"
          className="h-10 px-3 rounded-lg bg-ink-950 border border-ink-800 text-sm outline-none focus:border-flame sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-ink-400">
          ₪ לגליל
          <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} dir="ltr"
            className="h-10 w-24 px-2 rounded-lg bg-ink-950 border border-ink-800 font-mono text-center outline-none focus:border-flame" />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-400">
          תוספת למחיר המוצר ₪
          <input type="number" min={0} value={add} onChange={(e) => setAdd(Number(e.target.value))} dir="ltr"
            className="h-10 w-24 px-2 rounded-lg bg-ink-950 border border-ink-800 font-mono text-center outline-none focus:border-flame" />
        </label>
      </div>
      <button type="button" onClick={submit} disabled={!name.trim()}
        className="mt-3 px-4 h-10 rounded-lg font-bold text-sm bg-flame text-white disabled:opacity-40">
        הוסף חומר
      </button>
    </div>
  );
}

function MaterialsTab() {
  const siteFile = useSiteFile();
  const settings = useAdminStore((s) => s.settings);
  const setSpoolPrice = useAdminStore((s) => s.setSpoolPrice);
  const materials = useMaterials();
  const custom = useAdminStore((s) => s.materials);
  const removeMaterial = useAdminStore((s) => s.removeMaterial);
  const isCustom = (id: string) => custom.some((m) => m.id === id);
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-ink-400 mb-4">מחיר גליל 1 ק&quot;ג בשקלים כולל מע&quot;מ, לפי מה שאתה קונה בפועל. ברירת המחדל היא מחיר שוק ישראלי טיפוסי.</p>
      <div className="rounded-2xl border border-ink-800 divide-y divide-ink-800">
        {materials.map((m) => {
          const price = settings.spoolPrices[m.id] ?? m.spoolPriceILS;
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
              {isCustom(m.id) && (
                <button type="button" onClick={() => removeMaterial(m.id)}
                  className="text-[11px] text-ink-500 hover:text-flame underline underline-offset-2">
                  הסר
                </button>
              )}
            </div>
          );
        })}
      </div>
      <AddMaterialForm />
      <div className="mt-5">
        <AdminSaveToSite json={siteFile} title="סיים ועדכן" what="החומרים והמחירים" />
      </div>
    </div>
  );
}

// ─── Stock (מלאי) ────────────────────────────────────────────────────────────
// What is actually on the shelf, per material family and colour. Everything is
// in stock until it is switched off here — that way a fresh session (and a new
// colour added later) starts as a fully stocked shop rather than an empty one.

/** Every sellable thing, so we can say what an empty spool blocks. */
function sellableItems(): Sellable[] {
  return [
    ...PRODUCTS.map((p) => ({ id: p.id, name: p.name, material: p.material ?? DEFAULT_MATERIAL })),
    ...FIDGETS.map((f) => ({ id: f.id, name: f.name, material: DEFAULT_MATERIAL as MaterialId })),
    ...CONFIG_PRODUCTS.map((c) => ({ id: `cfg-${c.id}`, name: c.label, material: c.material })),
  ];
}

/**
 * Add a spool the palette never heard of, including the ones a flat circle
 * cannot describe: glow in the dark, colour-changing, dual-colour silk.
 */
function AddColorForm() {
  const addColor = useAdminStore((s) => s.addColor);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#7EE787");
  const [hex2, setHex2] = useState("#F2F2EF");
  const [kind, setKind] = useState<FilamentKind>("solid");
  // Each kind starts on colours that look like the real spool, so the preview
  // is right before anyone touches a picker — a marble that opens bright green
  // just looks broken.
  const KIND_DEFAULTS: Record<FilamentKind, [string, string]> = {
    solid: ["#EC4899", "#F2F2EF"],
    glow: ["#7EE787", "#F2F2EF"],
    clear: ["#FF6B1A", "#F2F2EF"],
    marble: ["#E8E6E1", "#6E6E73"],
    shift: ["#2563EB", "#EF4444"],
    dual: ["#C9A227", "#4C1D95"],
  };
  const pickKind = (k: FilamentKind) => {
    setKind(k);
    setHex(KIND_DEFAULTS[k][0]);
    setHex2(KIND_DEFAULTS[k][1]);
  };
  const [desc, setDesc] = useState("");
  // Which families this spool exists in. Empty = all of them, which is the
  // right answer for a plain colour and the wrong one for a glow PLA.
  const materials = useMaterials();
  const [families, setFamilies] = useState<string[]>([]);
  const toggleFamily = (id: string) =>
    setFamilies((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const preview: Filament = { id: "preview", name, hex, hex2, kind, desc };

  const submit = () => {
    const clean = name.trim();
    if (!clean) return;
    addColor({
      id: `custom_${clean.replace(/\s+/g, "_").toLowerCase()}`,
      name: clean,
      hex,
      ...(kind === "solid" || kind === "glow" || kind === "clear" ? {} : { hex2 }),
      kind,
      ...(families.length ? { materials: families } : {}),
      desc: desc.trim() || KIND_LABEL[kind],
    });
    setName(""); setDesc(""); setFamilies([]);
  };

  return (
    <div className="p-4 rounded-2xl border border-flame/35 bg-flame/5">
      <div className="font-bold mb-1">הוספת צבע חדש</div>
      <p className="text-xs text-ink-400 mb-3">
        גם המיוחדים: זוהר בחושך, שקוף, שיש, מחליף צבע בחום ודו-גוני. בוחרים סוג, מסמנים באיזה
        חומרים יש לך אותו, והצבע מופיע מיד באתר.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(["solid", "glow", "clear", "marble", "shift", "dual"] as FilamentKind[]).map((k) => (
          <button key={k} type="button" onClick={() => pickKind(k)}
            className={cn("px-3 h-9 rounded-lg text-xs font-semibold border transition-colors",
              kind === k ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-400 hover:border-ink-600")}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="mb-3">
        <div className="text-xs text-ink-400 mb-1.5">
          באיזה חומר יש לך אותו? <span className="text-ink-600">(בלי בחירה — בכל החומרים)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {materials.map((m) => (
            <button key={m.id} type="button" onClick={() => toggleFamily(m.id)}
              className={cn("px-2.5 h-8 rounded-lg text-[11px] font-semibold border transition-colors",
                families.includes(m.id) ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-400 hover:border-ink-600")}>
              {m.short}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הצבע (למשל: ירוק זוהר)"
          className="h-10 px-3 rounded-lg bg-ink-950 border border-ink-800 text-sm outline-none focus:border-flame" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="הערה קצרה (אופציונלי)"
          className="h-10 px-3 rounded-lg bg-ink-950 border border-ink-800 text-sm outline-none focus:border-flame" />
      </div>
      <div className="flex flex-wrap items-end gap-5 mt-4">
        <label className="flex flex-col items-center gap-1.5 text-[11px] text-ink-400">
          {kind === "shift" ? "בקור" : kind === "dual" ? "צבע ראשון" : kind === "marble" ? "רקע" : "צבע"}
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)}
            className="swatch-input h-10 w-10" />
        </label>
        {(kind === "shift" || kind === "dual" || kind === "marble") && (
          <label className="flex flex-col items-center gap-1.5 text-[11px] text-ink-400">
            {kind === "shift" ? "בחום" : kind === "marble" ? "גידים" : "צבע שני"}
            <input type="color" value={hex2} onChange={(e) => setHex2(e.target.value)}
              className="swatch-input h-10 w-10" />
          </label>
        )}
        <div className="flex flex-col items-center gap-1.5 text-[11px] text-ink-400">
          כך זה ייראה
          <ColorSwatch filament={preview} size={44} />
        </div>
        <span className="flex-1" />
        <button type="button" onClick={submit} disabled={!name.trim()}
          className="px-5 h-11 rounded-xl font-bold text-sm bg-flame text-white disabled:opacity-40 hover:bg-flame/90 transition-colors">
          הוסף צבע
        </button>
      </div>
    </div>
  );
}

function StockTab() {
  const siteFile = useSiteFile();
  const stock = useAdminStore((s) => s.stock);
  const setStock = useAdminStore((s) => s.setStock);
  const setMaterialStock = useAdminStore((s) => s.setMaterialStock);
  const interest = useAdminStore((s) => s.interest);
  const clearInterest = useAdminStore((s) => s.clearInterest);
  const settings = useAdminStore((s) => s.settings);

  const items = useMemo(() => sellableItems(), []);
  const advice = useMemo(
    () => buyAdvice(stock, interest, items, settings.spoolPrices),
    [stock, interest, items, settings.spoolPrices],
  );
  const materials = useMaterials();
  const filaments = useFilaments();
  const customColors = useAdminStore((s) => s.colors);
  const removeColor = useAdminStore((s) => s.removeColor);

  const blockedCount = items.filter((i) => !isMaterialInStock(stock, i.material ?? DEFAULT_MATERIAL)).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-ink-400 mb-1">
          לחיצה על עיגול צבע מסמנת שהוא נגמר. מוצר שהחומר שלו נגמר לגמרי הופך אפור באתר, נכתב עליו
          &quot;המוצר אינו זמין כרגע&quot;, ולקוח שילחץ עליו יכול להשאיר מייל.
        </p>
        <p className="text-xs text-ink-500">
          כרגע {blockedCount === 0 ? "אין מוצרים חסומים" : `${blockedCount} מוצרים חסומים`} מתוך {items.length}.
        </p>
      </div>

      {/* ── material × colour grid ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-ink-800 divide-y divide-ink-800">
        {materials.map((m) => {
          const mine = filamentsFor(filaments, m.id);
          const live = colorsInStock(stock, m.id, mine);
          const out = mine.length - live.length;
          const blocked = items.filter((i) => (i.material ?? DEFAULT_MATERIAL) === m.id).length;
          return (
            <div key={m.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-mono font-bold text-ink-100 min-w-[80px]" dir="ltr">{m.short}</span>
                <span className="text-sm font-semibold">{m.name}</span>
                {live.length === 0 ? (
                  <Pill tone="flame" className="text-[10px]">נגמר · חוסם {blocked} מוצרים</Pill>
                ) : out > 0 ? (
                  <Pill tone="neutral" className="text-[10px]">{out} צבעים חסרים</Pill>
                ) : (
                  <Pill tone="cyan" className="text-[10px]">מלא</Pill>
                )}
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => setMaterialStock(m.id, mine.map((c) => c.id), true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-ink-700 text-ink-300 hover:border-ink-500"
                >
                  הכל יש
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialStock(m.id, mine.map((c) => c.id), false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-ink-700 text-ink-300 hover:border-flame hover:text-flame"
                >
                  הכל נגמר
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {mine.map((c) => {
                  const have = isColorInStock(stock, m.id, c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={`${c.name}${c.kind && c.kind !== "solid" ? ` · ${KIND_LABEL[c.kind]}` : ""} · ${have ? "במלאי" : "נגמר"}`}
                      aria-label={`${m.short} ${c.name}`}
                      aria-pressed={have}
                      onClick={() => setStock(m.id, c.id, !have)}
                      className={cn(
                        "rounded-full relative transition-all hover:scale-110 active:scale-95",
                        have ? "text-good" : "opacity-35",
                      )}
                    >
                      <ColorSwatch filament={c} size={36} selected={have} />
                      {!have && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="block w-7 h-[2px] bg-white/80 rotate-45 rounded-full" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── spools the owner added ─────────────────────────────────────── */}
      <div className="space-y-3">
        <AddColorForm />
        {customColors.length > 0 && (
          <div className="flex flex-wrap gap-3 p-4 rounded-2xl border border-ink-800">
            {customColors.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-ink-800">
                <ColorSwatch filament={c} size={24} />
                <span className="text-sm">{c.name}</span>
                <span className="text-[11px] text-ink-500">
                  {KIND_LABEL[c.kind ?? "solid"]}
                  {c.materials?.length ? ` · ${c.materials.map((id) => materials.find((m) => m.id === id)?.short ?? id).join(", ")}` : " · כל החומרים"}
                </span>
                <button type="button" onClick={() => removeColor(c.id)}
                  className="text-[11px] text-ink-500 hover:text-flame underline underline-offset-2">
                  הסר
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminSaveToSite json={siteFile} title="סיים ועדכן" what="המלאי והצבעים" />

      {/* ── what to buy next ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-black mb-1">מה כדאי לקנות עכשיו</h2>
        <p className="text-xs text-ink-500 mb-3">
          מדורג לפי כמה אנשים מחכים לחומר וכמה מוצרים הוא פותח. לקוח שהשאיר מייל שווה יותר ממוצר
          שאף אחד לא ביקש.
        </p>
        {advice.length === 0 ? (
          <div className="p-4 rounded-2xl border border-ink-800 text-sm text-ink-400">
            הכל במלאי. אין מה לקנות כרגע.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {advice.map((a, i) => (
              <div
                key={a.material}
                className={cn(
                  "p-4 rounded-2xl border",
                  i === 0 ? "border-flame/50 bg-flame/5" : "border-ink-800 bg-ink-900/40",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {i === 0 && <Pill tone="flame" className="text-[10px]">קודם כל</Pill>}
                  <span className="font-bold">{a.materialName}</span>
                  <span className="font-mono text-xs text-ink-500" dir="ltr">
                    {MATERIAL_BY_ID[a.material]?.short ?? a.material}
                  </span>
                </div>
                <p className="text-sm text-ink-300">
                  {a.waiting > 0
                    ? `${a.waiting} ${a.waiting === 1 ? "לקוח מחכה" : "לקוחות מחכים"} · חוסם ${a.blocked} מוצרים`
                    : `אף אחד עוד לא ביקש, אבל זה חוסם ${a.blocked} מוצרים`}
                </p>
                {a.colors.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-ink-500">הכי מבוקש:</span>
                    {a.colors.slice(0, 4).map((c) => (
                      <span
                        key={c.id}
                        title={`${c.name} · ${c.count}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-ink-700 text-[10px]"
                      >
                        <span className="h-3 w-3 rounded-full border border-ink-700" style={{ backgroundColor: c.hex }} />
                        {c.name} ×{c.count}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 font-mono text-xs text-ink-400" dir="ltr">
                  ~{fmtILS(a.spoolPrice)} / 1kg
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── waiting list ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-black mb-1">מי מחכה ({interest.length})</h2>
            <p className="text-xs text-ink-500">
              לקוחות שהשאירו מייל על מוצר שנגמר. הרשימה נשמרת לסשן — ייצוא בלשונית &quot;גיבוי&quot;.
            </p>
          </div>
          {interest.length > 0 && (
            <Btn variant="ghost" size="sm" icon="x" onClick={clearInterest}>ניקוי</Btn>
          )}
        </div>
        {interest.length === 0 ? (
          <div className="p-4 rounded-2xl border border-ink-800 text-sm text-ink-400">
            אף אחד לא ביקש עדכון עדיין.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ink-800">
            <table className="w-full text-xs" dir="rtl">
              <thead className="bg-ink-900 text-ink-400">
                <tr>
                  <th className="text-right p-2 font-semibold">מוצר</th>
                  <th className="text-right p-2 font-semibold">חומר</th>
                  <th className="text-right p-2 font-semibold">צבע</th>
                  <th className="text-right p-2 font-semibold">מייל</th>
                  <th className="text-right p-2 font-semibold">מתי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {[...interest].reverse().map((r) => {
                  const f = filaments.find((x) => x.id === r.color);
                  return (
                    <tr key={r.id}>
                      <td className="p-2">{r.itemName}</td>
                      <td className="p-2 font-mono" dir="ltr">{MATERIAL_BY_ID[r.material]?.short ?? r.material}</td>
                      <td className="p-2">
                        {f ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border border-ink-700" style={{ backgroundColor: f.hex }} />
                            {f.name}
                          </span>
                        ) : (
                          <span className="text-ink-600">—</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-ink-300" dir="ltr">{r.email}</td>
                      <td className="p-2 font-mono text-ink-500" dir="ltr">
                        {new Date(r.at).toLocaleDateString("he-IL")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Parameters ──────────────────────────────────────────────────────────────
function ParamsTab() {
  const settings = useAdminStore((s) => s.settings);
  const setSetting = useAdminStore((s) => s.setSetting);
  const pricing = useAdminStore((s) => s.pricing);
  const setPricing = useAdminStore((s) => s.setPricing);
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
      {/* ── automatic pricing: what the customer actually sees ─────────── */}
      <div className={cn("p-4 rounded-xl border", pricing.auto ? "border-flame/50 bg-flame/5" : "border-ink-800 bg-ink-900")}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="text-sm font-semibold">תמחור אוטומטי לכל האתר</div>
            <div className="text-xs text-ink-500 leading-relaxed">
              כשזה דולק, <b>כל מחיר באתר</b> מחושב מחדש לפי העלות והמרווח שלמטה, ולא לפי המחיר שכתוב בקטלוג.
              מחיר שקבעת ידנית בלשונית &quot;מוצרים&quot; תמיד גובר.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pricing.auto}
            onClick={() => setPricing({ auto: !pricing.auto })}
            className={cn(
              "h-9 px-4 rounded-lg text-sm font-bold border transition-colors",
              pricing.auto ? "bg-flame text-white border-flame" : "border-ink-700 text-ink-300 hover:border-ink-500",
            )}
          >
            {pricing.auto ? "דולק" : "כבוי"}
          </button>
        </div>
        {pricing.auto && (
          <label className="mt-3 flex items-center gap-2 text-xs text-ink-400">
            עיגול מחיר כלפי מעלה לכפולה של
            <input
              type="number"
              min={1}
              step={1}
              value={pricing.round}
              onChange={(e) => setPricing({ round: Math.max(1, Number(e.target.value)) })}
              className="h-8 w-20 px-2 rounded-lg bg-ink-950 border border-ink-800 text-ink-100 font-mono text-center focus:border-flame outline-none"
              dir="ltr"
            />
            ₪
          </label>
        )}
      </div>

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

  /** The file the site itself reads. Customer e-mails stay out of it. */
  const siteFile = () => {
    const parsed = JSON.parse(exportJson()) as Record<string, unknown>;
    delete parsed.interest;
    return JSON.stringify(parsed, null, 2);
  };

  const download = () => {
    const blob = new Blob([siteFile()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-settings.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMsg("הקובץ ירד. עכשיו העתק אותו לתיקייה public שבפרויקט ודחוף ל-GitHub.");
  };

  return (
    <div className="max-w-3xl grid gap-5">
      {/* ── save straight from the browser (phone included) ─────────────── */}
      <AdminSaveToSite json={siteFile} title="שמירה ישירות לאתר" what="המחירים והמלאי שקבעת" />

      {/* ── save by hand: download, drop into public/, push ─────────────── */}
      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900">
        <h2 className="font-black text-lg mb-1">שמירה ידנית (מהמחשב)</h2>
        <p className="text-sm text-ink-300 leading-relaxed mb-3">
          לחיצה על &quot;שמירה&quot; מורידה קובץ בשם <span className="font-mono text-ink-100" dir="ltr">admin-settings.json</span>.
          שים אותו בתיקייה <span className="font-mono text-ink-100" dir="ltr">public/</span> של הפרויקט ודחוף ל-GitHub.
          זו אותה תוצאה כמו הכפתור למעלה, בלי טוקן. המיילים של הלקוחות שמחכים לא נכנסים לקובץ.
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" size="sm" icon="file" onClick={download}>שמירה · הורדת הקובץ</Btn>
          <Btn
            variant="ghost"
            size="sm"
            icon="list"
            onClick={() => {
              setText(siteFile());
              setMsg("התוכן למטה — אפשר להעתיק אותו ידנית לקובץ.");
            }}
          >
            העתקה כטקסט
          </Btn>
        </div>
      </div>

      {/* ── session backup ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-ink-800 bg-ink-900 text-sm text-ink-300 leading-relaxed">
        גיבוי מהיר בין סשנים: האתר לא שומר נתונים בדפדפן (זו החלטה של הפרויקט), אז אפשר לייצא לטקסט,
        לשמור אותו איפשהו, ולייבא בפעם הבאה. הייצוא כאן <b>כולל</b> את רשימת ההמתנה.
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" size="sm" icon="file" onClick={() => { setText(exportJson()); setMsg("ההגדרות מוכנות להעתקה למטה."); }}>ייצוא מלא</Btn>
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
