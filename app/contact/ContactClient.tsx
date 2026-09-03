"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { useOrderStore } from "@/lib/order-store";
import { fmtILS } from "@/lib/format";
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
  const { items, removeItem, clearCart } = useOrderStore();
  const order = items[0] ?? null; // first item for legacy checks

  const [cust, setCust] = useState<CustType>(
    items.length > 0 ? "private" : "private",
  );
  const initialInquiry: Inquiry = items.length > 0 ? (cust === "b2b" ? "bulk" : "new") : "question";
  const [inquiry, setInquiry] = useState<Inquiry>(initialInquiry);
  const [submitted, setSubmitted] = useState(false);

  const inquiries = useMemo(() => INQUIRY_FOR[cust], [cust]);
  const refCode = useMemo(
    () => `UNIT3D-${Math.floor(Math.random() * 90000 + 10000)}`,
    [submitted],
  );

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24 text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-good/15 text-good mb-6">
          <Icon name="check" size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest mb-4">
          תודה! קיבלתי את הפנייה.
        </h1>
        <p className="text-ink-300 text-base md:text-lg max-w-xl mx-auto mb-8">
          {cust === "b2b"
            ? "אני חוזר אליך תוך 24 שעות עם הצעת מחיר מפורטת, mock-up דיגיטלי, ולוז ייצור."
            : "אני חוזר אליך תוך 24 שעות בוואטסאפ. אם זה דחוף — אפשר לקפוץ ישר לשם."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Btn as="a" href="/livestream" icon="play">
            צפה בלייב
          </Btn>
          <Btn
            as="a"
            href="https://wa.me/972500000000"
            variant="ghost"
            icon="whatsapp"
          >
            פתח וואטסאפ
          </Btn>
        </div>
        <div className="font-mono text-[11px] tracking-widest text-ink-500" dir="ltr">
          REF · {refCode}
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
                      </div>
                      {item.price !== null && (
                        <span className="font-mono text-sm font-bold text-flame shrink-0 mt-0.5" dir="ltr">
                          {fmtILS(item.price)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart total */}
              {items.length > 1 && (
                <div className="px-5 py-3 border-t border-flame/20 flex items-baseline justify-between bg-flame/5">
                  <span className="text-sm text-ink-300 font-semibold">סה&quot;כ משוער</span>
                  <span className="font-mono text-2xl font-black text-flame" dir="ltr">
                    {fmtILS(items.reduce((sum, x) => sum + (x.price ?? 0), 0))}
                  </span>
                </div>
              )}
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
                      ? "border-flame bg-flame text-white"
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
                  <Input required placeholder="Acme Industries" />
                </Field>
                <Field label="ח.פ. / ע.מ." required>
                  <Input required placeholder="514123456" dir="ltr" />
                </Field>
              </div>
              <Field label="כמות משוערת" required>
                <Input type="number" min={10} placeholder="25" required dir="ltr" />
              </Field>
            </section>
          )}

          {/* Standard fields */}
          <section className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="שם מלא" required>
                <Input required placeholder="שם פרטי ושם משפחה" />
              </Field>
              <Field label="טלפון" required>
                <Input type="tel" required placeholder="050-0000000" dir="ltr" />
              </Field>
            </div>
            <Field label="מייל" optional>
              <Input type="email" placeholder="you@example.com" dir="ltr" />
            </Field>
            {cust === "soldier" && inquiry === "bulk" && (
              <Field label="יחידה / פלוגה" required>
                <Input required placeholder="חטיבת אריות הסלע · פלוגה ב׳" />
              </Field>
            )}
            <Field
              label="מה אתה צריך?"
              required={items.length === 0}
              hint={items.length > 0 ? "פרטים נוספים, אם יש" : ""}
            >
              <Textarea
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

          {/* Submit row */}
          <section className="pt-6 border-t border-ink-800 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-ink-400 max-w-sm">
              בלחיצה על &quot;שלח&quot; אתה מאשר שאני יכול לחזור אליך
              בוואטסאפ עם פרטי ההזמנה.
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
            href="https://wa.me/972500000000"
            className="block p-5 rounded-2xl bg-good/10 border border-good/30 hover:bg-good/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-good/20 text-good">
                <Icon name="whatsapp" size={20} />
              </span>
              <div>
                <div className="font-bold">וואטסאפ ישיר</div>
                <div className="text-xs text-ink-300" dir="ltr">
                  052-XXX-XXXX
                </div>
              </div>
            </div>
          </a>

          <a
            href="https://instagram.com/unit3d.print"
            className="block p-5 rounded-2xl bg-ink-900 border border-ink-800 hover:border-flame/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-ink-800 text-flame">
                <Icon name="instagram" size={20} />
              </span>
              <div>
                <div className="font-bold">אינסטגרם</div>
                <div className="text-xs text-ink-400" dir="ltr">
                  @unit3d.print
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
                <div className="text-xs text-ink-400">פתח תקווה · בתיאום מראש</div>
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
