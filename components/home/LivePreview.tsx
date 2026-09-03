import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import SectionHead from "@/components/ui/SectionHead";

export default function LivePreview() {
  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-2">
            <SectionHead
              eyebrow="LIVE · CAM ONLINE"
              title={
                <>
                  המדפסת רצה <span className="text-flame">בזמן שאתה קורא.</span>
                </>
              }
              sub="צפה במה שמתרחש עכשיו על ה-build plate. שקוף, חי, ובלי פילטרים. כי שירות הדפסה אמיתי לא מסתיר את הסדנה."
            />
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Btn as="a" href="/livestream" icon="play">
                צפה בלייב
              </Btn>
              <Btn as="a" href="/tracking" variant="ghost" icon="search">
                איפה ההזמנה שלי?
              </Btn>
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-ink-800 timelapse">
              <div className="absolute inset-0 printer-grid opacity-50" />
              <div className="absolute top-4 right-4 z-10">
                <Pill tone="bad">
                  <span className="w-1.5 h-1.5 rounded-full bg-bad live-dot" />
                  LIVE NOW
                </Pill>
              </div>
              <div
                className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-widest text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1 rounded"
                dir="ltr"
              >
                127 VIEWERS
              </div>
              <button
                type="button"
                className="absolute inset-0 z-10 flex items-center justify-center group"
                aria-label="הפעל וידאו"
              >
                <span className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-flame/20 backdrop-blur border border-flame/40 text-flame group-hover:bg-flame group-hover:text-ink-950 transition-colors">
                  <Icon name="play" size={28} />
                </span>
              </button>
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-ink-800">
                <div className="h-full bg-flame w-[47%] progress-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
