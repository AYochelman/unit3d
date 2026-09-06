"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/Field";
import ProductArt from "@/components/ProductArt";
import { FILAMENTS, FIDGETS } from "@/lib/data";
import { PRODUCT_BY_ID } from "@/lib/products";
import { PERSONALIZE_PRICE } from "@/lib/personalize";
import { useOrderStore } from "@/lib/order-store";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * "Put my own text on it" — one page, the same for every product in the shop.
 *
 * The full configurator designs ten generic bases from scratch; this is the
 * other half of the job and the one most customers actually want: take the
 * thing they are already looking at and write on it. The product arrives in
 * ?item= and is filled in for them, so the only thing to type is the text.
 */
export default function PersonalizeClient() {
  const params = useSearchParams();
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);

  const id = params?.get("item") ?? "";
  const item = useMemo(() => {
    const p = PRODUCT_BY_ID[id];
    if (p) return { name: p.name, price: p.price, image: p.image, art: p.art, hue: p.hue, href: `/products/${p.id}` };
    const f = FIDGETS.find((x) => x.id === id);
    if (f) return { name: f.name, price: f.price, image: f.thumbnail ?? f.images?.[0], art: undefined, hue: f.hue, href: `/fidgets/${f.id}` };
    return null;
  }, [id]);

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [colorId, setColorId] = useState(FILAMENTS[2].id);
  const color = FILAMENTS.find((c) => c.id === colorId) ?? FILAMENTS[0];

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-ink-400">
        לא נבחר מוצר.{" "}
        <Link href="/catalog" className="text-flame underline">לחנות</Link>
      </div>
    );
  }

  const total = item.price + PERSONALIZE_PRICE;

  const proceed = () => {
    setOrder({
      title: `${item.name} עם טקסט אישי`,
      summary: [
        `מוצר: ${item.name}`,
        `טקסט: "${line1}"${line2 ? ` · "${line2}"` : ""}`,
        `צבע: ${color.name}`,
        `תוספת טקסט אישי: ${fmtILS(PERSONALIZE_PRICE)}`,
      ],
      price: total,
      source: "configurator",
      meta: { item: id, line1, line2, color: colorId },
    });
    router.push("/contact");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <Pill tone="cyan" className="mb-4">טקסט אישי</Pill>
      <h1 className="text-3xl md:text-5xl font-black tracking-tightest leading-[1.05] mb-3">
        מה לכתוב על זה?
      </h1>
      <p className="text-ink-300 mb-8">
        שם, תאריך, מספר אישי או משפט. תוספת אחידה של {fmtILS(PERSONALIZE_PRICE)} על כל מוצר בחנות,
        ואני חוזר אליך עם תצוגה לפני שמתחילים להדפיס.
      </p>

      {/* the product, filled in from the button that sent us here */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-ink-800 bg-ink-900 mb-6">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-950 flex items-center justify-center">
          {item.image ? (
            <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <ProductArt art={item.art ?? "keychain"} hue={item.hue ?? 145} size={64} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-ink-400">המוצר שבחרת</div>
          <div className="font-bold truncate">{item.name}</div>
          <div className="font-mono text-xs text-ink-400 mt-0.5" dir="ltr">{fmtILS(item.price)}</div>
        </div>
        <Link href={item.href} className="shrink-0 text-xs font-semibold text-cyan2 hover:underline">
          לעמוד המוצר
        </Link>
      </div>

      <div className="grid gap-4 mb-6">
        <Field label="הטקסט על המוצר">
          <Input value={line1} onChange={(e) => setLine1(e.target.value.slice(0, 24))} placeholder="יואב" maxLength={24} />
        </Field>
        <Field label="שורה שנייה (לא חובה)">
          <Input value={line2} onChange={(e) => setLine2(e.target.value.slice(0, 24))} placeholder="050-0000000" maxLength={24} />
        </Field>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-ink-300 mb-2.5">
          צבע: <span className="text-ink-100 font-normal">{color.name}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {FILAMENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              title={c.name}
              aria-label={c.name}
              aria-pressed={colorId === c.id}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                colorId === c.id ? "border-white scale-110 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]" : "border-ink-700/50",
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-ink-800 bg-ink-900 mb-4">
        <div>
          <div className="text-[11px] text-ink-400">מחיר סופי</div>
          <div className="font-mono text-2xl text-flame" dir="ltr">{fmtILS(total)}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">
            <bdi dir="ltr">{fmtILS(item.price)}</bdi> + <bdi dir="ltr">{fmtILS(PERSONALIZE_PRICE)}</bdi> טקסט אישי
          </div>
        </div>
        <Btn size="lg" icon="sparkles" onClick={proceed} disabled={!line1.trim()}>
          המשך להזמנה
        </Btn>
      </div>
      {!line1.trim() && <p className="text-xs text-ink-500">כתוב לפחות שורה אחת כדי להמשיך.</p>}

      <Link href="/configurator" className="mt-8 block p-5 rounded-2xl border border-cyan2/30 bg-gradient-to-bl from-cyan2/10 to-flame/5 hover:border-cyan2/60 transition-colors">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-cyan2/15 text-cyan2"><Icon name="sparkles" size={20} /></span>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold mb-0.5">רוצה לצייר עיצוב שלם, לא רק טקסט?</div>
            <div className="text-sm text-ink-300">במעצב המלא אפשר צורות, כמה צבעים ופריסה חופשית.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-cyan2 font-semibold text-sm">למעצב<Icon name="arrowLeft" size={14} /></span>
        </div>
      </Link>
    </div>
  );
}
