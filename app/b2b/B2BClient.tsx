"use client";
import { useState } from "react";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon, { type IconName } from "@/components/ui/Icon";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { fmtILS } from "@/lib/format";
import ProductGrid, { productToCard } from "@/components/ProductGrid";
import { productsByCategory } from "@/lib/products";
import { photoMix } from "@/lib/photos";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

const USE_CASES = [
  {
    iconKey: "package" as IconName,
    title: "מתנות לעובדים חדשים",
    desc: "Welcome kits שלא נשכחים בארון.",
    example: "לדוגמה: 25 ערכות לסטארטאפ בגיוס Seed",
  },
  {
    iconKey: "star" as IconName,
    title: "פרסים רבעוניים",
    desc: "Quarterly trophies לעובדים מצטיינים.",
    example: "לדוגמה: 4 פרסים ייחודיים לרבעון",
  },
  {
    iconKey: "sparkles" as IconName,
    title: "מתנות לועידות וכנסים",
    desc: "ערכות מותגות שעוברות הביתה ולא לפח.",
    example: "לדוגמה: 150 ערכות לכנס שנתי",
  },
];

const TIERS = [
  {
    range: "10-50",
    price: 48,
    label: "התחלה",
    perks: ["חשבונית מס", "צבע אחיד", "אריזה סטנדרטית", "5-7 ימי עסקים"],
  },
  {
    range: "50-200",
    price: 36,
    label: "Most popular",
    perks: ["הכל ב-10-50", "עיצוב לוגו מותאם", "אריזה ממותגת", "צבע מותג מדויק", "4-6 ימי עסקים"],
    featured: true,
  },
  {
    range: "200+",
    price: 0,
    label: "מותאם",
    perks: ["הכל ב-50-200", "Account manager", "Mock-up פיזי לפני ייצור", "משלוחים מתואמים"],
  },
];

const INCLUDED: { iconKey: IconName; title: string; desc: string }[] = [
  { iconKey: "file", title: "חשבונית מס", desc: "מסודרת. רואי-חשבון שלכם יאהבו." },
  { iconKey: "sparkles", title: "עיצוב הלוגו", desc: "אני אתאים את הלוגו שלכם להדפסה בתלת מימד." },
  { iconKey: "droplet", title: "צבע מותג מדויק", desc: "פילמנטים שתואמים את הפנטון שלכם." },
  { iconKey: "package", title: "אריזה ממותגת", desc: "אריזה אישית לכל יחידה — מותג שלכם בחוץ." },
  { iconKey: "truck", title: "משלוח מרוכז", desc: "למשרד אחד או לכמה כתובות. הכל מתואם." },
];

const CLIENTS = ["▲ MoonTech", "◆ Pixie", "● Orca Labs", "■ Halo HR", "⬢ Nimbus", "✦ Forge"];

