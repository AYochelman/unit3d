"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import { Input, Textarea } from "@/components/ui/Field";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { useAdminStore } from "@/lib/admin-store";
import {
  DELIVERY_BY_ID, decodeOrder, orderTotal, parseOrderMessage,
  type OrderDecision, type PlacedOrder,
} from "@/lib/orders";
import { adminDecide, adminOrders, adminSignIn, isConfigured, sendOrderEmail, shopConfig, type ShopConfig } from "@/lib/orders-remote";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

const FILE = "public/orders.json";

const DECISION: { id: OrderDecision; label: string; tone: string }[] = [
  { id: "approved", label: "אישור", tone: "border-good text-good bg-good/10" },
  { id: "rejected", label: "דחייה", tone: "border-bad text-bad bg-bad/10" },
  { id: "refunded", label: "החזר", tone: "border-amber-400 text-amber-300 bg-amber-400/10" },
];

const LABEL: Record<OrderDecision, string> = {
  pending: "ממתין",
  approved: "אושר",
  rejected: "נדחה",
  refunded: "הוחזר",
};

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
};

/**
 * The orders customers placed.
 *
 * They arrive here on their own: the customer's browser writes the order to the
 * shop's table as it sends the WhatsApp message, so by the time Ariel sits down
 * the queue is already waiting. He answers the customer from his phone and
 * decides here — open an order by its number, read what it actually is, and
 * approve, reject or mark refunded with a note. The decision goes back to the
 * same row, so it holds on every device and outlives the tab.
 *
 * Reading an order means reading someone's name, phone and mail, so the table
 * only opens to a signed-in user: hence the sign-in below. The two older roads
 * — a link in the message, or the message pasted by hand — still work, and are
 * what the shop falls back to if the queue is unreachable.
 */
