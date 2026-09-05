import Link from "next/link";
import Image from "next/image";
import SectionHead from "@/components/ui/SectionHead";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import ProductArt from "@/components/ProductArt";
import { photoMix } from "@/lib/photos";
import { PRODUCT_BY_ID, CONFIG_PRODUCT_BY_ID } from "@/lib/products";
import { fmtILS } from "@/lib/format";

type Tile = {
  href: string;
  name: string;
  price?: number;
  label: string;
  image?: string;
  credit?: string;
  art?: React.ReactNode;
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
  const photos = photoMix(["flexi", "statues", "fidget", "home", "office"], 10);

  const tiles: Tile[] = photos.slice(0, 8).map((ph) => ({
    href: ph.href,
    name: ph.name,
    label: SHELF_LABEL[ph.shelf] ?? "מודפס",
    image: ph.src,
    credit: ph.creator,
  }));

  tiles.splice(2, 0, {
    href: "/configurator?product=phone_case",
    name: "קייס לטלפון בעיצוב אישי",
    price: CONFIG_PRODUCT_BY_ID.phone_case.basePrice,
    label: "מעצב",
    art: <ProductArt art="phonecase" hue={200} size={140} />,
  });
  tiles.splice(6, 0, {
    href: "/catalog",
    name: "סמל היחידה שלך",
    price: 65,
    label: "חיילים",
    art: <ProductArt art="keychain" hue={145} size={140} />,
  });
  tiles.push({
    href: "/products/pet-bone",
    name: PRODUCT_BY_ID["pet-bone"].name,
    price: PRODUCT_BY_ID["pet-bone"].price,
    label: "לחיות",
    art: <ProductArt art="bone" hue={30} size={140} />,
  });

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
              {t.image ? (
                <Image
                  src={t.image}
                  alt={t.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center stripes">{t.art}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-transparent">
                <div
                  className="text-sm font-bold leading-tight line-clamp-1"
                  dir={/[\u05d0-\u05ea]/.test(t.name) ? "rtl" : "ltr"}
                >
                  {t.name}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-xs text-flame" dir="ltr">
                    {t.price != null ? fmtILS(t.price) : ""}
                  </span>
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
