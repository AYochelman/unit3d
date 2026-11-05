"use client";
import { useState } from "react";
import Keychain3D from "@/components/demo3d/Keychain3D";
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
];

const FRAMES = Array.from({ length: 36 }, (_, i) => `/demo/spin/f${String(i).padStart(2, "0")}.webp`);

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

export default function Demo3DClient() {
  const [text, setText] = useState("גדוד צבר 432");
  const [plate, setPlate] = useState("#1d1f1e");
  const [ink, setInk] = useState("#6a2bb5");

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-10 py-10 space-y-14">
      <header>
        <div className="font-mono text-[11px] tracking-widest text-ink-500 mb-2">DEMO · לא מופיע באתר</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">שתי דרכים להראות מוצר מכל הכיוונים</h1>
      </header>

      <section className="grid md:grid-cols-2 gap-6 items-start">
        <Keychain3D text={text} plateColor={plate} textColor={ink} />
        <div className="space-y-4">
          <div className="font-mono text-[11px] tracking-widest text-flame">1 · במעצב האישי</div>
          <h2 className="text-2xl font-extrabold">תלת-מימד אמיתי, בזמן אמת</h2>
          <p className="text-sm text-ink-300 leading-relaxed">
            זה הדגם עצמו, נבנה בדפדפן מהטקסט שהלקוח מקליד: לוחית עם חור לטבעת, והכיתוב מורם מעליה. כותבים, מחליפים צבע,
            ורואים את המחזיק מכל צד לפני שמזמינים. אין כאן קובץ של אף מעצב, אז אין בעיית רישיון.
          </p>
          <label className="block">
            <span className="text-[12px] text-ink-400">הטקסט על המחזיק</span>
            <Input value={text} maxLength={24} onChange={(e) => setText(e.target.value)} className="mt-1" />
          </label>
          <Swatches label="צבע הלוחית" value={plate} onChange={setPlate} />
          <Swatches label="צבע הכיתוב (שני צבעים = AMS)" value={ink} onChange={setInk} />
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6 items-start">
        <SpinViewer frames={FRAMES} />
        <div className="space-y-4">
          <div className="font-mono text-[11px] tracking-widest text-flame">2 · במוצרים המיובאים</div>
          <h2 className="text-2xl font-extrabold">סיבוב 360° מתמונות</h2>
          <p className="text-sm text-ink-300 leading-relaxed">
            36 תמונות של הדגם מסביב, וגרירה בוחרת איזו מוצגת. מרגיש כמו תלת-מימד, אבל לדפדפן מגיעות רק תמונות, ולא קובץ
            שאפשר להוריד ולהדפיס. ככה מתאים למוצרים שהרישיון שלהם מתיר למכור הדפסות אבל לא להפיץ את הקובץ.
          </p>
          <p className="text-[12px] text-ink-500 leading-relaxed">
            הדגם כאן הוא אגרטל לדוגמה שנבנה לצורך ההדגמה. במוצר אמיתי מצלמים את הדגם שלו, אחת לכל מוצר.
          </p>
        </div>
      </section>
    </main>
  );
}
