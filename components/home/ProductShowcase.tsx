import Link from "next/link";
import Image from "next/image";
import SectionHead from "@/components/ui/SectionHead";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import ProductArt from "@/components/ProductArt";
import { FIDGETS } from "@/lib/data";
import { PRODUCT_BY_ID, CONFIG_PRODUCT_BY_ID } from "@/lib/products";
import { fmtILS } from "@/lib/format";

type Tile = { href: string; name: string; price: number; label: string; image?: string; art?: React.ReactNode };

/** "What we print": real photos where we have them (fidgets), illustrations elsewhere. */
export default function ProductShowcase() {
  const fid = (id: string) => FIDGETS.find((f) => f.id === id)!;
  const tiles: Tile[] = [
    { href: "/fidgets/f2", name: fid("f2").name, price: fid("f2").price, label: "פידג'ט", image: fid("f2").thumbnail },
    { href: "/configurator?product=phone_case", name: "קייס לטלפון בעיצוב אישי", price: CONFIG_PRODUCT_BY_ID.phone_case.basePrice, label: "מעצב", art: <ProductArt art="phonecase" hue={200} size={140} /> },
    { href: "/fidgets/f5", name: fid("f5").name, price: fid("f5").price, label: "פידג'ט", image: fid("f5").thumbnail },
    { href: "/products/pet-bone", name: PRODUCT_BY_ID["pet-bone"].name, price: PRODUCT_BY_ID["pet-bone"].price, label: "לחיות", art: <ProductArt art="bone" hue={30} size={140} /> },
    { href: "/catalog", name: "סמל היחידה שלך", price: 65, label: "חיילים", art: <ProductArt art="keychain" hue={145} size={140} /> },
    { href: "/fidgets/f11", name: fid("f11").name, price: fid("f11").price, label: "פידג'ט", image: fid("f11").thumbnail },
    { href: "/products/off-pen-holder", name: PRODUCT_BY_ID["off-pen-holder"].name, price: PRODUCT_BY_ID["off-pen-holder"].price, label: "למשרד", art: <ProductArt art="penholder" hue={200} size={140} /> },
    { href: "/products/home-coasters", name: PRODUCT_BY_ID["home-coasters"].name, price: PRODUCT_BY_ID["home-coasters"].price, label: "לבית", art: <ProductArt art="coaster" hue={20} size={140} /> },
    { href: "/fidgets/f10", name: fid("f10").name, price: fid("f10").price, label: "פידג'ט", image: fid("f10").thumbnail },
    { href: "/configurator?product=name_plate", name: "שלט שם למשרד", price: CONFIG_PRODUCT_BY_ID.name_plate.basePrice, label: "מעצב", art: <ProductArt art="nameplate" hue={260} size={140} /> },
  ];

  return (
    <section className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <SectionHead eyebrow="WHAT WE PRINT" title="מה יוצא מהמדפסת." sub="מוצרים מהמדף, בעיצוב שלך, בצבע שאתה בוחר. לחיצה על מוצר פותחת את העמוד שלו עם צבע, חומר ומחיר." />
          <Btn as="a" href="/trendy" variant="ghost" iconRight="arrowLeft">
            טרנדי כרגע
          </Btn>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {tiles.map((t) => (
            <Link
              key={t.href + t.name}
              href={t.href}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth"
            >
              {t.image ? (
                <Image src={t.image} alt={t.name} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center stripes">{t.art}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-transparent">
                <div className="text-sm font-bold leading-tight line-clamp-1" dir={/[א-ת]/.test(t.name) ? "rtl" : "ltr"}>{t.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-xs text-flame" dir="ltr">{fmtILS(t.price)}</span>
                  <Pill tone="neutral" className="text-[10px] px-1.5 py-0.5">{t.label}</Pill>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
