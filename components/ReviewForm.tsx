"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { CONTACT } from "@/lib/contact";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { submitReview } from "@/lib/reviews-remote";
import type { ReviewSeg } from "@/lib/types";

const WA = CONTACT.whatsapp;
const MAIL = CONTACT.email;

/**
 * The clock lives out here on purpose.
 *
 * Reading it during render is impure — the same render would give a different
 * answer each time — so the component only ever calls this from an effect or
 * from a click.
 */
const clockNow = () => Date.now();

type Props = {
  /** Pre-fills "what did you order" when the form sits on a product page. */
  itemName?: string;
  /** Compact layout for a product page sidebar. */
  compact?: boolean;
};

/**
 * Leave a rating and a review.
 *
 * Send puts it on the site. The review goes straight into the shop's table and
 * the next visitor reads it — nobody approves it first, which is what Ariel
 * asked for. If the table is not reachable (not configured yet, or the network
 * is down), the form does not silently eat the text: it falls back to the old
 * route and opens WhatsApp with the review already written out, and says which
 * of the two happened.
 *
 * `hp` is a honeypot — a field no human sees and no human fills. Together with
 * the few seconds a person needs to actually write a review, it stops the
 * drive-by bots. It stops nothing else; the admin screen can take a review down
 * after the fact, and that is the safety net here.
 */
export default function ReviewForm({ itemName, compact }: Props) {
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [seg, setSeg] = useState<ReviewSeg>("private");
  const [item, setItem] = useState(itemName ?? "");
  const [text, setText] = useState("");
  const [hp, setHp] = useState("");
  const [sent, setSent] = useState<null | "published" | "whatsapp">(null);
  const [busy, setBusy] = useState(false);
  // Set on mount, not during render.
  const opened = useRef(0);
  useEffect(() => { opened.current = clockNow(); }, []);

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

  /** The old route, still here for when the table is not reachable. */
  const openMessage = (channel: "wa" | "mail") => {
    const url =
      channel === "wa"
        ? `${WA}?text=${encodeURIComponent(body)}`
        : `mailto:${MAIL}?subject=${encodeURIComponent("ביקורת מהאתר")}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent("whatsapp");
  };

  const publish = async () => {
    if (!canSend || busy) return;
    // A filled honeypot, or a review written in under four seconds, is not a
    // person. Nothing is said about it — a bot that is told it failed retries.
    if (hp || clockNow() - opened.current < 4000) {
      setSent("published");
      return;
    }
    setBusy(true);
    const r = await submitReview({ name, tag, seg, stars, txt: text, item });
    setBusy(false);
    if (r === "published") {
      setSent("published");
      reset();
      return;
    }
    openMessage("wa");
  };

  const reset = () => {
    setName("");
    setTag("");
    setItem(itemName ?? "");
    setText("");
    setStars(5);
    opened.current = clockNow();
  };

  if (sent) {
    return (
      <div className="p-5 rounded-2xl border border-good/30 bg-good/10 text-center">
        <div className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-good/20 text-good mb-2">
          <Icon name="check" size={22} strokeWidth={2.5} />
        </div>
        <div className="font-bold mb-1">תודה!</div>
        <p className="text-ink-300 text-sm leading-relaxed">
          {sent === "published"
            ? "הביקורת שלך פורסמה באתר. רענן את הדף כדי לראות אותה בין השאר."
            : "לא הצלחתי לפרסם אותה כרגע, אז פתחתי לך אותה בוואטסאפ. שלח, ואני מעלה אותה ידנית."}
        </p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-3 text-xs text-ink-400 hover:text-flame transition-colors"
        >
          לכתוב ביקורת נוספת
        </button>
      </div>
    );
  }

  return (
    <form
      className={cn("relative rounded-2xl bg-ink-900 border border-ink-800", compact ? "p-4" : "p-6")}
      onSubmit={(e) => {
        e.preventDefault();
        void publish();
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

      {/* Not for people. Hidden from the screen and from the screen reader,
          and never focusable by tab. */}
      <div aria-hidden="true" style={{ position: "absolute", insetInlineStart: "-9999px", top: 0 }}>
        <label>
          אל תמלא שדה זה
          <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn type="submit" icon="star" disabled={!canSend || busy}>
          {busy ? "מפרסם…" : "פרסם ביקורת"}
        </Btn>
        <button
          type="button"
          onClick={() => canSend && openMessage("mail")}
          disabled={!canSend || busy}
          className="text-sm text-ink-400 hover:text-flame transition-colors disabled:opacity-40"
        >
          או שלח לי במייל
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-500 leading-relaxed">
        הביקורת מתפרסמת באתר מיד, בלי אישור מראש. אפשר לבקש ממני להוריד אותה בכל רגע.
      </p>
    </form>
  );
}
