import Link from "next/link";
import Image from "next/image";
import SectionHead from "@/components/ui/SectionHead";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import { photoMix } from "@/lib/photos";

type Tile = {
  href: string;
  name: string;
  label: string;
  image: string;
  credit?: string;
};

const SHELF_LABEL: Record<string, string> = {
  flexi: "פלקסי",
  fidget: "פידג'ט",
  statues: "פסל",
  home: "לבית",
  office: "למשרד",
  pets: "לחיות",
  trendy: "טרנדי",
};

/**
 * "What comes out of the printer" — real photographs of real prints.
 *
 * These are the pictures the designers published for the models we print,
 * pulled from the imported catalogue (lib/photos.ts). Two tiles stay as
 * illustrations because they are made to order and have no photo yet: the
 * custom phone case and the unit emblem.
 */
export default function ProductShowcase() {
  const photos = photoMix(["flexi", "statues", "fidget", "home", "office", "pets"], 10);

  const tiles: Tile[] = photos.map((ph) => ({
    href: ph.href,
    name: ph.name,
    label: SHELF_LABEL[ph.shelf] ?? "מודפס",
    image: ph.src,
    credit: ph.creator,
  }));

  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <SectionHead
            eyebrow="WHAT WE PRINT"
            title="ככה זה נראה כשזה יוצא מהמדפסת."
            sub="תמונות אמיתיות של הדגמים שאנחנו מדפיסים. לחיצה פותחת את עמוד המוצר עם צבע, חומר, זמן הדפסה ומחיר."
          />
          <Btn as="a" href="/trendy" variant="ghost" iconRight="arrowLeft">
            טרנדי כרגע
          </Btn>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {tiles.slice(0, 10).map((t) => (
            <Link
              key={t.href + t.name}
              href={t.href}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth"
            >
              <Image
                  src={t.image}
                  alt={t.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-transparent">
                <div
                  className="text-sm font-bold leading-tight line-clamp-1"
                  dir={/[\u05d0-\u05ea]/.test(t.name) ? "rtl" : "ltr"}
                >
                  {t.name}
                </div>
                <div className="flex items-center justify-end mt-1">
                  <Pill tone="neutral" className="text-[10px] px-1.5 py-0.5">
                    {t.label}
                  </Pill>
                </div>
                {t.credit && (
                  <div className="text-[9px] text-ink-500 mt-0.5 truncate" dir="ltr">
                    design: {t.credit}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-ink-500">
          הדגמים מהקהילה של MakerWorld, בקרדיט למעצבים. אנחנו מדפיסים אותם בצבע ובחומר שתבחר.
        </p>
      </div>
    </section>
  );
}
