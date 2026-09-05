"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Pill from "@/components/ui/Pill";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { FILAMENTS } from "@/lib/data";
import { useOrderStore } from "@/lib/order-store";
import { cn } from "@/lib/cn";

type UploadedFile = { name: string; size: number; ext: string };

const QUALITY = [
  { id: "draft", label: "טיוטה", value: "0.28mm", note: "מהיר. למודלים גדולים שלא צריך פירוט." },
  { id: "std", label: "סטנדרט", value: "0.16mm", note: "ברירת המחדל. רוב ההזמנות." },
  { id: "high", label: "איכות גבוהה", value: "0.08mm", note: "פיגורות, פירוטים מורכבים, מודלים קטנים." },
] as const;

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadClient() {
  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<UploadedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [color, setColor] = useState("orange");
  const [maxSize, setMaxSize] = useState(80);
  const [quality, setQuality] = useState<(typeof QUALITY)[number]["id"]>("std");

  const colorObj = FILAMENTS.find((f) => f.id === color)!;

  const accept = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    setFile({ name: f.name, size: f.size, ext });
  };

  const proceed = () => {
    if (!file) return;
    const qualityLabel = QUALITY.find((q) => q.id === quality)!;
    setOrder({
      title: "הדפסה לפי קובץ שלי",
      summary: [
        `קובץ: ${file.name} (${formatSize(file.size)})`,
        `צבע: ${colorObj.name}`,
        `גודל מקסימלי: ${maxSize}mm`,
        `איכות: ${qualityLabel.label} (${qualityLabel.value})`,
      ],
      price: null,
      source: "upload",
      meta: { file, color, maxSize, quality },
    });
    router.push("/contact");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <Pill tone="cyan" className="mb-3">
          UPLOAD · STL · OBJ · 3MF
        </Pill>
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest leading-[1.05] mb-3">
          יש קובץ. תעלה.
        </h1>
        <p className="text-ink-300 max-w-2xl">
          STL, OBJ, או 3MF — עד 50MB. אני אסתכל ואחזור אליך עם הצעת מחיר תוך 24 שעות.
        </p>
      </header>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) accept(f);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed transition-all p-8 md:p-12 text-center",
          dragOver
            ? "border-flame bg-flame/5"
            : "border-ink-700 bg-ink-900/50 hover:border-ink-600",
        )}
      >
        {!file ? (
          <>
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-ink-800 text-flame mb-4">
              <Icon name="upload" size={28} />
            </div>
            <div className="font-bold text-lg mb-1.5">גרור לכאן קובץ או לחץ לבחירה</div>
            <div className="text-ink-400 text-sm mb-6">
              STL · OBJ · 3MF · עד 50MB
            </div>
            <Btn
              type="button"
              icon="file"
              onClick={() => inputRef.current?.click()}
            >
              בחר קובץ
            </Btn>
            <input
              ref={inputRef}
              type="file"
              accept=".stl,.obj,.3mf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) accept(f);
              }}
            />
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-flame/15 text-flame">
              <Icon name="file" size={18} />
            </span>
            <div className="text-right">
              <div className="font-semibold" dir="ltr">{file.name}</div>
              <div className="text-ink-400 text-xs font-mono" dir="ltr">
                {formatSize(file.size)} · .{file.ext}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 rounded-md bg-ink-800 hover:bg-ink-700 text-xs font-semibold"
              >
                החלף קובץ
              </button>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="px-3 py-1.5 rounded-md bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20 text-xs font-semibold"
              >
                הסר
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".stl,.obj,.3mf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) accept(f);
              }}
            />
          </div>
        )}
      </div>

      {file && (
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          {/* Preview cube */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6">
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-3">
              PREVIEW · TINTED
            </div>
            <div
              className="aspect-square rounded-xl overflow-hidden stripes flex items-center justify-center"
              style={{
                background: `radial-gradient(60% 50% at 50% 40%, ${colorObj.hex}33, transparent 70%), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0) 8px 16px)`,
              }}
            >
              <svg viewBox="0 0 100 100" width="160" height="160">
                <polygon points="50,12 88,32 88,72 50,92 12,72 12,32" fill={colorObj.hex} opacity="0.95" />
                <polygon points="50,12 88,32 50,52 12,32" fill="rgba(255,255,255,0.18)" />
                <polygon points="88,32 88,72 50,92 50,52" fill="rgba(0,0,0,0.25)" />
              </svg>
            </div>
          </div>

          {/* Options */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6 space-y-6">
            <div>
              <div className="text-sm font-semibold mb-2">צבע פילמנט</div>
              <div className="grid grid-cols-6 gap-2">
                {FILAMENTS.slice(0, 12).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setColor(f.id)}
                    aria-label={f.name}
                    className={cn(
                      "aspect-square rounded-lg border-2 relative overflow-hidden",
                      color === f.id ? "border-flame" : "border-ink-800 hover:border-ink-700",
                    )}
                    style={{ backgroundColor: f.hex }}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)",
                      }}
                    />
                    {color === f.id && (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-flame text-white flex items-center justify-center">
                        <Icon name="check" size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold">גודל מקסימלי</span>
                <span className="font-mono text-flame text-sm" dir="ltr">
                  {maxSize}mm
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                value={maxSize}
                onChange={(e) => setMaxSize(Number(e.target.value))}
                className="w-full accent-flame"
              />
              <div className="flex justify-between text-[11px] text-ink-500 mt-1 font-mono" dir="ltr">
                <span>20mm</span>
                <span>200mm</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">איכות הדפסה</div>
              <div className="space-y-2">
                {QUALITY.map((q) => (
                  <label
                    key={q.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      quality === q.id
                        ? "border-flame bg-flame/5"
                        : "border-ink-800 hover:border-ink-700",
                    )}
                  >
                    <input
                      type="radio"
                      name="quality"
                      value={q.id}
                      checked={quality === q.id}
                      onChange={() => setQuality(q.id)}
                      className="mt-1 accent-flame"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{q.label}</span>
                        <span className="font-mono text-xs text-flame" dir="ltr">
                          {q.value}
                        </span>
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">{q.note}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-5 rounded-2xl border border-cyan2/30 bg-cyan2/5 flex items-start gap-3">
        <Icon name="info" size={18} className="text-cyan2 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-300 leading-relaxed">
          לפני שאני מתחיל להדפיס — אם הקובץ דורש התאמות (קירות דקים, אזורים פתוחים, scaling),
          אני אסביר לך לפני שאתה משלם.
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Btn
          size="lg"
          icon="arrowLeft"
          disabled={!file}
          onClick={proceed}
        >
          המשך לטופס
        </Btn>
      </div>
    </div>
  );
}
