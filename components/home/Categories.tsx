import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Emblem from "@/components/Emblem";
import Pill from "@/components/ui/Pill";

type Cat = {
  index: string;
  title: string;
  desc: string;
  href: string;
  hue: number;
  shape: "shield" | "circle" | "hex" | "rect";
  popular?: boolean;
};

const CATS: Cat[] = [
  {
    index: "01",
    title: "סמלי יחידה צה\"ליים",
    desc: "מחזיקי מפתחות, פסלי שולחן, מתנות לטקסים.",
    href: "/catalog",
    hue: 18,
    shape: "shield",
  },
  {
    index: "02",
    title: "מחזיקי מפתחות מותאמים",
    desc: "שם, מספר, סמל — לוקחים אצלי 1.5 שעות.",
    href: "/configurator",
    hue: 200,
    shape: "rect",
  },
  {
    index: "03",
    title: "פידג'טים ומפיגי שיעמום",
    desc: "Articulated dragons, spinners, infinity cubes.",
    href: "/fidgets",
    hue: 90,
    shape: "hex",
    popular: true,
  },
  {
    index: "04",
    title: "הדפסה לפי הקובץ שלך",
    desc: "STL/OBJ/3MF — אני מתאים, צובע, ומדפיס.",
    href: "/upload",
    hue: 280,
    shape: "circle",
  },
];

export default function Categories() {
  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CATS.map((c) => (
            <Link
              key={c.index}
              href={c.href}
              className="group relative flex flex-col p-6 bg-ink-900 border border-ink-800 rounded-2xl hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-[11px] tracking-widest text-ink-500">
                  {c.index}
                </span>
                {c.popular && <Pill tone="flame">פופולרי</Pill>}
              </div>
              <div className="flex justify-center my-4 h-32">
                <Emblem shape={c.shape} hue={c.hue} size={120} />
              </div>
              <h3 className="text-base md:text-lg font-extrabold tracking-tight mb-1.5">
                {c.title}
              </h3>
              <p className="text-ink-400 text-sm leading-relaxed mb-4 flex-1">
                {c.desc}
              </p>
              <div className="inline-flex items-center gap-1.5 text-flame font-semibold text-sm">
                <span>פתח {c.title.split(" ")[0]}</span>
                <Icon
                  name="arrowLeft"
                  size={14}
                  className="transition-transform group-hover:-translate-x-1"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
