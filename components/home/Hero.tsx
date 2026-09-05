import Btn from "@/components/ui/Btn";
import HeroLogo from "./HeroLogo";
import StudioPanel from "./StudioPanel";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden" aria-label="Hero">
      {/* Banner — text + CTAs (no video) */}
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 printer-grid opacity-20" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(255,247,235,0.05) 0%, transparent 55%), linear-gradient(180deg, #100E0C 0%, #100E0C 100%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16 text-center">
          <HeroLogo className="u3d-hero mx-auto w-[240px] md:w-[340px] h-auto mb-6 md:mb-8" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ink-700 bg-ink-900 text-ink-300 text-xs mb-8">
            <span>סטודיו הדפסת תלת מימד</span>
            <span className="text-ink-600">·</span>
            <span>פתח תקווה</span>
          </div>
          <h1 className="font-display text-[34px] md:text-[62px] leading-[1.12] font-bold text-ink-50 max-w-3xl mx-auto">
            אני מדפיס סמלי יחידה, מתנות ומה שתשלח לי — מהסטודיו בפתח תקווה, תוך כמה ימים.
          </h1>
          <p className="mt-6 text-ink-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            שולחים קובץ או בוחרים מהחנות, מסכימים על צבע וחומר בוואטסאפ, ומקבלים את זה הביתה.
            עובד גם עם חשבונית מס לחברות.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Btn as="a" href="/configurator" size="lg" icon="sparkles">
              התחל להזמין
            </Btn>
            <Btn as="a" href="/livestream" size="lg" variant="outline" icon="play">
              צפה במדפסת בלייב
            </Btn>
          </div>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-300">
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-ink-600" />
              מעל 500 הזמנות
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-ink-600" />
              משלוח לכל הארץ
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-ink-600" />
              תוצאות תוך 3-5 ימים
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-ink-600" />
              חשבונית מס לעסקים
            </li>
          </ul>
        </div>
      </div>

      {/* The studio itself. See StudioPanel for why this is not a dashboard. */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-20 md:pb-28">
        <StudioPanel />
      </div>

    </section>
  );
}
