"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { useNow } from "@/components/bf/BlackFridayBar";
import { useAdminStore } from "@/lib/admin-store";
import { useLivePrice, useLivePricer } from "@/lib/live-price";
import { dailyChoices, dailyPick, type DailyItem } from "@/lib/daily";
import { useSiteFile } from "@/lib/site-file";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useExit, usePauseBehind } from "@/lib/use-exit";

/**
 * "מוצר היום" on the home page.
 *
 * The visitor sees one product, large, with its live price and a way in. The
 * owner, with /admin open, also sees a button that opens every product in the
 * shop to pick from; "save to site" then makes the pick everyone's. Rendered
 * after mount only: the automatic pick depends on today's date, and the static
 * HTML was built on another day.
 */
export default function ProductOfDay() {
  const now = useNow(60_000);
  const daily = useAdminStore((s) => s.daily);
  const unlocked = useAdminStore((s) => s.unlocked);
  const [picking, setPicking] = useState(false);
  const pick = now == null ? null : dailyPick(daily, now);
  if (!pick) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <DailyCard item={pick.item} />
        {unlocked && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-flame/50 bg-flame/5 px-4 py-3 text-sm">
            <Icon name="sparkles" size={16} className="text-flame" />
            <span className="text-ink-200">
              {pick.picked ? "בחרת את המוצר הזה." : "האתר בחר אוטומטית לפי התאריך."}
            </span>
            <button type="button" onClick={() => setPicking(true)} className="ms-auto rounded-lg bg-flame px-3 py-1.5 font-bold text-white hover:bg-flame-600">
              בחירת מוצר היום
            </button>
          </div>
        )}
      </div>
      {picking && <DailyPicker current={daily} onClose={() => setPicking(false)} />}
    </section>
  );
}

function DailyCard({ item }: { item: DailyItem }) {
  const price = useLivePrice({ id: item.id, price: item.price, grams: item.grams, hours: item.hours, material: item.material, colors: 1 });
  return (
    <Link
      href={item.href}
      className="group grid md:grid-cols-2 items-center gap-5 md:gap-10 rounded-3xl border border-ink-800 bg-[radial-gradient(circle_at_70%_30%,#123a26,#06150e_70%)] p-4 md:p-6 hover:border-flame/60 transition-colors"
    >
      {/* Concentric corners: the outer radius (24px) minus the padding. */}
      <div className="relative aspect-square md:aspect-[4/3] overflow-hidden rounded-[8px] md:rounded-[12px] bg-ink-950">
        <Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized />
      </div>
      <div className="px-1 md:px-0 pb-2 md:pb-0">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-flame/15 px-3 py-1 text-xs font-bold text-flame">
          <Icon name="sparkles" size={13} />
          מוצר היום
        </div>
        <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tightest leading-heading">{item.name}</h2>
        {item.desc && <p className="mt-3 text-ink-300 max-w-xl line-clamp-3">{item.desc}</p>}
        <div className="mt-5 flex items-center gap-4">
          {price > 0 && <span className="font-mono text-2xl font-bold"><bdi>{fmtILS(price)}</bdi></span>}
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-flame px-4 py-2.5 font-bold text-white group-hover:bg-flame-600 transition-colors">
            לפרטים
            <Icon name="arrowLeft" size={16} strokeWidth={2.25} />
          </span>
        </div>
      </div>
    </Link>
  );
}

const SHOWN = 60;

function DailyPicker({ current, onClose }: { current: string | null; onClose: () => void }) {
  const setDaily = useAdminStore((s) => s.setDaily);
  const siteFile = useSiteFile();
  const priceOf = useLivePricer();
  const { closing, close } = useExit();
  usePauseBehind(true);
  const [q, setQ] = useState("");
  const all = useMemo(() => dailyChoices(), []);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const hit = t ? all.filter((x) => x.name.toLowerCase().includes(t) || x.id.includes(t)) : all;
    return hit.slice(0, SHOWN);
  }, [all, q]);
  const total = q.trim() ? all.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase())).length : all.length;

  return (
    <div data-closing={closing || undefined} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="daily-title">
      <div className="m-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => close(onClose)} />
      <div className="m-sheet m-sm-pop surface-raised relative w-full sm:max-w-3xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-ink-700">
        <div className="p-5 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <h2 id="daily-title" className="text-xl font-extrabold">בחירת מוצר היום</h2>
            <span className="text-xs text-ink-500">{all.length} מוצרים</span>
            <button type="button" onClick={() => close(onClose)} aria-label="סגור" className="ms-auto h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-ink-800">
              <Icon name="x" size={18} />
            </button>
          </div>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש לפי שם…"
            className="w-full h-11 rounded-xl bg-ink-950 border border-ink-700 px-4 text-sm outline-none focus:border-flame"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-3">
            {rows.map((x) => {
              const on = x.key === current;
              return (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => setDaily(x.key)}
                  aria-pressed={on}
                  className={cn("text-right rounded-2xl border-2 overflow-hidden bg-ink-950 transition-colors", on ? "border-flame" : "border-ink-800 hover:border-ink-600")}
                >
                  <div className="relative aspect-square">
                    <Image src={x.image} alt="" fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover" unoptimized />
                    {on && <span className="absolute top-2 left-2 rounded-full bg-flame px-2 py-0.5 text-[11px] font-bold text-white">נבחר</span>}
                  </div>
                  <div className="p-2">
                    <div className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[2.5em]">{x.name}</div>
                    <div className="text-xs text-ink-400 font-mono"><bdi>{fmtILS(priceOf({ id: x.id, price: x.price, grams: x.grams, hours: x.hours, material: x.material, colors: 1 }))}</bdi></div>
                  </div>
                </button>
              );
            })}
          </div>
          {total > rows.length && (
            <p className="text-center text-xs text-ink-500 pb-3">מוצגים {rows.length} מתוך {total}. חיפוש מצמצם.</p>
          )}
        </div>

        <div className="border-t border-ink-800 p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink-300">הבחירה נראית אצלך מיד. כדי שכל המבקרים יראו אותה, שומרים לאתר:</span>
            {current && (
              <button type="button" onClick={() => setDaily(null)} className="text-ink-400 underline underline-offset-4 hover:text-ink-200">
                חזרה לבחירה אוטומטית
              </button>
            )}
          </div>
          <AdminSaveToSite json={siteFile} title="שמירה לאתר" what="מוצר היום" />
        </div>
      </div>
    </div>
  );
}