export default function B2BClient() {
  // Real, brandable products with real photographs, instead of a page that only
  // describes what a corporate order could be.
  const b2bCards = productsByCategory("b2b").map(productToCard);
  const ideaPhotos = photoMix(["office", "home", "statues"], 5);

  const [submitted, setSubmitted] = useState(false);
  const [refCode, setRefCode] = useState("");

  return (
    <div>
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-30 stripes"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 40%, rgba(8,154,71,0.15), transparent 70%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
          <Pill tone="flame" className="mb-5">
            UNIT3D · BUSINESS
          </Pill>
          <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.05] mb-4">
            הדפסות בכמויות.
            <br />
            <span className="text-flame">עבור החברה שלך.</span>
          </h1>
          <p className="text-ink-300 max-w-2xl mx-auto text-base md:text-lg">
            10 יחידות, 100, או 1000. אני עובד מול חברות מאז 2021 — חשבונית מס,
            מחירון מדורג, ומשלוחים מתואמים. דבר איתי, בלי תיווך.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Btn as="a" href="#b2b-form" size="lg">
              קבל הצעת מחיר
            </Btn>
            <Btn as="a" href="/gallery?cat=b2b" variant="ghost" size="lg">
              ראה דוגמאות עסקיות
            </Btn>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 md:py-20 bg-ink-900/40 border-y border-ink-800/60">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
            USE CASES
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tightest leading-[1.05] mb-10">
            למה חברות מזמינות אצלי.
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {USE_CASES.map((u) => (
              <article
                key={u.title}
                className="p-6 rounded-2xl bg-ink-950 border border-ink-800 hover:border-ink-700 transition-colors"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-flame/15 text-flame mb-4">
                  <Icon name={u.iconKey} size={22} />
                </div>
                <h3 className="font-bold text-lg mb-1.5">{u.title}</h3>
                <p className="text-ink-300 text-sm mb-3">{u.desc}</p>
                <p className="text-cyan2 text-xs font-mono leading-relaxed">
                  {u.example}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Volume pricing */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-10">
            <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
              VOLUME PRICING
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tightest">
              ככל שיותר, יותר זול.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TIERS.map((t) => (
              <article
                key={t.range}
                className={cn(
                  "p-7 rounded-2xl border-2 transition-all",
                  t.featured
                    ? "border-flame bg-flame/5 shadow-glow"
                    : "border-ink-800 bg-ink-900",
                )}
              >
                {t.featured && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-flame mb-3">
                    MOST POPULAR
                  </div>
                )}
                <div className="font-mono text-sm text-ink-400 mb-1" dir="ltr">
                  {t.range} יח׳
                </div>
                <div className="font-mono text-5xl font-extrabold tracking-tight">
                  {t.price ? fmtILS(t.price) : "פנה"}
                </div>
                <div className="text-sm text-ink-400 mt-1">
                  {t.price ? "ליחידה · מע״מ נכלל" : "מותאם לפי מפרט"}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-flame/15 text-flame shrink-0">
                        <Icon name="check" size={12} strokeWidth={2.5} />
                      </span>
                      <span className="text-ink-200">{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 md:py-20 bg-ink-900/40 border-y border-ink-800/60">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
            WHAT&apos;S INCLUDED
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tightest leading-[1.05] mb-10">
            הכל כלול. אין סודות.
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {INCLUDED.map((i) => (
              <div
                key={i.title}
                className="p-5 rounded-2xl bg-ink-950 border border-ink-800 hover:border-ink-700 transition-colors"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2 mb-3">
                  <Icon name={i.iconKey} size={18} />
                </div>
                <div className="font-bold text-sm mb-1">{i.title}</div>
                <div className="text-xs text-ink-400 leading-relaxed">{i.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote form */}
      <section id="b2b-form" className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          <div className="text-center mb-8">
            <div className="font-mono text-[11px] tracking-widest uppercase text-flame mb-3">
              REQUEST A QUOTE
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tightest">
              קבל הצעת מחיר תוך 24 שעות.
            </h2>
          </div>

          {!submitted ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRefCode(String(Math.floor(Math.random() * 9000 + 1000)));
                setSubmitted(true);
              }}
              className="p-6 md:p-8 rounded-2xl bg-ink-900 border border-ink-800 space-y-5"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="שם החברה" required>
                  <Input placeholder="Acme Industries" required />
                </Field>
                <Field label="איש קשר" required>
                  <Input placeholder="שם פרטי + שם משפחה" required />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="טלפון" required>
                  <Input type="tel" placeholder="050-0000000" dir="ltr" required />
                </Field>
                <Field label="מייל" required>
                  <Input type="email" placeholder="you@company.com" dir="ltr" required />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="מספר עובדים בחברה">
                  <Select defaultValue="">
                    <option value="">בחר…</option>
                    <option>1-10</option>
                    <option>11-50</option>
                    <option>51-200</option>
                    <option>201-1000</option>
                    <option>1000+</option>
                  </Select>
                </Field>
                <Field label="סוג המוצר" required>
                  <Select required defaultValue="">
                    <option value="">בחר…</option>
                    <option>מחזיקי מפתחות</option>
                    <option>פסלי שולחן</option>
                    <option>פרסים</option>
                    <option>Welcome kits</option>
                    <option>פיגורות מותאמות</option>
                    <option>אחר</option>
                  </Select>
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="כמות משוערת" required>
                  <Input type="number" min={10} placeholder="25" dir="ltr" required />
                </Field>
                <Field label="תקציב משוער">
                  <Select defaultValue="">
                    <option value="">בחר…</option>
                    <option>עד ₪1,000</option>
                    <option>₪1,000–₪5,000</option>
                    <option>₪5,000–₪20,000</option>
                    <option>₪20,000+</option>
                  </Select>
                </Field>
              </div>
              <Field label="דד-ליין">
                <Input type="date" />
              </Field>
              <Field label="העלאת לוגו" hint="SVG/PNG, עד 10MB" optional>
                <Input type="file" accept=".svg,.png,.jpg" />
              </Field>
              <Field label="פרטים נוספים" optional>
                <Textarea placeholder="פרטים נוספים, אילוצים, השראה, או דוגמאות שראית באתר…" />
              </Field>
              <Btn type="submit" size="lg" className="w-full">
                שלח בקשה להצעת מחיר
              </Btn>
            </form>
          ) : (
            <div className="p-8 rounded-2xl border border-good/30 bg-good/10 text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-good/20 text-good mb-4">
                <Icon name="check" size={28} strokeWidth={2.5} />
              </div>
              <div className="font-bold text-2xl mb-2">קיבלתי. תודה.</div>
              <p className="text-ink-300 mb-5 max-w-md mx-auto">
                אני חוזר אליך תוך 24 שעות עם הצעת מחיר מפורטת, mock-up דיגיטלי,
                ולוז ייצור.
              </p>
              <div className="font-mono text-[11px] text-ink-500" dir="ltr">
                REF · B2B-{refCode}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Products a company actually orders ─────────────────────────── */}
      <section className="py-16 border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="mb-8">
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-3">
              WHAT COMPANIES ORDER
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tightest mb-2">
              מוצרים שאפשר למתג.
            </h2>
            <p className="text-ink-300 max-w-2xl">
              כל אחד מאלה מודפס עם הלוגו או השם שלכם, בצבעי המותג, מ-10 יחידות ומעלה.
              מעל 5 יחידות יש 10% הנחת כמות אוטומטית.
            </p>
          </div>

          {b2bCards.length > 0 && <ProductGrid cards={b2bCards} />}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ideaPhotos.map((ph) => (
              <Link
                key={ph.id}
                href={ph.href}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-ink-900 border border-ink-800 hover:border-ink-700 transition-colors"
              >
                <Image src={ph.src} alt={ph.name} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-ink-950/95 to-transparent">
                  <div className="text-xs font-bold leading-tight line-clamp-2">{ph.name}</div>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-500">
            רעיונות נוספים שאפשר למתג — לחיצה פותחת את עמוד המוצר.
          </p>
        </div>
      </section>

      {/* Clients */}
      <section className="py-12 border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-4">
            PRODUCED FOR
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {CLIENTS.map((c) => (
              <span
                key={c}
                className="text-sm px-3 py-1.5 rounded-full bg-ink-900 border border-ink-800 text-ink-300 font-mono"
                dir="ltr"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
