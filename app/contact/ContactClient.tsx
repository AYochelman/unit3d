"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { modelSourceFromMeta } from "@/lib/model-source";
import { CONTACT, cleanPhone, phoneLooksReal } from "@/lib/contact";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useOrderStore, type CartItem } from "@/lib/order-store";
import { readOrder } from "@/lib/order-link";
import { DELIVERY, makeRef, orderWhatsapp, type DeliveryId, type PlacedOrder } from "@/lib/orders";
import { placeOrder, sendOrderEmail } from "@/lib/orders-remote";
import { PRODUCTS } from "@/lib/products";
import ProductGrid, { productToCard } from "@/components/ProductGrid";
import { makeCoupon, NEXT_ORDER_DISCOUNT } from "@/lib/coupon";
import { fmtILS } from "@/lib/format";
import { discountFor, type AppliedDiscount } from "@/lib/coupons";
import { useAdminStore } from "@/lib/admin-store";
import { cn } from "@/lib/cn";

type CustType = "private" | "soldier" | "b2b";
type Inquiry = "new" | "bulk" | "question" | "modify" | "support";

const CUST_OPTIONS: { id: CustType; label: string }[] = [
  { id: "private", label: "לקוח פרטי" },
  { id: "soldier", label: "חייל/ת" },
  { id: "b2b", label: "חברה / עסק" },
];

const INQUIRY_FOR: Record<CustType, { id: Inquiry; label: string }[]> = {
  private: [
    { id: "new", label: "הזמנה חדשה" },
    { id: "modify", label: "שינוי בהזמנה" },
    { id: "question", label: "שאלה" },
    { id: "support", label: "תמיכה" },
  ],
  soldier: [
    { id: "new", label: "הזמנה חדשה" },
    { id: "bulk", label: "הזמנה לפלוגה" },
    { id: "question", label: "שאלה" },
    { id: "support", label: "תמיכה" },
  ],
  b2b: [
    { id: "bulk", label: "הזמנה בכמות" },
    { id: "new", label: "הזמנה חדשה" },
    { id: "question", label: "שאלה" },
    { id: "support", label: "תמיכה" },
  ],
};

