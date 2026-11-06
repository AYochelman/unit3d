"use client";
// The two 3D demos, shared by /demo-3d and /admin → "תצוגת עיצוב".
import { useState } from "react";
import Keychain3D from "@/components/demo3d/Keychain3D";
import SpinViewer from "@/components/demo3d/SpinViewer";
import Model3D, { type ModelInfo } from "@/components/demo3d/Model3D";
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

// Converted from the owner's own .3mf files with scripts/3mf-to-web.py.
const MODELS = [
  { id: "olivia", label: "Olivia · שם" },
  { id: "slay", label: "Slay" },
  { id: "playground", label: "Playground" },
  { id: "multi", label: "שלישייה" },
  { id: "chevrolet", label: "Chevrolet" },
];

function ModelGallery() {
  const [model, setModel] = useState(MODELS[0].id);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [colours, setColours] = useState<Record<string, Record<number, string>>>({});
  const mine = colours[model] ?? {};
  const setColour = (f: number, hex: string) => setColours((c) => ({ ...c, [model]: { ...(c[model] ?? {}), [f]: hex } }));

  return (
    <section className="grid md:grid-cols-2 gap-6 items-start">
      <Model3D key={model} src={`/demo/models/${model}`} colours={mine} onInfo={setInfo} />
      <div className="space-y-4">
        <div className="font-mono text-[11px] tracking-widest text-flame">2 · קבצי הדפסה אמיתיים</div>
        <h2 className="text-2xl font-extrabold">הקובץ עצמו, כל צבע ניתן לשינוי</h2>
        <p className="text-sm text-ink-300 leading-relaxed">
          קבצי ה-3MF ששלחת, כמו שהם יוצאים מ-Bambu Studio: כל חלק או אזור צבוע מקבל את הפילמנט שלו, ואפשר להחליף כל צבע
          ולראות מיד. הטקסט עצמו &quot;אפוי&quot; בקובץ ולא ניתן לשינוי — לטקסט שהלקוח כותב יש את המחזיק שלמעלה.
        </p>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setInfo(null); setModel(m.id); }}
              className={cn("px-3 h-9 rounded-lg text-sm border", model === m.id ? "border-flame text-flame bg-flame/10" : "border-ink-700 text-ink-300")}
            >
              {m.label}
            </button>
          ))}
        </div>
        {info && (
          <div className="space-y-3">
            <div className="text-[12px] text-ink-500" dir="rtl">
              מידות: <bdi dir="ltr">{info.size[0]}×{info.size[1]}×{info.size[2]} mm</bdi> · {info.parts.length} צבעים
            </div>
            {info.parts.map((p, i) => (
              <Swatches
                key={p.filament}
                label={`צבע ${i + 1}`}
                value={mine[p.filament] ?? p.colour}
                onChange={(h) => setColour(p.filament, h)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

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
  const [text, setText] = useState("גדוד צבר 432");
  const [plate, setPlate] = useState("#1d1f1e");
  const [ink, setInk] = useState("#6a2bb5");

  return (
    <div className="space-y-14">
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

      <ModelGallery />

      <section className="grid md:grid-cols-2 gap-6 items-start">
        <SpinViewer frames={FRAMES} />
        <div className="space-y-4">
          <div className="font-mono text-[11px] tracking-widest text-flame">3 · במוצרים המיובאים</div>
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
