"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/Field";
import KeychainPreview from "@/components/KeychainPreview";
import { SHAPES, FONTS, FILAMENTS, SIZES } from "@/lib/data";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useOrderStore } from "@/lib/order-store";

type Config = {
  shape: "round" | "rect" | "emblem" | "custom";
  text: string;
  number: string;
  font: string;
  color: string;
  size: "sm" | "md" | "lg";
  qty: number;
};

const STEPS = [
  { id: "shape", label: "צורה" },
  { id: "text", label: "טקסט" },
  { id: "color", label: "צבע" },
  { id: "size", label: "גודל" },
  { id: "qty", label: "כמות" },
] as const;

export default function ConfiguratorClient() {
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);

  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Config>({
    shape: "round",
    text: "יואב",
    number: "12345",
    font: "sans",
    color: "orange",
    size: "md",
    qty: 1,
  });

  const update = <K extends keyof Config>(k: K, v: Config[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const sizeObj = SIZES.find((s) => s.id === config.size)!;
  const colorObj = FILAMENTS.find((f) => f.id === config.color)!;
  const fontObj = FONTS.find((f) => f.id === config.font)!;
  const unitPrice = useMemo(
    () => 55 + sizeObj.priceAdd + (config.shape === "emblem" ? 10 : 0),
    [sizeObj.priceAdd, config.shape],
  );
  const totalPrice = unitPrice * config.qty;

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const proceed = () => {
    const shapeLabel = SHAPES.find((s) => s.id === config.shape)?.label ?? "";
    setOrder({
      title: "מחזיק מפתחות מותאם",
      summary: [
        `צורה: ${shapeLabel}`,
        `טקסט: "${config.text}${config.number ? " " + config.number : ""}"`,
        `צבע: ${colorObj.name}`,
        `גודל: ${sizeObj.label} (${sizeObj.dim})`,
        `כמות: ${config.qty}`,
      ],
      price: totalPrice,
      source: "configurator",
      meta: { ...config },
    });
    router.push("/contact");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <header className="mb-6 md:mb-10">
        <Pill tone="cyan" className="mb-3">
          CONFIGURATOR · LIVE PREVIEW
        </Pill>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tightest mb-2">
          מעצב מחזיק מפתחות
        </h1>
        <p className="text-ink-300">
          הכל מתעדכן בזמן אמת. כשתסיים, נעבור לטופס יצירת קשר עם הבחירות שלך.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Preview */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <div className="sticky top-20 rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden">
            <div className="relative aspect-square md:aspect-[4/3] timelapse printer-grid flex items-center justify-center overflow-hidden">
              <KeychainPreview
                shape={config.shape}
                text={config.text}
                number={config.number}
                colorObj={colorObj}
                fontObj={fontObj}
              />
              <div
                className="absolute top-4 right-4 font-mono text-[10px] tracking-widest text-ink-400 flex items-center gap-2"
                dir="ltr"
              >
                <span className="w-1.5 h-1.5 bg-cyan2 rounded-full live-dot" />
                LIVE PREVIEW
              </div>
              <div
                className="absolute bottom-4 right-4 left-4 flex items-end justify-between font-mono text-[10px] text-ink-400"
                dir="ltr"
              >
                <span>
                  {sizeObj.dim} · ~{sizeObj.time}
                </span>
                <span>FILAMENT · {colorObj.desc}</span>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    aria-label={`view ${i + 1}`}
                    className={cn(
                      "w-8 h-2 rounded-full transition-colors",
                      i === 0 ? "bg-flame" : "bg-ink-700 hover:bg-ink-600",
                    )}
                  />
                ))}
              </div>
            </div>
            <div
              className="grid grid-cols-4 divide-x divide-ink-800 rtl:divide-x-reverse border-t border-ink-800 font-mono text-[11px]"
              dir="ltr"
            >
              <div className="px-4 py-3">
                <div className="text-ink-500">SHAPE</div>
                <div className="text-ink-100 font-semibold">{config.shape.toUpperCase()}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-ink-500">SIZE</div>
                <div className="text-ink-100 font-semibold">{sizeObj.dim}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-ink-500">TIME</div>
                <div className="text-ink-100 font-semibold">~{sizeObj.time}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-ink-500">QTY</div>
                <div className="text-ink-100 font-semibold">×{config.qty}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Config panel */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5 md:p-6">
            <div className="flex items-center gap-1 mb-6">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  className="flex-1 text-right group"
                >
                  <div
                    className={cn(
                      "h-1 rounded-full mb-2 transition-colors",
                      i <= step ? "bg-flame" : "bg-ink-800",
                    )}
                  />
                  <div
                    className={cn(
                      "font-mono text-[10px] tracking-wider",
                      i === step ? "text-flame" : "text-ink-500",
                    )}
                    dir="ltr"
                  >
                    {String(i + 1).padStart(2, "0")} · {s.label}
                  </div>
                </button>
              ))}
            </div>

            <div className="min-h-[280px]">
              {step === 0 && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">בחר צורת בסיס</h3>
                  <p className="text-sm text-ink-400 mb-5">מה הצורה הכללית של המחזיק?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SHAPES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => update("shape", s.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-right transition-all",
                          config.shape === s.id
                            ? "border-flame bg-flame/5"
                            : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        <div
                          className={cn(
                            "text-3xl mb-2",
                            config.shape === s.id ? "text-flame" : "text-ink-400",
                          )}
                        >
                          {s.icon}
                        </div>
                        <div className="font-semibold">{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">טקסט מותאם</h3>
                  <p className="text-sm text-ink-400 mb-5">
                    שם, מספר אישי, או שניהם. עד 12 תווים בכל שדה.
                  </p>
                  <div className="space-y-3 mb-5">
                    <Field label="שורה ראשונה (שם)">
                      <Input
                        value={config.text}
                        onChange={(e) => update("text", e.target.value.slice(0, 12))}
                        placeholder="יואב"
                      />
                    </Field>
                    <Field label="שורה שנייה" optional>
                      <Input
                        value={config.number}
                        onChange={(e) => update("number", e.target.value.slice(0, 12))}
                        placeholder="מספר אישי, יחידה, או תאריך"
                      />
                    </Field>
                  </div>
                  <div className="text-sm font-semibold mb-2">פונט</div>
                  <div className="grid grid-cols-3 gap-2">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => update("font", f.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 text-center transition-all",
                          config.font === f.id
                            ? "border-flame bg-flame/5"
                            : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        <div
                          style={{
                            fontFamily: f.css,
                            fontWeight: f.weight,
                            letterSpacing: f.letter || "normal",
                            textTransform: f.upper ? "uppercase" : "none",
                          }}
                          className="text-xl mb-1"
                        >
                          {f.preview}
                        </div>
                        <div className="text-[10px] text-ink-400 font-mono">{f.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">צבע פילמנט</h3>
                  <p className="text-sm text-ink-400 mb-5">
                    בחר מתוך {FILAMENTS.length} צבעים שיש לי במלאי כרגע.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {FILAMENTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => update("color", f.id)}
                        className={cn(
                          "p-2 rounded-xl border-2 transition-all",
                          config.color === f.id
                            ? "border-flame"
                            : "border-ink-800 hover:border-ink-700",
                        )}
                      >
                        <div
                          className="aspect-square rounded-lg mb-1.5 relative overflow-hidden"
                          style={{ backgroundColor: f.hex }}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)",
                            }}
                          />
                          {config.color === f.id && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-flame text-white flex items-center justify-center">
                              <Icon name="check" size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold leading-tight truncate">
                          {f.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">גודל</h3>
                  <p className="text-sm text-ink-400 mb-5">
                    המידות וזמן ההדפסה משוערים — המחיר משתנה בהתאם.
                  </p>
                  <div className="space-y-2">
                    {SIZES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => update("size", s.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 flex items-center gap-4 text-right transition-all",
                          config.size === s.id
                            ? "border-flame bg-flame/5"
                            : "border-ink-800 bg-ink-950 hover:border-ink-700",
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold",
                            config.size === s.id
                              ? "border-flame bg-flame text-white"
                              : "border-ink-700 text-ink-400",
                          )}
                        >
                          {s.label.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{s.label}</div>
                          <div className="font-mono text-xs text-ink-400" dir="ltr">
                            {s.dim} · ~{s.time}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-flame">
                          {s.priceAdd > 0 ? `+${fmtILS(s.priceAdd)}` : "כלול"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="text-xl font-extrabold mb-1">כמה לעשות?</h3>
                  <p className="text-sm text-ink-400 mb-5">
                    הזמנות מעל 5 — הנחה אוטומטית. הזמנות לטקסים — דבר איתי בוואטסאפ.
                  </p>
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => update("qty", Math.max(1, config.qty - 1))}
                      aria-label="הפחת"
                      className="w-12 h-12 rounded-xl bg-ink-800 hover:bg-ink-700 flex items-center justify-center"
                    >
                      <Icon name="minus" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="font-mono text-6xl font-bold tabular-nums" dir="ltr">
                        {config.qty}
                      </div>
                      <div className="text-xs text-ink-400">יחידות</div>
                    </div>
                    <button
                      onClick={() => update("qty", config.qty + 1)}
                      aria-label="הוסף"
                      className="w-12 h-12 rounded-xl bg-ink-800 hover:bg-ink-700 flex items-center justify-center"
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 5, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => update("qty", n)}
                        className={cn(
                          "h-9 rounded-lg font-mono font-semibold",
                          config.qty === n
                            ? "bg-flame text-white"
                            : "bg-ink-800 text-ink-300 hover:bg-ink-700",
                        )}
                      >
                        ×{n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-ink-800">
              <Btn
                variant="ghost"
                icon="arrowRight"
                onClick={goPrev}
                disabled={step === 0}
              >
                הקודם
              </Btn>
              {step < STEPS.length - 1 ? (
                <Btn variant="primary" iconRight="arrowLeft" onClick={goNext} className="flex-1">
                  המשך
                </Btn>
              ) : (
                <Btn variant="primary" iconRight="arrowLeft" onClick={proceed} className="flex-1">
                  המשך לטופס
                </Btn>
              )}
            </div>
          </div>

          {/* Price summary */}
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-bl from-flame/10 to-cyan2/5 border border-flame/20">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold text-ink-300">מחיר משוער</span>
              <span className="font-mono text-[11px] text-ink-400" dir="ltr">
                {unitPrice} × {config.qty}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight">{fmtILS(totalPrice)}</span>
              {config.qty >= 5 && <Pill tone="good">הנחת כמות</Pill>}
            </div>
            <div className="text-xs text-ink-400 mt-2">
              משלוח ייחושב בשיחה. הזמנות מעל ₪200 — חינם.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
