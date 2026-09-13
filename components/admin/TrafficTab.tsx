"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import { Input } from "@/components/ui/Field";
import { useSupabaseSession } from "@/lib/use-supabase-session";
import { readEvents, type SiteEvent } from "@/lib/analytics";
import { cn } from "@/lib/cn";

const RANGES = [
  { days: 7, label: "7 ימים" },
  { days: 30, label: "30 יום" },
  { days: 90, label: "90 יום" },
];

const SOURCE_HE: Record<string, string> = {
  direct: "ישירות",
  google: "חיפוש בגוגל",
  search: "מנוע חיפוש",
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  tiktok: "טיקטוק",
  whatsapp: "וואטסאפ",
  twitter: "X / טוויטר",
  youtube: "יוטיוב",
  linkedin: "לינקדאין",
  telegram: "טלגרם",
  makerworld: "מייקרוורלד",
  internal: "מתוך האתר",
  other: "אחר",
};

const DEVICE_HE: Record<string, string> = { phone: "טלפון", tablet: "טאבלט", desktop: "מחשב" };

const EVENT_HE: Record<string, string> = {
  page_view: "צפייה בעמוד",
  product_open: "פתיחת מוצר",
  shelf_open: "פתיחת מדף",
  whatsapp_click: "לחיצה על וואטסאפ",
  order_start: "התחלת הזמנה",
  order_sent: "הזמנה נשלחה",
  configurator_open: "פתיחת המעצב",
  review_sent: "ביקורת נשלחה",
  live_open: "צפייה בלייב",
  search: "חיפוש",
};

const he = (m: Record<string, string>, k: string) => m[k] ?? k;
const day = (iso: string) => iso.slice(0, 10);

/** Counts by key, biggest first. */
function tally<T>(rows: T[], key: (r: T) => string | null | undefined): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40">
      <div className="text-[11px] text-ink-400 mb-1">{label}</div>
      <div className="font-mono text-2xl font-black text-flame leading-none" dir="ltr">{value}</div>
      {sub && <div className="text-[11px] text-ink-500 mt-1.5">{sub}</div>}
    </div>
  );
}