export default function OrdersTab() {
  const localOrders = useAdminStore((s) => s.orders);
  const addOrder = useAdminStore((s) => s.addOrder);
  const decideLocal = useAdminStore((s) => s.decideOrder);
  const removeLocal = useAdminStore((s) => s.removeOrder);

  const params = useSearchParams();

  const [cfg, setCfg] = useState<ShopConfig | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [remote, setRemote] = useState<PlacedOrder[]>([]);
  const [loadErr, setLoadErr] = useState("");

  const [openRef, setOpenRef] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [only, setOnly] = useState<"open" | "all">("open");

  // A way to prove the confirmation mail works without inventing an order.
  const [testTo, setTestTo] = useState("");
  const [testState, setTestState] = useState<"" | "sending" | "sent" | "failed" | "not-configured" | "no-address">("");

  const sendTest = async () => {
    setTestState("sending");
    const now = new Date();
    const r = await sendOrderEmail({
      ref: `UNIT3D-TEST${now.getMinutes()}${now.getSeconds()}`,
      at: now.toISOString(),
      customer: { name: "בדיקה", phone: "050-930-0990", email: testTo.trim(), kind: "לקוח פרטי" },
      inquiry: "בדיקת מערכת",
      delivery: "pickup",
      note: "מייל בדיקה מהאדמין — אין כאן הזמנה אמיתית.",
      lines: [{
        title: "ספינר אוויר · 60mm",
        summary: ["חומר: PLA רגיל", "צבע: שחור", "זמן הדפסה: 1h"],
        qty: 1,
        price: 15,
      }],
      itemsTotal: 15,
    });
    setTestState(r);
  };

  const [manual, setManual] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteErr, setPasteErr] = useState(false);

  useEffect(() => { void shopConfig().then(setCfg); }, []);

  // An order that still travels inside a link files itself, once.
  const arrived = useMemo(() => decodeOrder(params?.get("order")), [params]);
  useEffect(() => { if (arrived) addOrder(arrived); }, [arrived, addOrder]);

  const load = useCallback(async (t: string) => {
    setLoadErr("");
    try {
      setRemote(await adminOrders(t));
    } catch {
      setLoadErr("לא הצלחתי למשוך את ההזמנות. נסה להתחבר שוב.");
    }
  }, []);

  const signIn = async () => {
    setBusy(true);
    setAuthErr("");
    const t = await adminSignIn(email.trim(), pw);
    setBusy(false);
    if (!t) { setAuthErr("המייל או הסיסמה לא נכונים."); return; }
    setToken(t);
    setPw("");
    await load(t);
  };

  // The queue, plus anything that came in by link or by hand and is not in it.
  const orders = useMemo(() => {
    const seen = new Set(remote.map((o) => o.ref));
    return [...remote, ...localOrders.filter((o) => !seen.has(o.ref))];
  }, [remote, localOrders]);

  const isRemote = useCallback((ref: string) => remote.some((o) => o.ref === ref), [remote]);

  const shown = useMemo(
    () => (only === "open" ? orders.filter((o) => (o.decision ?? "pending") === "pending") : orders),
    [orders, only],
  );
  const open = orders.filter((o) => (o.decision ?? "pending") === "pending").length;

  const decide = async (o: PlacedOrder, d: OrderDecision) => {
    const note = notes[o.ref] ?? o.decisionNote ?? "";
    if (isRemote(o.ref) && token) {
      setRemote((rows) =>
        rows.map((r) =>
          r.ref === o.ref
            ? { ...r, decision: d, decisionNote: note, decidedAt: d === "pending" ? undefined : new Date().toISOString() }
            : r,
        ),
      );
      const ok = await adminDecide(token, o.ref, d, note);
      if (!ok) { setLoadErr("ההחלטה לא נשמרה. נסה שוב."); await load(token); }
      return;
    }
    decideLocal(o.ref, d, note);
  };

  const file = () => {
    const order = parseOrderMessage(paste);
    if (!order) { setPasteErr(true); return; }
    addOrder(order);
    setPaste("");
    setPasteErr(false);
  };

  const needsSetup = cfg !== null && !isConfigured(cfg);
  const siteFile = () => `${JSON.stringify(localOrders, null, 2)}\n`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black mb-1">הזמנות</h2>
        <p className="text-xs text-ink-500">
          כל הזמנה נכנסת לכאן לבד ברגע שהלקוח שולח אותה. פותחים לפי מספר הזמנה, רואים את כל
          הפירוט — ומאשרים, דוחים או מסמנים החזר, עם הערה.
        </p>
      </div>

      {needsSetup && (
        <div className="p-3 rounded-xl border border-amber-400/40 bg-amber-400/10 text-xs text-amber-200">
          מאגר ההזמנות עוד לא חובר. עד אז הזמנה מגיעה רק בוואטסאפ, ואפשר לקלוט אותה ידנית למטה.
        </div>
      )}

      {!needsSetup && !token && (
        <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3 max-w-sm">
          <div className="text-sm font-bold">כניסה להזמנות</div>
          <p className="text-[11px] text-ink-500">
            בהזמנות יש שם, טלפון ומייל של לקוחות — לכן הן נפתחות רק אחרי כניסה.
          </p>
          <Input
            type="email" dir="ltr" placeholder="מייל" value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password" dir="ltr" placeholder="סיסמה" value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void signIn(); }}
          />
          <div className="flex items-center gap-2">
            <Btn size="sm" onClick={() => void signIn()} disabled={busy || !email.trim() || !pw}>
              {busy ? "רגע…" : "כניסה"}
            </Btn>
            {authErr && <span className="text-xs text-bad">{authErr}</span>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {([["open", `ממתינות (${open})`], ["all", `הכל (${orders.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setOnly(id)}
            className={cn(
              "px-2.5 h-9 rounded-lg text-xs border",
              only === id ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-400 hover:border-ink-700",
            )}
          >
            {label}
          </button>
        ))}
        <span className="flex-1" />
        {token && (
          <Btn size="sm" variant="ghost" icon="rotate" onClick={() => void load(token)}>רענון</Btn>
        )}
      </div>

      {loadErr && <div className="text-xs text-bad">{loadErr}</div>}

      {shown.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">
          {orders.length ? "אין הזמנות ממתינות." : token || needsSetup ? "עדיין לא נכנסה הזמנה." : "התחבר כדי לראות את ההזמנות."}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((o) => (
            <OrderRow
              key={o.ref}
              order={o}
              open={openRef === o.ref}
              onToggle={() => setOpenRef(openRef === o.ref ? null : o.ref)}
              note={notes[o.ref] ?? o.decisionNote ?? ""}
              onNote={(v) => setNotes((n) => ({ ...n, [o.ref]: v }))}
              onDecide={(d) => void decide(o, d)}
              onRemove={isRemote(o.ref) ? null : () => removeLocal(o.ref)}
            />
          ))}
        </div>
      )}

      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-2">
        <div className="text-xs font-bold text-ink-300">בדיקת מייל האישור</div>
        <p className="text-[11px] text-ink-500">
          שולח לכתובת שתקליד את אותו מייל בדיוק שלקוח מקבל אחרי הזמנה — בלי ליצור הזמנה.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="email" dir="ltr" placeholder="you@example.com" className="max-w-xs"
            value={testTo}
            onChange={(e) => { setTestTo(e.target.value); setTestState(""); }}
          />
          <Btn size="sm" variant="ghost" onClick={() => void sendTest()} disabled={!testTo.includes("@") || testState === "sending"}>
            {testState === "sending" ? "שולח…" : "שליחת בדיקה"}
          </Btn>
          {testState === "sent" && <span className="text-xs text-good">נשלח. אם לא הגיע — לבדוק בספאם.</span>}
          {testState === "failed" && <span className="text-xs text-bad">השליחה נכשלה. בדוק את הרשימה המורשית ב-EmailJS.</span>}
          {testState === "not-configured" && <span className="text-xs text-bad">EmailJS עוד לא מחובר.</span>}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setManual(!manual)}
          className="text-[11px] text-ink-500 hover:text-ink-300 underline"
        >
          קליטה ידנית מהודעת וואטסאפ {manual ? "▲" : "▼"}
        </button>
        {manual && (
          <div className="mt-2 p-3 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-2">
            <p className="text-[11px] text-ink-500">
              גיבוי בלבד — אם הזמנה לא נכנסה לבד, הדבק כאן את ההודעה שקיבלת.
            </p>
            <Textarea
              rows={4} dir="rtl" value={paste}
              onChange={(e) => { setPaste(e.target.value); setPasteErr(false); }}
              placeholder="הדבק כאן את ההודעה"
            />
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="ghost" onClick={file} disabled={!paste.trim()}>קליטת הזמנה</Btn>
              {pasteErr && <span className="text-xs text-bad">לא זוהתה הזמנה בהודעה הזו.</span>}
            </div>
            {localOrders.length > 0 && (
              <AdminSaveToSite json={siteFile} path={FILE} title="שמירת הזמנות ידניות" what="ההזמנות שנקלטו ידנית" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderRow({
  order: o, open, onToggle, note, onNote, onDecide, onRemove,
}: {
  order: PlacedOrder;
  open: boolean;
  onToggle: () => void;
  note: string;
  onNote: (v: string) => void;
  onDecide: (d: OrderDecision) => void;
  onRemove: (() => void) | null;
}) {
  const d = DELIVERY_BY_ID[o.delivery];
  const total = orderTotal(o);
  const state = o.decision ?? "pending";

  return (
    <div className={cn("rounded-2xl border bg-ink-900 overflow-hidden", open ? "border-flame/50" : "border-ink-800")}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex flex-wrap items-center gap-2 px-4 py-3 text-right hover:bg-ink-800/40 transition-colors"
      >
        <Icon name={open ? "minus" : "chevDown"} size={14} className="text-ink-500" />
        <span className="font-mono text-sm text-flame" dir="ltr">{o.ref}</span>
        <Pill tone={state === "approved" ? "good" : state === "pending" ? "flame" : "neutral"} className="text-[10px]">
          {LABEL[state]}
        </Pill>
        <span className="text-sm text-ink-200">{o.customer.name || o.customer.phone || "—"}</span>
        <span className="text-[11px] text-ink-500">{when(o.at)}</span>
        <span className="flex-1" />
        <span className="text-[11px] text-ink-500">{o.lines.length} פריטים</span>
        <span className="font-black">{total == null ? "לפי הזמנה" : fmtILS(total)}</span>
      </button>

      {open && (
        <>
          <div className="p-4 grid md:grid-cols-2 gap-4 text-sm border-t border-ink-800">
            <div className="space-y-1">
              <div className="text-[11px] font-mono tracking-widest uppercase text-ink-500 mb-1.5">הלקוח</div>
              <div className="font-bold text-ink-50">{o.customer.name || o.customer.phone || "—"}</div>
              <a href={`tel:${o.customer.phone}`} className="block text-cyan2 hover:underline" dir="ltr">{o.customer.phone}</a>
              {o.customer.email && <a href={`mailto:${o.customer.email}`} className="block text-ink-300 hover:underline" dir="ltr">{o.customer.email}</a>}
              <div className="text-ink-400">{o.customer.kind}{o.inquiry ? ` · ${o.inquiry}` : ""}</div>
              {o.customer.unit && <div className="text-ink-400">יחידה: {o.customer.unit}</div>}
              {o.customer.company && <div className="text-ink-400">{o.customer.company}</div>}
              {o.discount && (
                <div className="pt-1">
                  הנחה: <span className="text-good font-mono" dir="ltr">{o.discount.code}</span>
                  <span className="text-ink-500"> · {o.discount.label} · -{fmtILS(o.discount.off)}</span>
                </div>
              )}
              <div className="pt-1">
                מסירה: <span className="text-ink-100">{d.label}</span>
                <span className="text-ink-500"> · {d.price ? fmtILS(d.price) : "חינם"} · {d.note}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-mono tracking-widest uppercase text-ink-500">ההזמנה</div>
              {o.lines.length === 0 && <div className="text-ink-400">פנייה בלי פריטים — ראה הערות.</div>}
              {o.lines.map((l, i) => (
                <div key={`${l.title}-${i}`} className="rounded-lg border border-ink-800 p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink-50">{l.title}{l.qty > 1 ? ` × ${l.qty}` : ""}</span>
                    <span className="font-mono text-xs">{l.price == null ? "לפי הזמנה" : fmtILS(l.price)}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-ink-400">
                    {l.summary.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
              ))}
              {o.note && (
                <div className="rounded-lg border border-ink-800 p-2.5">
                  <div className="text-[11px] text-ink-500 mb-0.5">הערות הלקוח</div>
                  <div className="text-ink-200 whitespace-pre-wrap">{o.note}</div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-4 space-y-2">
            <Textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              rows={2}
              placeholder="הערה להחלטה — למה אושר, למה נדחה, על מה ההחזר…"
            />
            <div className="flex flex-wrap gap-2">
              {DECISION.map((x) => (
                <Btn
                  key={x.id}
                  size="sm"
                  variant="ghost"
                  onClick={() => onDecide(x.id)}
                  className={cn(state === x.id && x.tone)}
                >
                  {x.label}
                </Btn>
              ))}
              {state !== "pending" && (
                <Btn size="sm" variant="ghost" onClick={() => onDecide("pending")}>החזרה לממתין</Btn>
              )}
              <span className="flex-1" />
              {onRemove && (
                <button type="button" onClick={onRemove} title="מחיקה" className="text-ink-600 hover:text-bad">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            {o.decidedAt && (
              <div className="text-[11px] text-ink-500">
                {LABEL[state]} · {when(o.decidedAt)}{o.decisionNote ? ` · ${o.decisionNote}` : ""}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
