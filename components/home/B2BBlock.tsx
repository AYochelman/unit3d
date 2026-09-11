import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";

const TIERS = [
  { range: "10-50", price: 48, label: "" },
  { range: "50-200", price: 36, label: "" },
  { range: "200+", price: 0, label: "פנה" },
];

// A "PRODUCED FOR" strip of four company names used to sit at the bottom of
// this block. None of them was a customer. A wall of invented clients is the
// single most quotable thing on a page like this, so it is gone until there is
// a real one to name — with that company's permission.

const PERKS = [
  "חשבונית מס",
  "מחירון מדורג",
  "עיצוב הלוגו",
  "אריזה ממותגת",
  "משלוח מרוכז",
];

export default function B2BBlock() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Stripes + soft glow background */}
      <div
        className="absolute inset-0 -z-10 opacity-30 stripes"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, rgba(8,154,71,0.10), transparent 70%)",
        }}
      />
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Pill tone="flame" className="mb-4">
              B2B · BUSINESSES
            </Pill>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tightest leading-[1.05]">
              מזמינים לחברה?
              <br />
              <span className="text-flame">קבלו דיל אחר.</span>
            </h2>
            <ul className="mt-6 grid gap-2.5">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-ink-200">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-flame/15 text-flame">
                    <Icon name="check" size={12} strokeWidth={2.5} />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Btn as="a" href="/b2b">
                קבל הצעת מחיר
              </Btn>
              <Btn as="a" href="/gallery?cat=b2b" variant="ghost">
                ראה דוגמאות עסקיות
              </Btn>
            </div>
          </div>

          <div className="rounded-2xl bg-ink-900 border border-ink-800 p-6 md:p-7">
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-4">
              VOLUME PRICING · ILS PER UNIT
            </div>
            <div className="grid grid-cols-3 gap-3">
              {TIERS.map((t, i) => {
                const featured = i === 1;
                return (
                  <div
                    key={t.range}
                    className={
                      "p-4 rounded-xl border " +
                      (featured
                        ? "border-flame bg-flame/5"
                        : "border-ink-800 bg-ink-950/40")
                    }
                  >
                    <div
                      className="font-mono text-[11px] tracking-wider text-ink-400"
                      dir="ltr"
                    >
                      {t.range}
                    </div>
                    <div className="mt-1 text-3xl font-extrabold tracking-tight font-mono">
                      {t.price ? fmtILS(t.price) : t.label}
                    </div>
                    {featured && (
                      <div className="mt-1 text-xs font-semibold text-flame">
                        הכי משתלם
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
