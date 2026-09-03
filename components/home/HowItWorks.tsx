import SectionHead from "@/components/ui/SectionHead";
import Icon, { type IconName } from "@/components/ui/Icon";

type Step = {
  index: string;
  iconKey: IconName;
  title: string;
  desc: string;
};

const STEPS: Step[] = [
  { index: "01", iconKey: "sparkles", title: "בוחרים", desc: "בקטלוג, במעצב, או שולחים קובץ." },
  { index: "02", iconKey: "settings", title: "מתאמים", desc: "אני חוזר אליך בוואטסאפ עם הצעה." },
  { index: "03", iconKey: "check", title: "מאשרים", desc: "רואים render סופי, מאשרים, ומשלמים." },
  { index: "04", iconKey: "package", title: "מקבלים", desc: "3–5 ימים בדואר או אצלך הביתה." },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-24 bg-ink-900/40 border-y border-ink-800/60">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <SectionHead
          eyebrow="HOW IT WORKS · 4 STEPS"
          title={
            <>
              4 צעדים מהרעיון <span className="text-flame">לקופסה אצלך הביתה.</span>
            </>
          }
        />
        <div className="mt-14 relative">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-7 right-12 left-12 h-px"
            style={{
              background:
                "linear-gradient(90deg, rgba(8,154,71,0.3) 0%, rgba(0,194,199,0.3) 50%, rgba(8,154,71,0.3) 100%)",
            }}
          />
          <ol className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <li key={s.index} className="flex flex-col items-start gap-3">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-ink-900 border border-ink-700 text-flame relative z-10">
                  <Icon name={s.iconKey} size={22} />
                </div>
                <div className="font-mono text-[11px] tracking-widest text-ink-500">
                  {s.index}
                </div>
                <h3 className="text-xl font-extrabold tracking-tight">{s.title}</h3>
                <p className="text-ink-400 text-sm leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