export default function ContactClient() {
  const { items, removeItem, clearCart, setQty, addItem } = useOrderStore();

  // The cart is in memory, so a reload of this page — or opening the link in a
  // new tab — used to lose the order and greet the customer with an empty
  // "what do you need?". The catalogue puts the same order in the link; take it
  // from there when the cart has nothing, and once only.
  const params = useSearchParams();
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || items.length) return;
    const fromLink = readOrder(params?.get("o"));
    if (!fromLink) return;
    restored.current = true;
    addItem(fromLink);
  }, [params, items.length, addItem]);

  const [cust, setCust] = useState<CustType>(
    items.length > 0 ? "private" : "private",
  );
  const initialInquiry: Inquiry = items.length > 0 ? (cust === "b2b" ? "bulk" : "new") : "question";
  const [inquiry, setInquiry] = useState<Inquiry>(initialInquiry);
  const [submitted, setSubmitted] = useState(false);
  // The fields were uncontrolled, so nothing the customer typed ever left the
  // page — the form showed a thank-you and told nobody. They are read now.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [unitName, setUnitName] = useState("");
  const [company, setCompany] = useState("");
  const [vat, setVat] = useState("");
  const [bulkQty, setBulkQty] = useState("");
  const [delivery, setDelivery] = useState<DeliveryId>("pickup");

  // A discount code is checked against the list Ariel wrote in /admin, which
  // every browser loads at boot (CouponsBoot) — so the customer sees the money
  // come off here, not in a WhatsApp negotiation afterwards.
  const codes = useAdminStore((s) => s.coupons);
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);
  const [codeErr, setCodeErr] = useState("");

  const priced = items.every((it) => it.price != null);
  const itemsTotal = priced ? items.reduce((sum, x) => sum + (x.price ?? 0), 0) : null;

  const tryCode = () => {
    const { applied: hit, error } = discountFor(codes, codeInput, itemsTotal);
    setApplied(hit ?? null);
    setCodeErr(hit ? "" : error ?? "");
  };
  const dropCode = () => { setApplied(null); setCodeInput(""); setCodeErr(""); };

  const inquiries = useMemo(() => INQUIRY_FOR[cust], [cust]);
  const [refCode, setRefCode] = useState("");
  // What was actually ordered, kept after the cart is emptied — the thank-you
  // screen needs it to say "similar to what you chose", and an empty cart
  // cannot say that.
  const [ordered, setOrdered] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState("");
  // Whether the order reached the shop's own queue, or only Ariel's phone.
  const [filed, setFiled] = useState<"pending" | "saved" | "failed">("pending");
  // And whether the customer got their own copy.
  const [mailed, setMailed] = useState<"pending" | "sent" | "no-address" | "not-configured" | "failed">("pending");
  const [mailTo, setMailTo] = useState("");
  const [copied, setCopied] = useState(false);

  // Four more from the same shelves, minus what is already on its way.
  const similar = useMemo(() => {
    const bought = new Set(
      ordered.map((it) => (typeof it.meta?.productId === "string" ? it.meta.productId : "")).filter(Boolean),
    );
    if (!bought.size) return [];
    const shelves = new Set(
      PRODUCTS.filter((p) => bought.has(p.id)).flatMap((p) => p.categories ?? [p.category]),
    );
    if (!shelves.size) return [];
    return PRODUCTS.filter(
      (p) => !bought.has(p.id) && !!p.image && (p.categories ?? [p.category]).some((c) => shelves.has(c)),
    )
      .slice(0, 4)
      .map(productToCard);
  }, [ordered]);

  if (submitted) {
    // An order and a question are not the same moment. Someone who just bought
    // is told the work has started, handed their discount for next time, and
    // shown where to keep looking; someone who asked a question is not sold to.
    const bought = ordered.length > 0;
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-good/15 text-good mb-6">
            <Icon name="check" size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest mb-4">
            {bought ? "תודה על הקנייה!" : "תודה! קיבלתי את הפנייה."}
          </h1>
          <p className="text-ink-300 text-base md:text-lg max-w-xl mx-auto mb-8">
            {bought
              ? "אנחנו מיד מתחילים לעבוד על זה. אני מעדכן אותך בוואטסאפ ברגע שההדפסה עולה על הפלטה."
              : cust === "b2b"
                ? "אני חוזר אליך תוך 24 שעות עם הצעת מחיר מפורטת, mock-up דיגיטלי, ולוז ייצור."
                : "אני חוזר אליך תוך 24 שעות בוואטסאפ. אם זה דחוף — אפשר לקפוץ ישר לשם."}
          </p>
        </div>

        {bought && coupon && (
          <div className="max-w-xl mx-auto mb-10 rounded-2xl border border-flame/40 bg-flame/5 p-5 text-center">
            <div className="font-bold text-lg mb-1">
              {Math.round(NEXT_ORDER_DISCOUNT * 100)}% הנחה על הקנייה הבאה שלך
            </div>
            <p className="text-sm text-ink-300 mb-4">
              הקוד שלך שמור. תגיד אותו בוואטסאפ בהזמנה הבאה וההנחה תרד מהמחיר.
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(coupon).then(
                  () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
                  () => {},
                );
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-950 border border-dashed border-flame/60 font-mono text-lg tracking-widest text-flame hover:bg-flame/10 transition-colors"
              dir="ltr"
            >
              {coupon}
              <Icon name={copied ? "check" : "file"} size={14} />
            </button>
            <div className="mt-2 text-[11px] text-ink-500">{copied ? "הועתק" : "לחיצה מעתיקה"}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          {bought && (
            <Btn as="a" href="/trendy" icon="arrowLeft">
              המשך לקנות
            </Btn>
          )}
          <Btn as="a" href="/livestream" variant={bought ? "outline" : "primary"} icon="play">
            צפה בלייב
          </Btn>
          <Btn as="a" href={CONTACT.whatsapp} variant="ghost" icon="whatsapp">
            פתח וואטסאפ
          </Btn>
        </div>

        {bought && similar.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-black tracking-tightest mb-1">
              דומים למה שבחרת
            </h2>
            <p className="text-sm text-ink-400 mb-5">
              מאותם מדפים. אם משהו מוצא חן — אפשר להוסיף אותו לאותה הדפסה.
            </p>
            <ProductGrid cards={similar} />
          </section>
        )}

        <div className="text-center space-y-1">
          <div className="font-mono text-[11px] tracking-widest text-ink-500" dir="ltr">
            REF · {refCode}
          </div>
          {/* The two writes that happen after the screen swaps — the order row
              and the confirmation mail — now say so while they are in flight
              instead of only once they finish. Real state, not a fake delay. */}
          {(filed === "pending" || mailed === "pending") && (
            <div className="inline-flex items-center gap-2 text-[11px] text-ink-400">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none"
              />
              <span>שומר את ההזמנה…</span>
            </div>
          )}
          {mailed === "sent" && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-good">
              <Icon name="check" size={12} strokeWidth={3} />
              <span className="text-ink-400">
                אישור הזמנה עם כל הפירוט נשלח אליך למייל <span dir="ltr">{mailTo}</span>.
              </span>
            </div>
          )}
          {(filed === "failed" || mailed === "failed") && (
            <div className="text-[11px] text-ink-500">
              ההזמנה נשלחה בוואטסאפ. שמור את מספר ההזמנה — הוא כל מה שצריך כדי לאתר אותה.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8">
        <Pill tone="flame" className="mb-3">
          CONTACT · 24H RESPONSE
        </Pill>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05]">
          ספר לי מה אתה צריך.
        </h1>
        <p className="mt-3 text-ink-300 max-w-2xl">
          הטופס הזה הולך ישר לוואטסאפ שלי. אני חוזר אליך תוך 24 שעות — בדרך כלל הרבה פחות.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form column */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // The field says why; sending a half-number helps nobody.
            if (!phoneLooksReal(phone)) return;
            const ref = makeRef();
            setRefCode(ref);

            // An order with nothing in the cart is still an enquiry worth
            // sending; the message just carries the free text instead of lines.
            const order: PlacedOrder = {
              ref,
              at: new Date().toISOString(),
              customer: {
                name: name.trim(),
                phone: phone.trim(),
                ...(email.trim() ? { email: email.trim() } : {}),
                kind: CUST_OPTIONS.find((o) => o.id === cust)?.label ?? "",
                ...(unitName.trim() ? { unit: unitName.trim() } : {}),
                ...(company.trim() ? { company: `${company.trim()}${vat.trim() ? ` · ח.פ. ${vat.trim()}` : ""}${bulkQty.trim() ? ` · ${bulkQty.trim()} יח׳` : ""}` } : {}),
              },
              inquiry: inquiries.find((q) => q.id === inquiry)?.label ?? "",
              delivery,
              ...(message.trim() ? { note: message.trim() } : {}),
              lines: items.map((it) => {
                // Each page writes its own key into meta; this normalises them
                // to the one id the admin can look a source file up by.
                const src = modelSourceFromMeta(it.meta);
                return {
                  title: it.baseTitle,
                  summary: it.summary,
                  qty: it.qty,
                  price: it.price ?? null,
                  ...(src?.id ? { itemId: src.id } : {}),
                };
              }),
              itemsTotal,
              // Re-checked at the moment of sending: a code that expired while
              // the page sat open must not travel with the order.
              ...(applied
                ? (() => {
                    const fresh = discountFor(codes, applied.code, itemsTotal).applied;
                    return fresh ? { discount: fresh } : {};
                  })()
                : {}),
              decision: "pending",
            };

            // The message goes first: opening a window is only allowed while
            // the click is still the browser's own event, and an await here
            // would hand it to a popup blocker instead of to WhatsApp.
            window.open(orderWhatsapp(order), "_blank", "noopener,noreferrer");

            // And the same order is written to the shop's queue, so it is
            // already waiting on Ariel's screen instead of being carried there
            // by hand. If that write fails the message still holds everything.
            setFiled("pending");
            void placeOrder(order).then((r) => setFiled(r === "saved" ? "saved" : "failed"));

            // And the customer's own copy of what they just ordered.
            setMailed("pending");
            setMailTo(order.customer.email ?? "");
            void sendOrderEmail(order).then(setMailed);

            if (items.length) {
              setOrdered(items);
              setCoupon(makeCoupon());
              clearCart();
            }
            setSubmitted(true);
          }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Customer type */}
          <section>
            <div className="text-sm font-semibold text-ink-100 mb-3">
              מי אתה? <span className="text-flame">*</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CUST_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setCust(o.id);
                    setInquiry(o.id === "b2b" ? "bulk" : "new");
                  }}
                  className={cn(
                    "p-3 rounded-xl border-2 text-sm font-semibold transition-all",
                    cust === o.id
                      ? "border-flame bg-flame/5 text-ink-50"
                      : "border-ink-800 bg-ink-950 text-ink-300 hover:border-ink-700",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          {/* Cart items panel */}
          {items.length > 0 && (
            <section className="rounded-2xl bg-gradient-to-bl from-flame/10 to-cyan2/5 border border-flame/30 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="font-mono text-[10px] tracking-widest uppercase text-flame">
                  סל קנייה · {items.length} {items.length === 1 ? "פריט" : "פריטים"}
                </div>
                <button
                  type="button"
                  onClick={clearCart}
                  aria-label="נקה סל"
                  className="text-[11px] text-ink-500 hover:text-bad transition-colors underline"
                >
                  נקה הכל
                </button>
              </div>

              <div className="divide-y divide-flame/10">
                {items.map((item, idx) => (
                  <div key={item.id} className="px-5 py-3 relative">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`הסר ${item.title}`}
                      className="absolute top-3 left-3 h-6 w-6 rounded-full bg-ink-950/40 text-ink-400 hover:text-bad inline-flex items-center justify-center transition-colors"
                    >
                      <Icon name="x" size={11} />
                    </button>
                    <div className="flex items-start gap-2 pr-1">
                      <span className="inline-flex items-center justify-center h-5 w-5 mt-0.5 rounded-full bg-flame/20 text-flame text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-tight">{item.title}</div>
                        <ul className="mt-1 space-y-0.5">
                          {item.summary.map((s, i) => (
                            <li key={i} className="text-xs text-ink-400 flex items-start gap-1.5">
                              <Icon name="check" size={9} className="mt-0.5 text-flame shrink-0" strokeWidth={3} />
                              {s}
                            </li>
                          ))}
                        </ul>
                        {typeof item.meta?.designSvg === "string" && (
                          <div className="mt-2 inline-block rounded-lg border border-ink-800 bg-ink-950 p-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`data:image/svg+xml;utf8,${encodeURIComponent(item.meta.designSvg)}`}
                              alt="תצוגה מקדימה של העיצוב"
                              className="max-h-20 w-auto"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0 mt-0.5">
                        {item.price !== null && (
                          <span className="font-mono text-sm font-bold text-flame" dir="ltr">
                            {fmtILS(item.price)}
                          </span>
                        )}
                        <div className="inline-flex items-center rounded-lg border border-ink-700 bg-ink-950/60" dir="ltr" aria-label="כמות">
                          <button
                            type="button"
                            onClick={() => setQty(item.id, item.qty - 1)}
                            disabled={item.qty <= 1}
                            aria-label={`הפחת כמות · ${item.baseTitle}`}
                            className="h-7 w-7 inline-flex items-center justify-center text-ink-300 hover:text-ink-50 disabled:opacity-30"
                          >
                            <Icon name="minus" size={11} />
                          </button>
                          <span className="min-w-[1.75rem] text-center font-mono text-xs font-bold text-ink-100">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.id, item.qty + 1)}
                            aria-label={`הוסף כמות · ${item.baseTitle}`}
                            className="h-7 w-7 inline-flex items-center justify-center text-ink-300 hover:text-ink-50"
                          >
                            <Icon name="plus" size={11} />
                          </button>
                        </div>
                        {item.unitPrice != null && item.qty > 1 && (
                          <span className="font-mono text-[10px] text-ink-500" dir="ltr">{fmtILS(item.unitPrice)} ליחידה</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount code */}
              <div className="px-5 py-3 border-t border-flame/20">
                {applied ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-good font-semibold">
                      <span className="font-mono" dir="ltr">{applied.code}</span> · {applied.label}
                    </span>
                    <button
                      type="button"
                      onClick={dropCode}
                      className="text-[11px] text-ink-500 hover:text-bad underline"
                    >
                      הסרה
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="קוד הנחה"
                      value={codeInput}
                      onChange={(e) => { setCodeInput(e.target.value); setCodeErr(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tryCode(); } }}
                      placeholder="קוד הנחה"
                      dir="ltr"
                      className="h-9 flex-1 min-w-0 px-3 rounded-lg bg-ink-950 border border-ink-800 text-sm font-mono text-ink-100 focus:outline-none focus:border-flame/60"
                    />
                    <Btn size="sm" variant="ghost" onClick={tryCode} disabled={!codeInput.trim()}>הפעלה</Btn>
                  </div>
                )}
                {codeErr && <div className="text-[11px] text-bad mt-1.5">{codeErr}</div>}
              </div>

              {/* Cart total */}
              <div className="px-5 py-3 border-t border-flame/20 bg-flame/5 space-y-1">
                {applied && itemsTotal != null && (
                  <>
                    <div className="flex items-baseline justify-between text-xs text-ink-400">
                      <span>פריטים</span>
                      <span className="font-mono" dir="ltr">{fmtILS(itemsTotal)}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-good">
                      <span>הנחה</span>
                      <span className="font-mono" dir="ltr">-{fmtILS(applied.off)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-300 font-semibold">סה&quot;כ משוער</span>
                  <span className="font-mono text-2xl font-black text-flame" dir="ltr">
                    {fmtILS(Math.max(0, (itemsTotal ?? items.reduce((sum, x) => sum + (x.price ?? 0), 0)) - (applied?.off ?? 0)))}
                    {!priced && <span className="text-xs font-normal text-ink-400"> + פריטים לתמחור</span>}
                  </span>
                </div>
                <div className="text-[11px] text-ink-500">לפני דמי משלוח, שנבחרים למטה.</div>
              </div>
            </section>
          )}

          {/* Inquiry type */}
          <section>
            <div className="text-sm font-semibold text-ink-100 mb-3">
              סוג הפנייה <span className="text-flame">*</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {inquiries.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setInquiry(q.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-full text-sm font-semibold border transition-all",
                    inquiry === q.id
                      ? "border-flame bg-flame-600 text-white"
                      : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600",
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </section>

          {/* B2B extra fields */}
          {cust === "b2b" && (
            <section className="p-5 rounded-2xl border border-cyan2/30 bg-cyan2/5 space-y-4">
              <div className="font-mono text-[11px] tracking-widest uppercase text-cyan2">
                B2B · ADDITIONAL DETAILS
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="שם החברה" required>
                  <Input required placeholder="Acme Industries" value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
                <Field label="ח.פ. / ע.מ." required>
                  <Input required placeholder="514123456" dir="ltr" value={vat} onChange={(e) => setVat(e.target.value)} />
                </Field>
              </div>
              <Field label="כמות משוערת" required>
                <Input type="number" min={10} placeholder="25" required dir="ltr" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} />
              </Field>
            </section>
          )}

          {/* Standard fields */}
          <section className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="שם מלא" required>
                <Input required placeholder="שם פרטי ושם משפחה" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              {/* Letters never reach the value, so the browser never refuses a
                  field the customer believes they filled. */}
              <Field label="טלפון" required error={phone && !phoneLooksReal(phone) ? "מספר קצר מדי — 05X-0000000" : undefined}>
                <Input
                  type="tel"
                  inputMode="tel"
                  required
                  placeholder="050-0000000"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(cleanPhone(e.target.value))}
                />
              </Field>
            </div>
            {/* Not optional any more: the confirmation with the whole order is
                sent here, and an order with no address leaves the customer
                holding nothing. */}
            <Field label="מייל" required>
              <Input type="email" required placeholder="you@example.com" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {cust === "soldier" && inquiry === "bulk" && (
              <Field label="יחידה / פלוגה" required>
                <Input required placeholder="חטיבת אריות הסלע · פלוגה ב׳" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
              </Field>
            )}
            <Field
              label="מה אתה צריך?"
              required={items.length === 0}
              hint={items.length > 0 ? "פרטים נוספים, אם יש" : ""}
            >
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required={items.length === 0}
                placeholder={
                  items.length > 0
                    ? "פרטים נוספים, שינויים שאתה רוצה, או כל מידע שיעזור לי…"
                    : "ספר לי על ההזמנה — כמה, באיזה צבע, מתי צריך, ולמי זה."
                }
              />
            </Field>
            <Field label="העלאת קובץ" hint="STL/OBJ/3MF/PNG · עד 50MB" optional>
              <Input type="file" accept=".stl,.obj,.3mf,.png,.jpg,.svg,.pdf" />
            </Field>
          </section>

          {/* Delivery — asked here because the answer changes the price and
              nobody wants to discover the courier fee in a WhatsApp reply. */}
          <section>
            <div className="text-sm font-semibold text-ink-100 mb-3">
              איך להעביר לך? <span className="text-flame">*</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {DELIVERY.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDelivery(d.id)}
                  aria-pressed={delivery === d.id}
                  className={cn(
                    "p-3 rounded-xl border-2 text-right transition-all",
                    delivery === d.id
                      ? "border-flame bg-flame/5"
                      : "border-ink-800 bg-ink-950 hover:border-ink-700",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm text-ink-50">{d.label}</span>
                    <span className={cn("text-sm font-bold", d.price ? "text-ink-200" : "text-good")}>
                      {d.price ? fmtILS(d.price) : "חינם"}
                    </span>
                  </span>
                  <span className="block text-[11px] text-ink-400 mt-0.5">{d.note}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Submit row */}
          <section className="pt-6 border-t border-ink-800 flex flex-wrap items-center justify-between gap-4">
            {/* The disclosure has to be visible where the data is given, not
                only in a footer link — and it has to name where the details
                actually go. */}
            <p className="text-xs text-ink-400 max-w-md leading-relaxed">
              בלחיצה על &quot;שלח&quot; אתה מאשר שאני יכול לחזור אליך בוואטסאפ עם פרטי ההזמנה,
              ומסכים ל
              <Link href="/terms" className="text-flame-300 underline hover:text-flame">תנאי השימוש</Link>
              {" ול"}
              <Link href="/privacy" className="text-flame-300 underline hover:text-flame">מדיניות הפרטיות</Link>.
              {" "}הפרטים משמשים לביצוע ההזמנה בלבד ולא נמסרים לאף אחד לצורכי שיווק.{" "}
              <Link href="/returns" className="text-flame-300 underline hover:text-flame">זכות הביטול</Link>.
            </p>
            <Btn type="submit" size="lg" icon="whatsapp">
              שלח פנייה
            </Btn>
          </section>
        </form>

        {/* Aside */}
        <aside className="space-y-4">
          <div className="p-5 rounded-2xl bg-ink-900 border border-ink-800">
            <div className="font-mono text-[10px] tracking-widest uppercase text-flame mb-2">
              RESPONSE TIME
            </div>
            <div className="text-3xl font-extrabold tracking-tight">תוך 24 שעות</div>
            <div className="text-sm text-ink-400 mt-1">
              בדרך כלל הרבה פחות. אם זה דחוף — וואטסאפ.
            </div>
          </div>

          <a
            href={CONTACT.whatsapp}
            className="block p-5 rounded-2xl bg-good/10 border border-good/30 hover:bg-good/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-good/20 text-good">
                <Icon name="whatsapp" size={20} />
              </span>
              <div>
                <div className="font-bold">וואטסאפ ישיר</div>
                <div className="text-xs text-ink-300" dir="ltr">
                  {CONTACT.phoneDisplay}
                </div>
              </div>
            </div>
          </a>

          <a
            href={CONTACT.instagram}
            className="block p-5 rounded-2xl bg-ink-900 border border-ink-800 hover:border-flame/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-ink-800 text-flame">
                <Icon name="instagram" size={20} />
              </span>
              <div>
                <div className="font-bold">אינסטגרם</div>
                <div className="text-xs text-ink-400" dir="ltr">
                  {CONTACT.instagramHandle}
                </div>
              </div>
            </div>
          </a>

          <a
            href={`mailto:${CONTACT.email}`}
            className="block p-5 rounded-2xl bg-ink-900 border border-ink-800 hover:border-flame/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-ink-800 text-flame">
                <Icon name="mail" size={20} />
              </span>
              <div>
                <div className="font-bold">מייל</div>
                <div className="text-xs text-ink-400" dir="ltr">
                  {CONTACT.email}
                </div>
              </div>
            </div>
          </a>

          <div className="p-5 rounded-2xl bg-ink-900 border border-ink-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-ink-800 text-ink-300">
                <Icon name="pin" size={18} />
              </span>
              <div>
                <div className="font-bold">איסוף עצמי</div>
                <div className="text-xs text-ink-400">גבעתיים · בתיאום מראש</div>
              </div>
            </div>
            <div className="text-sm text-ink-300">
              חינם לחלוטין. נפגשים, אתה רואה לפני שלוקח, ומשלם רק אם מתאים.
            </div>
          </div>

          {cust === "b2b" && (
            <Link
              href="/b2b"
              className="block p-5 rounded-2xl bg-cyan2/5 border border-cyan2/30 hover:bg-cyan2/10 transition-colors"
            >
              <div className="font-bold text-cyan2 mb-1.5">צריך הזמנה מפורטת?</div>
              <div className="text-xs text-ink-300 mb-3">
                לטופס B2B מלא — עם תקציב, דד-ליין, ולוגו.
              </div>
              <span className="inline-flex items-center gap-1 text-cyan2 text-sm font-semibold">
                כנס לדף B2B
                <Icon name="arrowLeft" size={14} />
              </span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
