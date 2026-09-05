"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/Field";
import { MATERIAL_BY_ID } from "@/lib/materials";
import { FILAMENTS } from "@/lib/data";
import { useAdminStore } from "@/lib/admin-store";
import { colorsInStock, DEFAULT_MATERIAL } from "@/lib/inventory";
import type { MaterialId } from "@/lib/types";

const WA = "https://wa.me/972500000000";
const MAIL = "hello@unit3d.example.com";

type Props = {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  material?: MaterialId;
};

/**
 * "Tell me when this is back."
 *
 * Shown when someone taps a product we cannot print right now. It records the
 * request in the admin store — which is what feeds the buy-next advice in
 * /admin — and then sends it to Ariel over WhatsApp or e-mail, because a store
 * that lives in one browser session cannot reach him on its own. The copy says
 * so rather than implying an automatic e-mail will arrive.
 */
export default function RestockModal({ open, onClose, itemId, itemName, material }: Props) {
  const stock = useAdminStore((s) => s.stock);
  const addInterest = useAdminStore((s) => s.addInterest);
  const [email, setEmail] = useState("");
  const [color, setColor] = useState<string>("");
  const [done, setDone] = useState(false);

  const mat = material ?? DEFAULT_MATERIAL;
  const matName = MATERIAL_BY_ID[mat].name;
  const alternatives = FILAMENTS.filter((f) => colorsInStock(stock, mat).includes(f.id)).slice(0, 6);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const valid = /.+@.+\..+/.test(email);

  const submit = (channel: "wa" | "mail") => {
    addInterest({ itemId, itemName, material: mat, color: color || undefined, email });
    const body = [
      "בקשה לעדכון חזרה למלאי",
      `מוצר: ${itemName}`,
      `חומר: ${matName}`,
      color ? `צבע: ${FILAMENTS.find((f) => f.id === color)?.name ?? color}` : null,
      `מייל לחזרה: ${email}`,
    ]
      .filter(Boolean)
      .join("\n");
    const url =
      channel === "wa"
        ? `${WA}?text=${encodeURIComponent(body)}`
        : `mailto:${MAIL}?subject=${encodeURIComponent("עדכון חזרה למלאי")}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setDone(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="עדכון חזרה למלאי"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-ink-900 border border-ink-700 shadow-2xl overflow-hidden"
      >
        <header className="flex items-center gap-3 p-4 border-b border-ink-800">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
            <Icon name="clock" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm">המוצר אינו זמין כרגע</div>
            <div className="text-[11px] text-ink-400 truncate">{itemName}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור" className="text-ink-500 hover:text-ink-100">
            <Icon name="x" size={18} />
          </button>
        </header>

        {done ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-good/20 text-good mb-2">
              <Icon name="check" size={22} strokeWidth={2.5} />
            </div>
            <div className="font-bold mb-1">נרשמת</div>
            <p className="text-sm text-ink-300 leading-relaxed">
              הבקשה נפתחה בחלון שליחה — שלח אותה ואעדכן אותך ב-{email} ברגע שה{matName} חוזר.
            </p>
            <Btn variant="ghost" size="sm" className="mt-4" onClick={onClose}>סגור</Btn>
          </div>
        ) : (
          <form
            className="p-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) submit("wa");
            }}
          >
            <p className="text-sm text-ink-300 leading-relaxed">
              נגמר לי ה<span className="text-ink-100">{matName}</span>. תשאיר מייל ואעדכן אותך
              ברגע שהגליל מגיע — בלי ספאם, הודעה אחת.
            </p>

            <Field label="מייל" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                required
                autoFocus
              />
            </Field>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-ink-500 uppercase mb-2">
                צבע שמעניין אותך (לא חובה)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILAMENTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setColor(color === f.id ? "" : f.id)}
                    title={f.name}
                    aria-label={f.name}
                    aria-pressed={color === f.id}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === f.id ? "border-flame scale-110" : "border-ink-700"
                    }`}
                    style={{ background: f.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Btn type="submit" icon="whatsapp" disabled={!valid}>עדכנו אותי</Btn>
              <button
                type="button"
                onClick={() => valid && submit("mail")}
                disabled={!valid}
                className="text-sm text-ink-400 hover:text-flame transition-colors disabled:opacity-40"
              >
                או במייל
              </button>
            </div>

            {alternatives.length > 0 && (
              <p className="text-[11px] text-ink-500 leading-relaxed border-t border-ink-800 pt-3">
                יש במלאי {alternatives.length} צבעים אחרים ב{matName}. אם אתה גמיש בצבע —
                כתוב לי ונמצא פתרון היום.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