/** A list with a bar behind each row, so the shape is readable at a glance. */
function Bars({ title, rows, label, empty }: {
  title: string;
  rows: [string, number][];
  label?: (k: string) => string;
  empty: string;
}) {
  const top = rows.slice(0, 8);
  const max = top[0]?.[1] ?? 1;
  return (
    <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40">
      <div className="font-bold text-sm mb-3">{title}</div>
      {top.length === 0 ? (
        <p className="text-xs text-ink-500">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {top.map(([k, n]) => (
            <div key={k} className="text-xs">
              <div className="flex items-center justify-between gap-3 mb-0.5">
                <span className="truncate text-ink-200">{label ? label(k) : k}</span>
                <span className="font-mono text-ink-400 shrink-0" dir="ltr">{n}</span>
              </div>
              <span className="block h-1.5 rounded-full bg-ink-800 overflow-hidden">
                <span className="block h-full bg-flame/70" style={{ width: `${Math.round((n / max) * 100)}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A day-by-day column chart of visits. */
function Days({ rows, days }: { rows: SiteEvent[]; days: number }) {
  // The axis ends at the last event, not at the wall clock. Reading the clock
  // while rendering makes the same render give different answers; anchoring on
  // the data needs no clock at all, and "the last day something happened" is
  // the more honest right-hand edge anyway.
  const byDay = useMemo(() => {
    const visits = new Map<string, Set<string>>();
    for (const r of rows) {
      const d = day(r.created_at);
      if (!visits.has(d)) visits.set(d, new Set());
      visits.get(d)!.add(r.visit);
    }
    const last = rows.reduce((mx, r) => (r.created_at > mx ? r.created_at : mx), rows[0]?.created_at ?? "");
    if (!last) return [];
    const end = new Date(`${day(last)}T12:00:00Z`).getTime();

    const out: { d: string; n: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ d, n: visits.get(d)?.size ?? 0 });
    }
    return out;
  }, [rows, days]);

  const max = Math.max(1, ...byDay.map((x) => x.n));
  return (
    <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40">
      <div className="font-bold text-sm mb-3">מבקרים ליום</div>
      <div className="flex items-end gap-[3px] h-28" dir="ltr">
        {byDay.map((x) => (
          <div key={x.d} className="flex-1 min-w-[2px] group relative">
            <div
              className="w-full bg-flame/70 hover:bg-flame rounded-t-sm transition-colors"
              style={{ height: `${Math.max(2, Math.round((x.n / max) * 112))}px` }}
              title={`${x.d}: ${x.n}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-ink-500 font-mono" dir="ltr">
        <span>{byDay[0]?.d.slice(5)}</span>
        <span>{byDay[byDay.length - 1]?.d.slice(5)}</span>
      </div>
    </div>
  );
}

/**
 * What the shop's traffic actually looks like.
 *
 * Until now there was no answer to "כמה אנשים נכנסו השבוע" or "מאיפה הם
 * הגיעו" — every decision about the site was a guess. Everything here is the
 * shop's own data, written by visitors' browsers into the same Supabase
 * project as the orders. No Google Analytics, no third party, nothing sold on.
 *
 * The owner's own browsing is not counted: while the admin is unlocked the
 * tracker is muted, so his twenty visits a day do not drown the real ones.
 */
export default function TrafficTab() {
  const { token, email, setEmail, busy: authBusy, error: authErr, setError: setAuthErr, tried, signIn, signOut } =
    useSupabaseSession();
  const [pw, setPw] = useState("");
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<SiteEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (t: string, d: number) => {
    setLoaded(false);
    const r = await readEvents(t, d);
    setRows(r);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void readEvents(token, days).then((r) => {
      if (!alive) return;
      setRows(r);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [token, days]);

  const views = useMemo(() => rows.filter((r) => r.name === "page_view"), [rows]);
  const visitors = useMemo(() => new Set(rows.map((r) => r.visit)).size, [rows]);
  const orders = useMemo(() => rows.filter((r) => r.name === "order_sent").length, [rows]);
  const waClicks = useMemo(() => rows.filter((r) => r.name === "whatsapp_click").length, [rows]);
  const perVisit = visitors ? (views.length / visitors).toFixed(1) : "0";
  const conversion = visitors ? ((orders / visitors) * 100).toFixed(1) : "0";

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-bold">תנועה באתר</div>
        <p className="text-[11px] text-ink-500 mt-0.5">
          מי נכנס, מאיפה הגיע ומה לחץ. הגלישה שלך לא נספרת.
        </p>
      </div>
      {token && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-ink-700 p-0.5 bg-ink-950">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={cn(
                  "px-2.5 h-7 rounded-md text-xs font-semibold transition-colors",
                  days === r.days ? "bg-flame-600 text-white" : "text-ink-300 hover:text-ink-50",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Btn size="sm" variant="ghost" onClick={() => void load(token, days)}>רענן</Btn>
          <Btn size="sm" variant="ghost" onClick={() => { signOut(); setRows([]); setLoaded(false); }}>יציאה</Btn>
        </div>
      )}
    </div>
  );

  if (!token) {
    return (
      <div className="space-y-4">
        {header}
        {!tried ? (
          <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div>
        ) : (
          <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3 max-w-sm">
            <div className="text-sm font-bold">כניסה</div>
            <p className="text-[11px] text-ink-500">אותה כניסה של ההזמנות.</p>
            <Input type="email" dir="ltr" placeholder="מייל" value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthErr(""); }} />
            <Input type="password" dir="ltr" placeholder="סיסמה" value={pw}
              onChange={(e) => { setPw(e.target.value); setAuthErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void signIn(email, pw).then((ok) => ok && setPw("")); }} />
            <div className="flex items-center gap-2">
              <Btn size="sm" onClick={() => void signIn(email, pw).then((ok) => ok && setPw(""))} disabled={authBusy || !email.trim() || !pw}>
                {authBusy ? "רגע…" : "כניסה"}
              </Btn>
              {authErr && <span className="text-xs text-bad">{authErr}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!loaded) {
    return <div className="space-y-4">{header}<div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div></div>;
  }

  if (!rows.length) {
    return (
      <div className="space-y-4">
        {header}
        <div className="p-8 rounded-2xl border border-dashed border-ink-700 text-center">
          <p className="text-ink-100 font-semibold mb-2">עוד אין נתונים.</p>
          <p className="text-sm text-ink-400 max-w-md mx-auto leading-relaxed">
            או שהטבלה עוד לא נוצרה ב-Supabase (ה-SQL נמצא ב-<span dir="ltr" className="font-mono text-xs">docs/analytics-table.md</span>),
            או שעוד לא נכנס אף אחד מאז שזה עלה. זכור שהגלישה שלך עצמך לא נספרת.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="מבקרים" value={visitors} sub={`${days} ימים אחרונים`} />
        <Stat label="צפיות בעמודים" value={views.length} sub={`${perVisit} לכל מבקר`} />
        <Stat label="לחצו וואטסאפ" value={waClicks} />
        <Stat label="הזמנות נשלחו" value={orders} />
        <Stat label="המרה" value={`${conversion}%`} sub="מבקר שהזמין" />
      </div>

      <Days rows={rows} days={days} />

      <div className="grid md:grid-cols-2 gap-3">
        <Bars title="מאיפה הגיעו" rows={tally(rows.filter((r) => r.name === "page_view"), (r) => r.source)}
          label={(k) => he(SOURCE_HE, k)} empty="—" />
        <Bars title="העמודים הנצפים" rows={tally(views, (r) => r.path)} empty="—" />
        <Bars title="המוצרים שנפתחו" rows={tally(rows.filter((r) => r.name === "product_open"), (r) => String(r.props?.name ?? r.props?.id ?? ""))}
          empty="עוד לא נפתח מוצר" />
        <Bars title="קמפיינים מתויגים" rows={tally(rows, (r) => r.utm_campaign)}
          empty="אף קישור עם utm_campaign עוד לא הובא" />
        <Bars title="מכשירים" rows={tally(rows, (r) => r.device)} label={(k) => he(DEVICE_HE, k)} empty="—" />
        <Bars title="מה קרה באתר" rows={tally(rows, (r) => r.name)} label={(k) => he(EVENT_HE, k)} empty="—" />
      </div>

      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40">
        <div className="font-bold text-sm mb-3">האחרונים</div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {rows.slice(0, 40).map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-mono text-ink-500 shrink-0" dir="ltr">
                {new Date(r.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <Pill tone="neutral">{he(EVENT_HE, r.name)}</Pill>
              <span className="text-ink-300 truncate" dir="ltr">{r.path}</span>
              <span className="text-ink-500">· {he(SOURCE_HE, r.source)}</span>
              <span className="text-ink-600">· {he(DEVICE_HE, r.device)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
