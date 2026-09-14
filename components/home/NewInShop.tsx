import Image from "next/image";
import Link from "next/link";
import { NEWEST_IN_SHOP } from "@/lib/newest-in-shop";

/**
 * What arrived in the shop most recently — as products, not as decoration.
 *
 * Static on purpose. The carousel this replaced moved by itself, which meant
 * the thing a visitor wanted to look at slid away from under the cursor, and
 * nothing in it was clickable. These sit still and every one of them opens its
 * product page, which is the whole job: a picture on a shop's home page should
 * be a way in, not wallpaper.
 */
export default function NewInShop() {
  if (NEWEST_IN_SHOP.length === 0) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-3">
          NEW IN THE SHOP
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tightest leading-[1.05]">
          מה נכנס לחנות <span className="text-flame">עכשיו</span>.
        </h2>
        <p className="text-ink-400 mt-3 max-w-2xl">
          הדגמים האחרונים שנוספו למדפים. לחיצה פותחת את המוצר.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {NEWEST_IN_SHOP.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="group rounded-2xl bg-ink-900 border border-ink-800 hover:border-flame/50 transition-colors overflow-hidden"
            >
              <div className="relative aspect-square bg-ink-950">
                <Image
                  src={p.src}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  unoptimized
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-ink-100 truncate group-hover:text-flame transition-colors">
                  {p.name}
                </div>
                {/* The designer, named on every card that shows their photograph
                    — the same attribution the product pages carry. */}
                {p.creator && (
                  <div className="text-[11px] text-ink-500 truncate" dir="ltr">
                    {p.creator}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
