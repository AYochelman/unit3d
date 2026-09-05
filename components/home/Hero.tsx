import Btn from "@/components/ui/Btn";
import HeroLogo from "./HeroLogo";
import PrinterPanel from "./PrinterPanel";

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
                "radial-gradient(ellipse at center, rgba(17,184,89,0.12) 0%, transparent 60%), linear-gradient(180deg, #0A0A0B 0%, #0A0A0B 100%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16 text-center">
          <HeroLogo className="u3d-hero mx-auto w-[240px] md:w-[340px] h-auto mb-6 md:mb-8" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-flame/30 bg-flame/10 text-flame text-xs font-mono uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-flame live-dot" />
            <span>המדפסת רצה עכשיו</span>
            <span className="text-ink-400">·</span>
            <span dir="ltr">הזמנה #4781</span>
          </div>
          <h1 className="text-[44px] md:text-[88px] leading-[0.95] font-black tracking-tightest text-ink-50">
            כל רעיון.
            <br />
            מודפס.
            <br />
            <span className="text-flame">בידיים שלך.</span>
          </h1>
          <p className="mt-8 text-ink-200 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            מדפסת תלת מימד מקצועית שעובדת עבורך — סמלי יחידות, מתנות לעובדים,
            פידג&apos;טים, או כל קובץ שתעלה. ישירות מהסטודיו אליך.
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
              <span className="w-1 h-1 rounded-full bg-flame" />
              מעל 500 הזמנות
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-flame" />
              משלוח לכל הארץ
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-flame" />
              תוצאות תוך 3-5 ימים
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-flame" />
              חשבונית מס לעסקים
            </li>
          </ul>
        </div>
      </div>

      {/* Machine readout — replaces the missing hero video with live printer data */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-20 md:pb-28">
        <PrinterPanel />
      </div>

    </section>
  );
}
