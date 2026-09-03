import Link from "next/link";
import ProductArt from "@/components/ProductArt";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtILS } from "@/lib/format";
import { MATERIAL_BY_ID } from "@/lib/materials";
import { CATEGORY_LABEL } from "@/lib/products";
import type { Product } from "@/lib/types";

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return <div className="text-center py-16 text-ink-400">אין מוצרים בקטגוריה הזו עדיין.</div>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          className="group flex flex-col rounded-2xl bg-ink-900 border border-ink-800 hover:border-ink-700 hover:-translate-y-1 transition-all duration-300 ease-smooth overflow-hidden"
        >
          <div
            className="relative aspect-square flex items-center justify-center stripes"
            style={{
              background: `radial-gradient(circle at 50% 40%, hsla(${p.hue}, 70%, 50%, 0.22), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
            }}
          >
            <ProductArt art={p.art} hue={p.hue} size={150} className="transition-transform duration-500 group-hover:scale-105" />
            {p.tag && (
              <span className="absolute top-2 left-2">
                <Pill tone="flame" className="text-[10px] px-1.5 py-0.5">{p.tag}</Pill>
              </span>
            )}
            <span className="absolute top-2 right-2">
              <Pill tone="neutral" className="text-[10px] px-1.5 py-0.5">{CATEGORY_LABEL[p.category]}</Pill>
            </span>
            {p.ams && (
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border backdrop-blur bg-cyan2/15 text-cyan2 border-cyan2/40" dir="ltr">
                AMS
              </span>
            )}
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h3 className="font-bold text-sm leading-tight">{p.name}</h3>
            <p className="text-ink-400 text-xs leading-snug mt-1 line-clamp-2 min-h-[2.5rem]">{p.desc}</p>
            <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-ink-500" dir="ltr">
              <span>{p.size}</span>
              <span>·</span>
              <span>{p.time}</span>
              {p.material && (
                <>
                  <span>·</span>
                  <span>{MATERIAL_BY_ID[p.material].short}</span>
                </>
              )}
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="font-mono text-flame text-sm" dir="ltr">{fmtILS(p.price)}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-300 group-hover:text-flame transition-colors">
                לפרטים
                <Icon name="arrowLeft" size={12} />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
