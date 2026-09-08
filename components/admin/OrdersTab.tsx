"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import { Textarea } from "@/components/ui/Field";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { useAdminStore } from "@/lib/admin-store";
import { DELIVERY_BY_ID, decodeOrder, orderTotal, parseOrderMessage, type OrderDecision, type PlacedOrder } from "@/lib/orders";
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
 * There is no server, so an order reaches this page the way it reaches Ariel:
 * the customer's message carries a link, and opening it once files the whole
 * record here. From then on it is his — approve, reject, or mark refunded, with
 * a note — and "סיים ועדכן" writes the list to the repository like every other
 * tab, so a decision survives the session and the next device.
 */
export default function OrdersTab() {
  const orders = useAdminStore((s) => s.orders);
  const addOrder = useAdminStore((s) => s.addOrder);
  const decideOrder = useAdminStore((s) => s.decideOrder);
  const removeOrder = useAdminStore((s) => s.removeOrder);

  const params = useSearchParams();
  const filed = useRef<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [only, setOnly] = useState<"open" | "all">("open");
  const [paste, setPaste] = useState("");
  const [pasted, setPasted] = useState<string | null>(null);
  const [pasteErr, setPasteErr] = useState(false);

  // The message the customer sent, filed. It is the whole order — /admin reads
  // back exactly what the shop wrote — so pasting it here is the intake.
  const file = () => {
    const order = parseOrderMessage(paste);
    if (!order) { setPasteErr(true); setPasted(null); return; }
    addOrder(order);
    setPaste("");
    setPasteErr(false);
    setPasted(order.ref);
  };

  // An order arrives as ?order=… on the link inside the WhatsApp message. The
  // banner is derived from the link rather than remembered, so filing it is the
  // only thing the effect does.
  const arrived = useMemo(() => decodeOrder(params?.get("order")), [params]);
  useEffect(() => {
    const raw = params?.get("order");
    if (!raw || filed.current === raw || !arrived) return;
    filed.current = raw;
    addOrder(arrived);
  }, [params, arrived, addOrder]);

  const shown = useMemo(
    () => (only === "open" ? orders.filter((o) => (o.decision ?? "pending") === "pending") : orders),
    [orders, only],
  );
  const open = orders.filter((o) => (o.decision ?? "pending") === "pending").length;

  const siteFile = () => `${JSON.stringify(orders, null, 2)}\n`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black mb-1">הזמנות</h2>
        <p className="text-xs text-ink-500">
          כל הזמנה מגיעה אליך בוואטסאפ. מעתיקים את ההודעה, מדביקים אותה כאן ולוחצים
          &quot;קליטת הזמנה&quot; — ומכאן אתה מאשר, דוחה או מסמן החזר, עם הערה.
          &quot;סיים ועדכן&quot; שומר את ההחלטות לאתר.
        </p>
      </div>

      {arrived && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-good/40 bg-good/10 text-sm">
          <Icon name="check" size={16} className="text-good" />
          הזמנה <span className="font-mono" dir="ltr">{arrived.ref}</span> נקלטה.
        </div>
      )}

      <div className="p-3 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-2">
        <div className="text-xs font-bold text-ink-300">קליטת הזמנה מהוואטסאפ</div>
        <Textarea
          rows={5}
          dir="rtl"
          value={paste}
          onChange={(e) => { setPaste(e.target.value); setPasteErr(false); }}
          placeholder="הדבק כאן את ההודעה שקיבלת"
        />
        <div className="flex items-center gap-2">
          <Btn size="sm" onClick={file} disabled={!paste.trim()}>קליטת הזמנה</Btn>
          {pasteErr && <span className="text-xs text-bad">לא זוהתה הזמנה בהודעה הזו.</span>}
          {pasted && !pasteErr && (
            <span className="text-xs text-good">
              הזמנה <span className="font-mono" dir="ltr">{pasted}</span> נקלטה.
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1">
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
      </div>

      {shown.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">
          {orders.length ? "אין הזמנות ממתינות." : "עדיין לא נקלטה הזמנה. הדבק למעלה את ההודעה שקיבלת בוואטסאפ."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <OrderCard
              key={o.ref}
              order={o}
              note={notes[o.ref] ?? o.decisionNote ?? ""}
              onNote={(v) => setNotes((n) => ({ ...n, [o.ref]: v }))}
              onDecide={(d) => decideOrder(o.ref, d, notes[o.ref] ?? o.decisionNote ?? "")}
              onRemove={() => removeOrder(o.ref)}
            />
          ))}
        </div>
      )}

      <AdminSaveToSite json={siteFile} path={FILE} title="סיים ועדכן" what="ההזמנות וההחלטות" />
    </div>
  );
}

function OrderCard({
  order: o,
  note,
  onNote,
  onDecide,
  onRemove,
}: {
  order: PlacedOrder;
  note: string;
  onNote: (v: string) => void;
  onDecide: (d: OrderDecision) => void;
  onRemove: () => void;
}) {
  const d = DELIVERY_BY_ID[o.delivery];
  const total = orderTotal(o);
  const state = o.decision ?? "pending";

  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-ink-800">
        <span className="font-mono text-sm text-flame" dir="ltr">{o.ref}</span>
        <Pill tone={state === "approved" ? "good" : state === "pending" ? "flame" : "neutral"} className="text-[10px]">
          {LABEL[state]}
        </Pill>
        <span className="text-[11px] text-ink-500">{when(o.at)}</span>
        <span className="flex-1" />
        <span className="font-black">{total == null ? "לפי הזמנה" : fmtILS(total)}</span>
        <button type="button" onClick={onRemove} title="מחיקה" className="text-ink-600 hover:text-bad">
          <Icon name="x" size={14} />
        </button>
      </header>

      <div className="p-4 grid md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-[11px] font-mono tracking-widest uppercase text-ink-500 mb-1.5">הלקוח</div>
          <div className="font-bold text-ink-50">{o.customer.name || o.customer.phone || "—"}</div>
          <a href={`tel:${o.customer.phone}`} className="block text-cyan2 hover:underline" dir="ltr">{o.customer.phone}</a>
          {o.customer.email && <a href={`mailto:${o.customer.email}`} className="block text-ink-300 hover:underline" dir="ltr">{o.customer.email}</a>}
          <div className="text-ink-400">{o.customer.kind}{o.inquiry ? ` · ${o.inquiry}` : ""}</div>
          {o.customer.unit && <div className="text-ink-400">יחידה: {o.customer.unit}</div>}
          {o.customer.company && <div className="text-ink-400">{o.customer.company}</div>}
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
        </div>
        {o.decidedAt && (
          <div className="text-[11px] text-ink-500">
            {LABEL[state]} · {when(o.decidedAt)}{o.decisionNote ? ` · ${o.decisionNote}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
