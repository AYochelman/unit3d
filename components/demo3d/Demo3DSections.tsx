"use client";
// The two 3D demos, shared by /demo-3d and /admin → "תצוגת עיצוב".
import { useState } from "react";
import StyledKeychain3D from "@/components/demo3d/StyledKeychain3D";
import { STYLES, type StyleId } from "@/components/demo3d/style-meta";
import SpinViewer from "@/components/demo3d/SpinViewer";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

const COLORS = [
  { name: "שחור", hex: "#1d1f1e" },
  { name: "לבן", hex: "#f1f1ee" },
  { name: "ירוק", hex: "#089a47" },
  { name: "אדום", hex: "#c8312b" },
  { name: "כחול", hex: "#2449b8" },
  { name: "סגול", hex: "#6a2bb5" },
  { name: "צהוב", hex: "#e6b420" },
  { name: "אפרסק", hex: "#e8915a" },
  { name: "ורוד", hex: "#e2557c" },
];

const FRAMES = Array.from({ length: 72 }, (_, i) => `/demo/spin/f${String(i).padStart(2, "0")}.webp`);

function Swatches({ value, onChange, label }: { value: string; onChange: (h: string) => void; label: string }) {
  return (
    <div>
      <div className="text-[12px] text-ink-400 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            aria-label={c.name}
            onClick={() => onChange(c.hex)}
            className={cn("h-8 w-8 rounded-full border-2", value === c.hex ? "border-flame scale-110" : "border-ink-700")}
            style={{ background: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Demo3DSections() {
  // Opens on style 2 — the owner's pick.
  const [style, setStyle] = useState<StyleId>("outline");
  const [text, setText] = useState("Olivia");
  const [base, setBase] = useState(STYLES[1].base);
  const [ink, setInk] = useState(STYLES[1].ink);
  const current = STYLES.find((s) => s.id === style)!;

  return (
    <div className="space-y-14">
      <section className="grid md:grid-cols-2 gap-6 items-start">
        <StyledKeychain3D style={style} text={text} textColor={ink} baseColor={base} />
        <div className="space-y-4">
          <div className="font-mono text-[11px] tracking-widest text-flame">1 · במעצב האישי</div>
          <h2 className="text-2xl font-extrabold">תלת-מימד אמיתי, בכל סטייל</h2>
          <p className="text-sm text-ink-300 leading-relaxed">
            הדגם נבנה בדפדפן מהטקסט שהלקוח מקליד, בסטייל שהוא בוחר. כל סטייל משחזר מראה מאחד הקבצים ששלחת, אבל נבנה מאפס
            סביב הטקסט, ולכן בכולם אפשר לערוך את הכיתוב. אין כאן קובץ של אף מעצב, אז אין בעיית רישיון.
          </p>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setStyle(s.id); setInk(s.ink); setBase(s.base); }}
                className={cn("px-3 h-9 rounded-lg text-sm border", style === s.id ? "border-flame text-flame bg-flame/10" : "border-ink-700 text-ink-300")}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-ink-500">{current.hint}</p>
          <label className="block">
            <span className="text-[12px] text-ink-400">הטקסט על המחזיק</span>
            <Input value={text} maxLength={20} onChange={(e) => setText(e.target.value)} className="mt-1" />
          </label>
          <Swatches label={current.colours === 1 ? "צבע" : "צבע הכיתוב"} value={ink} onChange={setInk} />
          {current.colours === 2 && <Swatches label="צבע הבסיס (שני צבעים = AMS)" value={base} onChange={setBase} />}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6 items-start">
        <SpinViewer frames={FRAMES} />
        <div className="space-y-4">
          <div className="font-mono text-[11px] tracking-widest text-flame">2 · במוצרים המיובאים</div>
          <h2 className="text-2xl font-extrabold">סיבוב 360° מתמונות</h2>
          <p className="text-sm text-ink-300 leading-relaxed">
            72 תמונות של הדגם מסביב, וגרירה בוחרת איזו מוצגת. מרגיש כמו תלת-מימד, אבל לדפדפן מגיעות רק תמונות, ולא קובץ
            שאפשר להוריד ולהדפיס. ככה מתאים למוצרים שהרישיון שלהם מתיר למכור הדפסות אבל לא להפיץ את הקובץ.
          </p>
          <p className="text-[12px] text-ink-500 leading-relaxed">
            הדגם כאן הוא אגרטל לדוגמה שנבנה לצורך ההדגמה. במוצר אמיתי מצלמים את הדגם שלו, אחת לכל מוצר.
          </p>
        </div>
      </section>
    </div>
  );
}
