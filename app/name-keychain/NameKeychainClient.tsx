"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StyledKeychain3D from "@/components/demo3d/StyledKeychain3D";
import { STYLES, nearestFilament, type StyleId } from "@/components/demo3d/styles";
import { ProximityH1 } from "@/components/ui/variable-font-cursor-proximity";
import Btn from "@/components/ui/Btn";
import Pill from "@/components/ui/Pill";
import { Input } from "@/components/ui/Field";
import { useFilaments } from "@/lib/palette";
import type { Filament } from "@/lib/types";
import { useAdminStore } from "@/lib/admin-store";
import { isColorInStock } from "@/lib/inventory";
import { MATERIAL_BY_ID, materialFromFilamentDesc } from "@/lib/materials";
import { useLivePrice } from "@/lib/live-price";
import { CONFIG_PRODUCT_BY_ID } from "@/lib/products";
import { EXTRA_COLOR_PRICE as PERSONALIZE_EXTRA_COLOR } from "@/lib/personalize";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

function Swatches({ choices, value, onPick, label }: { choices: Filament[]; value: string; onPick: (id: string) => void; label: string }) {
  return (
    <div>
      <div className="text-[12px] text-ink-400 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-2">
        {choices.map((f) => (
          <button
            key={f.id}
            type="button"
            title={f.name}
            aria-label={f.name}
            onClick={() => onPick(f.id)}
            className={cn("h-9 w-9 rounded-full border-2 transition-transform", value === f.id ? "border-flame scale-110" : "border-ink-700")}
            style={{ backgroundColor: f.hex }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The 3D name keychain on a page of its own, so it is seen: the live model is
 * the whole first screen. Choosing happens here; "להזמנה" hands the choice to
 * the configurator's last step (quantity), which prices and sends it the same
 * way as every other designer product.
 */
export default function NameKeychainClient() {
  const router = useRouter();
  const filaments = useFilaments();
  const stock = useAdminStore((s) => s.stock);
  const choices = useMemo(() => {
    const ok = filaments.filter((f) => isColorInStock(stock, materialFromFilamentDesc(f.desc), f.id));
    return ok.length ? ok : filaments;
  }, [filaments, stock]);

  const [style, setStyle] = useState<StyleId>("outline");
  const [text, setText] = useState("Olivia");
  // null = "the style's own colour": resolved against what is in stock on
  // every render, because the stock list arrives a moment after the page does
  // (AdminSettingsBoot) and a colour fixed at first render can be gone by then.
  const [c1, setC1] = useState<string | null>(null);
  const [c2, setC2] = useState<string | null>(null);
  const st = STYLES.find((s) => s.id === style)!;
  const f1 = choices.find((f) => f.id === c1) ?? nearestFilament(st.ink, choices) ?? choices[0];
  const f2 = choices.find((f) => f.id === c2) ?? nearestFilament(st.base, choices) ?? f1;
  const two = st.colours === 2 && f2.id !== f1.id;

  const product = CONFIG_PRODUCT_BY_ID.name_keychain;
  const base = useLivePrice({ id: `cfg-${product.id}`, price: product.basePrice, grams: product.grams, hours: product.hours, material: product.material });
  // The same sum the configurator makes: the material delta of the text colour
  // over the product's own material, and a second filament.
  const matDelta = Math.max(0, MATERIAL_BY_ID[materialFromFilamentDesc(f1.desc)].priceAdd - MATERIAL_BY_ID[product.material].priceAdd);
  const price = base + matDelta + (two ? PERSONALIZE_EXTRA_COLOR : 0);

  const pickStyle = (s: (typeof STYLES)[number]) => {
    setStyle(s.id);
    setC1(null);
    setC2(null);
  };

  const order = () => {
    const q = new URLSearchParams({ product: "name_keychain", style, text: text.trim() || "שם", c1: f1.id, c2: st.colours === 2 ? f2.id : f1.id });
    router.push(`/configurator?${q.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-10 py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <Pill tone="cyan" className="mb-3">חדש · תלת-מימד חי</Pill>
        <ProximityH1 className="text-3xl md:text-5xl font-extrabold tracking-tightest mb-2">השם שלך, בתלת-מימד</ProximityH1>
        <p className="text-ink-300 max-w-2xl">
          כותבים שם, בוחרים סטייל וצבעים — והמחזיק נבנה מולכם. גוררים כדי לסובב ולראות אותו מכל צד, בדיוק כמו שהוא יצא מהמדפסת.
        </p>
      </header>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 lg:sticky lg:top-20">
          <StyledKeychain3D style={style} text={text} textColor={f1.hex} baseColor={st.colours === 2 ? f2.hex : f1.hex} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold">השם</span>
            <Input value={text} maxLength={16} onChange={(e) => setText(e.target.value)} className="mt-1.5 text-lg" placeholder="השם שלך" />
          </label>

          <div>
            <div className="text-sm font-semibold mb-2">סטייל</div>
            <div className="grid grid-cols-1 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStyle(s)}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center gap-3 text-right transition-colors",
                    style === s.id ? "border-flame bg-flame/5" : "border-ink-800 bg-ink-950 hover:border-ink-700",
                  )}
                >
                  <span className="flex -space-x-1.5 shrink-0" dir="ltr">
                    <span className="w-5 h-5 rounded-full border border-ink-700" style={{ background: s.ink }} />
                    {s.colours === 2 && <span className="w-5 h-5 rounded-full border border-ink-700" style={{ background: s.base }} />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">{s.label}</span>
                    <span className="block text-[11px] text-ink-400">{s.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Swatches choices={choices} label={st.colours === 2 ? "צבע הכיתוב" : "צבע"} value={f1.id} onPick={setC1} />
          {st.colours === 2 && <Swatches choices={choices} label="צבע הבסיס" value={f2.id} onPick={setC2} />}

          <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-ink-400">מחיר ליחידה</div>
              <div className="text-3xl font-black">{fmtILS(price)}</div>
              {two && <div className="text-[11px] text-ink-500">כולל {fmtILS(PERSONALIZE_EXTRA_COLOR)} לצבע שני</div>}
            </div>
            <Btn size="lg" icon="arrowLeft" onClick={order}>להזמנה</Btn>
          </div>
          <p className="text-[11px] text-ink-500">בשלב הבא בוחרים כמות. מודפס אצלנו, ונשלח תוך כמה ימי עסקים.</p>
        </div>
      </div>
    </div>
  );
}
