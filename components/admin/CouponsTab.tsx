"use client";
import { useMemo, useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import { Field, Input, Select } from "@/components/ui/Field";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { useAdminStore } from "@/lib/admin-store";
import { couponLabel, couponState, normalizeCode, suggestCode, type Coupon } from "@/lib/coupons";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PRODUCTS, PRODUCT_BY_ID, fidgetGrams } from "@/lib/products";
import { parseHours } from "@/lib/costing";
import { useLivePricer, type Priceable } from "@/lib/live-price";
import { FIDGETS } from "@/lib/data";

/** The product's shop name, for the customer's "the code is for …". */
const itemName = (id: string): string | undefined =>
  PRODUCT_BY_ID[id]?.name ?? FIDGETS.find((f) => f.id === id)?.name;

/** Everything a fixed-price code can point at: the shop's products and the fidgets. */
const ITEMS: (Priceable & { name: string })[] = [
  ...PRODUCTS.map((p) => ({ id: p.id, name: p.name, price: p.price, grams: p.grams, hours: p.hours, material: p.material, colors: 1 })),
  ...FIDGETS.map((f) => ({ id: f.id, name: f.name, price: f.price, grams: fidgetGrams(f), hours: parseHours(f.time) })),
].filter((it, i, all) => all.findIndex((x) => x.id === it.id) === i);

/** The id at the end of a pasted address (…/products/mw-123 or …/fidgets/mw-123), or the id alone. */
const idFromText = (t: string): string => t.trim().match(/(mw-\d+|[a-z][a-z0-9-]+)\/?$/i)?.[1] ?? "";

const FILE = "public/coupons.json";

const TONE: Record<string, "good" | "flame" | "neutral"> = {
  "פעיל": "good",
  "כבוי": "neutral",
  "פג תוקף": "neutral",
};

/**
 * Discount codes.
 *
 * A code the shop cannot check is just a promise in a WhatsApp thread, so the
 * list written here is the same list every customer's browser reads at the
 * checkout: type the code, see the money come off, and the order carries it to
 * the message and the confirmation mail. "סיים ועדכן" writes it to the site.
 */
