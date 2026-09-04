import Link from "next/link";
import Image from "next/image";
import ProductArt from "@/components/ProductArt";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";
import { fmtOrders } from "@/lib/listing";
import { MATERIAL_BY_ID } from "@/lib/materials";
import { CATEGORY_LABEL } from "@/lib/products";
import type { Product, ProductArtId } from "@/lib/types";

/** One card in any listing. Products, fidgets and configurator picks all map onto this. */
export type ListingCard = {
  id: string;
  href: string;
  name: string;
  desc: string;
  price: number;
  size: string;
  time: string;
  hue: number;
  art?: ProductArtId;
  image?: string;
  tag?: string;
  category: string;
  materialShort?: string;
  colors: number;
  rating: number;
  orders: number;
  isNew?: boolean;
};

export function productToCard(p: Product): ListingCard {
  return {
    id: p.id,
    href: `/products/${p.id}`,
    name: p.name,
    desc: p.desc,
    price: p.price,
    size: p.size,
    time: p.time,
    hue: p.hue,
    art: p.art,
    tag: p.tag,
    category: CATEGORY_LABEL[p.category],
    materialShort: p.material ? MATERIAL_BY_ID[p.material].short : undefined,
    colors: p.colors ?? (p.ams ? 2 : 1),
    rating: p.rating ?? 4.8,
    orders: p.orders ?? 0,
    isNew: p.isNew,
  };
}

export function ListingCardView({ c }: { c: ListingCard }) {
  return (
    <Link
      href={c.href}
      className="group flex flex-col rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth overflow-hidden"
    >
      <div
        className="relative aspect-square flex items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 40%, hsla(${c.hue}, 70%, 50%, 0.22), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
        }}
      >
        {c.image ? (
          <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
        ) : (
          <ProductArt art={c.art ?? "keychain"} hue={c.hue} size={150} className="transition-transform duration-500 group-hover:scale-105" />
        )}
        {c.tag && (
          <span className="absolute top-2 left-2">
            <Pill tone="flame" className="text-[10px] px-1.5 py-0.5">{c.tag}</Pill>
          </span>
        )}
        <span className="absolute top-2 right-2">
          <Pill tone="neutral" className="text-[10px] px-1.5 py-0.5">{c.category}</Pill>
        </span>
        {c.colors > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border backdrop-blur bg-cyan2/15 text-cyan2 border-cyan2/40" dir="ltr">
            AMS · {c.colors}C
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-sm leading-tight" dir={/[א-ת]/.test(c.name) ? "rtl" : "ltr"}>{c.name}</h3>
        <p className="text-ink-400 text-xs leading-snug mt-1 line-clamp-2 min-h-[2.5rem]">{c.desc}</p>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-ink-500" dir="ltr">
          <span>{c.size}</span>
          <span>·</span>
          <span>{c.time}</span>
          {c.materialShort && (
            <>
              <span>·</span>
              <span>{c.materialShort}</span>
            </>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-ink-400">
          <span className="inline-flex items-center gap-0.5 text-flame">
            <Icon name="star" size={10} className="fill-current" />
            <bdi dir="ltr">{c.rating.toFixed(1)}</bdi>
          </span>
          <span>·</span>
          <span><bdi dir="ltr">{fmtOrders(c.orders)}</bdi> הזמנות</span>
        </div>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-mono text-flame text-sm" dir="ltr">{fmtILS(c.price)}</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-300 group-hover:text-flame transition-colors">
            לפרטים
            <Icon name="arrowLeft" size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ProductGrid({ cards }: { cards: ListingCard[] }) {
  if (!cards.length) {
    return <div className="text-center py-16 text-ink-400">אין מוצרים שמתאימים לסינון הזה.</div>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <ListingCardView key={c.id} c={c} />
      ))}
    </div>
  );
}
