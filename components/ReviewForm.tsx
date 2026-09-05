"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { ReviewSeg } from "@/lib/types";

const WA = "https://wa.me/972500000000";
const MAIL = "hello@unit3d.example.com";

type Props = {
  /** Pre-fills "what did you order" when the form sits on a product page. */
  itemName?: string;
  /** Compact layout for a product page sidebar. */
  compact?: boolean;
};

/**
 * Leave a rating and a review.
 *
 * There is no backend, so "submit" does not quietly drop the text into
 * nowhere: it opens WhatsApp with the review already written out (and offers
 * e-mail as the alternative), which is the same route every order takes. The
 * form says so rather than pretending the review was published.
 */
export default function ReviewForm({ itemName, compact }: Props) {
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [seg, setSeg] = useState<ReviewSeg>("private");
  const [item, setItem] = useState(itemName ?? "");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const SEG_LABEL: Record<ReviewSeg, string> = {
    private: "לקוח פרטי",
    soldier: "חייל/ת",
    family: "מתנה למשפחה",
    b2b: "חברה",
  };

  const body = [
    "ביקורת חדשה מהאתר",
    `דירוג: ${"★".repeat(stars)}${"☆".repeat(5 - stars)} (${stars}/5)`,
    `שם: ${name || "—"}`,
    tag ? `תיאור: ${tag}` : null,
    `סוג לקוח: ${SEG_LABEL[seg]}`,
    item ? `מה הוזמן: ${item}` : null,
    "",
    text,
  ]
    .filter(Boolean)
    .join("\n");

  const canSend = name.trim().length > 1 && text.trim().length > 9;

  const send = (channel: "wa" | "mail") => {
    const url =
      channel === "wa"
        ? `${WA}?text=${encodeURIComponent(body)}`
        : `mailto:${MAIL}?subject=${encodeURIComponent("ביקורת מהאתר")}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  if (sent) {
    return (
      <div className="p-5 rounded-2xl border border-good/30 bg-good/10 text-center">
        <div className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-good/20 text-good mb-2">
          <Icon name="check" size={22} strokeWidth={2.5} />
        </div>
        <div className="font-bold mb-1">תודה!</div>
        <p className="text-ink-300 text-sm leading-relaxed">
          הביקורת נפתחה בחלון שליחה. שלח אותה ואני מפרסם אותה באתר אחרי שאאמת את ההזמנה.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-xs text-ink-400 hover:text-flame transition-colors"
        >
          לכתוב ביקורת נוספת
        </button>
      </div>
    );
  }

  return (
    <form
      className={cn("rounded-2xl bg-ink-900 border border-ink-800", compact ? "p-4" : "p-6")}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) send("wa");
      }}
    >
      {compact && (
        <div className="font-bold mb-3 flex items-center gap-2">
          <Icon name="star" size={15} className="text-flame fill-current" />
          קיבלת את ההזמנה? דרג אותה
        </div>
      )}

      {/* ── Stars ─────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-ink-100 mb-2">
          דירוג <span className="text-flame">*</span>
        </div>
        <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} כוכבים`}
              aria-pressed={stars === n}
              className={cn(
                "transition-transform hover:scale-110",
                n <= (hover || stars) ? "text-flame" : "text-ink-700",
              )}
            >
              <Icon name="star" size={compact ? 24 : 30} className="fill-current" strokeWidth={1.5} />
            </button>
          ))}
          <span className="mr-2 font-mono text-sm text-ink-400" dir="ltr">
            {stars}.0
          </span>
        </div>
      </div>

      <div className={cn("gap-4 mb-4", compact ? "space-y-3" : "grid md:grid-cols-2")}>
        <Field label="שם" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="השם שלך" required />
        </Field>
        <Field label="תיאור / יחידה / חברה" optional>
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="גולני 13 / אמא של חייל" />
        </Field>
      </div>

      {!compact && (
        <Field label="סוג לקוח" required>
          <Select value={seg} onChange={(e) => setSeg(e.target.value as ReviewSeg)} required>
            {(Object.keys(SEG_LABEL) as ReviewSeg[]).map((k) => (
              <option key={k} value={k}>{SEG_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
      )}

      <div className={compact ? "mt-3" : "mt-4"}>
        <Field label="מה הזמנת" optional>
          <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="שם המוצר" />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="הביקורת שלך" required>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="מה הזמנת, איך היה התהליך, איך יצאה התוצאה."
            required
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn type="submit" icon="whatsapp" disabled={!canSend}>
          שלח בוואטסאפ
        </Btn>
        <button
          type="button"
          onClick={() => canSend && send("mail")}
          disabled={!canSend}
          className="text-sm text-ink-400 hover:text-flame transition-colors disabled:opacity-40"
        >
          או במייל
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-500 leading-relaxed">
        הביקורת נשלחת אליי ומתפרסמת באתר אחרי אימות ההזמנה. אין באתר שמירה אוטומטית של ביקורות.
      </p>
    </form>
  );
}