export default function CouponsTab() {
  const coupons = useAdminStore((s) => s.coupons);
  const saveCoupon = useAdminStore((s) => s.saveCoupon);
  const toggleCoupon = useAdminStore((s) => s.toggleCoupon);
  const removeCoupon = useAdminStore((s) => s.removeCoupon);

  const [code, setCode] = useState(suggestCode());
  const [kind, setKind] = useState<Coupon["kind"]>("percent");
  const [value, setValue] = useState("10");
  const [until, setUntil] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [note, setNote] = useState("");
  const [itemId, setItemId] = useState("");
  const [query, setQuery] = useState("");
  // The price the customer sees today, so "₪15 instead of …" is the real saving.
  const priced = useLivePricer();
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const byId = ITEMS.find((it) => it.id === idFromText(q));
    if (byId) return [byId];
    return ITEMS.filter((it) => it.name.toLowerCase().includes(q) || it.id.includes(q)).slice(0, 8);
  }, [query]);
  const chosen = ITEMS.find((it) => it.id === itemId);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  const add = () => {
    const clean = normalizeCode(code);
    const v = Number(value);
    if (clean.length < 3) { setErr("קוד קצר מדי."); return; }
    if (!Number.isFinite(v) || v <= 0) { setErr("ההנחה חייבת להיות מספר גדול מאפס."); return; }
    if (kind === "percent" && v > 90) { setErr("אחוז ההנחה גבוה מדי."); return; }
    // A fixed price needs the product: picked from the search, or pasted as a link.
    const pid = itemId || idFromText(query);
    if (kind === "price" && !pid) { setErr("בחר מוצר מהחיפוש (או הדבק את הקישור שלו)."); return; }
    if (kind === "price" && chosen && v >= priced(chosen)) { setErr(`המחיר הקבוע צריך להיות נמוך מ-${fmtILS(priced(chosen))}.`); return; }
    setErr("");
    saveCoupon({
      code: clean,
      kind,
      value: Math.round(v),
      ...(kind === "price" ? { itemId: pid, itemName: itemName(pid) } : {}),
      until: until || undefined,
      minTotal: minTotal ? Math.round(Number(minTotal)) : undefined,
      note: note.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    });
    setCode(suggestCode());
    setValue(kind === "percent" ? "10" : "20");
    setNote("");
    setItemId("");
    setQuery("");
  };

  const copy = (c: string) => {
    navigator.clipboard?.writeText(c).then(() => {
      setCopied(c);
      setTimeout(() => setCopied(""), 1800);
    }, () => {});
  };

  const siteFile = () => `${JSON.stringify(coupons, null, 2)}\n`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black mb-1">קודי הנחה</h2>
        <p className="text-xs text-ink-500">
          קוד שנוצר כאן עובד מיד בעמוד ההזמנה: הלקוח מקליד אותו, ההנחה יורדת מהסכום, והיא מופיעה
          בהודעה שמגיעה אליך ובמייל האישור. &quot;סיים ועדכן&quot; שומר את הרשימה לאתר.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="הקוד" hint="באותיות גדולות">
            <div className="flex gap-2">
              <Input value={code} dir="ltr" onChange={(e) => { setCode(e.target.value); setErr(""); }} />
              <Btn size="sm" variant="ghost" onClick={() => setCode(suggestCode())}>הגרל</Btn>
            </div>
          </Field>
          <Field label="סוג ההנחה">
            <div className="flex gap-2">
              <Select
                value={kind}
                onChange={(e) => {
                  const k = e.target.value as Coupon["kind"];
                  setKind(k);
                  setValue(k === "percent" ? "10" : "20");
                }}
              >
                <option value="percent">אחוזים</option>
                <option value="amount">סכום בשקלים</option>
                <option value="price">מחיר קבוע למוצר אחד (₪)</option>
              </Select>
              <Input
                type="number" min={1} dir="ltr" className="w-28"
                value={value}
                onChange={(e) => { setValue(e.target.value); setErr(""); }}
              />
            </div>
          </Field>
          {kind === "price" && (
            <Field label="המוצר" hint="חיפוש לפי שם, או הדבקת קישור">
              {chosen ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-flame/60 bg-flame/5">
                  <span className="text-sm font-bold truncate">{chosen.name}</span>
                  <span className="text-[11px] text-ink-500 whitespace-nowrap">במקום <bdi dir="ltr">{fmtILS(priced(chosen))}</bdi></span>
                  <span className="flex-1" />
                  <button type="button" onClick={() => { setItemId(""); setQuery(""); }} className="text-[11px] text-ink-400 hover:text-ink-100 underline">
                    החלפה
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="מעבר בקבוק שמן · דרקון · unit-3d.com/fidgets/mw-…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setErr(""); }}
                    aria-label="חיפוש מוצר"
                  />
                  {matches.length > 0 && (
                    <div className="absolute z-20 inset-x-0 top-full mt-1 rounded-xl border border-ink-800 bg-ink-950 shadow-xl max-h-64 overflow-y-auto">
                      {matches.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => { setItemId(it.id); setQuery(""); setErr(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-start text-sm hover:bg-ink-900"
                        >
                          <span className="truncate">{it.name}</span>
                          <span className="flex-1" />
                          <span className="font-mono text-[12px] text-ink-400" dir="ltr">{fmtILS(priced(it))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
          )}
          <Field label="בתוקף עד" optional>
            <Input type="date" dir="ltr" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          <Field label="מהזמנה של (₪)" optional>
            <Input type="number" min={0} dir="ltr" value={minTotal} onChange={(e) => setMinTotal(e.target.value)} />
          </Field>
        </div>
        <Field label="למה הקוד" optional hint="רק אתה רואה את זה">
          <Input placeholder="יריד חנוכה · פלוגה ב׳ · פיצוי על איחור" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex items-center gap-2">
          <Btn size="sm" icon="plus" onClick={add}>יצירת קוד</Btn>
          {err && <span className="text-xs text-bad">{err}</span>}
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">
          עדיין אין קודים. הראשון נוצר למעלה.
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const state = couponState(c);
            return (
              <div key={c.code} className="rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy(c.code)}
                    title="העתקה"
                    className="font-mono text-sm text-flame hover:underline"
                    dir="ltr"
                  >
                    {c.code}
                  </button>
                  {copied === c.code && <span className="text-[11px] text-good">הועתק</span>}
                  <Pill tone={TONE[state]} className="text-[10px]">{state}</Pill>
                  <span className="text-sm font-bold">{couponLabel(c)}</span>
                  {c.minTotal ? <span className="text-[11px] text-ink-500">מ־{fmtILS(c.minTotal)}</span> : null}
                  {c.until && <span className="text-[11px] text-ink-500">עד {c.until}</span>}
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => toggleCoupon(c.code)}
                    className={cn(
                      "px-2.5 h-8 rounded-lg text-xs border",
                      c.active ? "border-ink-700 text-ink-300 hover:border-ink-600" : "border-good text-good bg-good/10",
                    )}
                  >
                    {c.active ? "כיבוי" : "הפעלה"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCoupon(c.code)}
                    title="מחיקה"
                    className="text-ink-600 hover:text-bad"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
                {c.note && <div className="text-[11px] text-ink-500 mt-1">{c.note}</div>}
              </div>
            );
          })}
        </div>
      )}

      <AdminSaveToSite json={siteFile} path={FILE} title="סיים ועדכן" what="קודי ההנחה" />
    </div>
  );
}
