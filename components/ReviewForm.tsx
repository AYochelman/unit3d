"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { CONTACT } from "@/lib/contact";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { submitReview } from "@/lib/reviews-remote";
import { uploadReviewPhoto, MAX_PICK } from "@/lib/review-photo";
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
 * A picture can come with it. It goes up first, into the shop's own bucket, and
 * the review stores the URL — see lib/review-photo.ts for what happens to the
 * file on the way (it is made small, re-encoded, and stripped of the EXIF that
 * carries the customer's GPS). If that upload fails the review still publishes
 * without it: the words are the point, the picture is the bonus.
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [photoErr, setPhotoErr] = useState("");
  const [sent, setSent] = useState<null | "published" | "no-photo" | "whatsapp">(null);
  // What they wrote, kept on screen when the table would not take it.
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"" | "photo" | "send">("");
  const pick = useRef<HTMLInputElement>(null);
  // Set on mount, not during render.
  const opened = useRef(0);
  useEffect(() => { opened.current = clockNow(); }, []);
  // The preview is a blob URL and it leaks if nobody gives it back.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

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
    // A wa.me link carries text and nothing else, so the picture cannot ride
    // along. Saying so beats a customer assuming it did.
    photo ? "(צירפתי תמונה — שולח אותה כאן בצ'אט)" : null,
    "",
    text,
  ]
    .filter(Boolean)
    .join("\n");

  const canSend = name.trim().length > 1 && text.trim().length > 9;

  const waUrl = `${WA}?text=${encodeURIComponent(body)}`;
  const mailUrl = `mailto:${MAIL}?subject=${encodeURIComponent("ביקורת מהאתר")}&body=${encodeURIComponent(body)}`;

  /**
   * The old route, still here for when the table is not reachable.
   *
   * The text is put on the screen as well as into the message, and that is the
   * point: `window.open` is blocked by every phone browser that decides this
   * click was not direct enough, and when it was the only copy, a review that
   * someone actually wrote simply vanished. Now the worst case is that they
   * press "העתק".
   */
  const openMessage = (channel: "wa" | "mail") => {
    setDraft(body);
    setCopied(false);
    setSent("whatsapp");
    window.open(channel === "wa" ? waUrl : mailUrl, "_blank", "noopener,noreferrer");
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      // No clipboard permission. The text is already on screen and selectable,
      // which is the whole reason it is printed there.
      setCopied(false);
    }
  };

  /** One picture, from the camera or the roll. */
  const choose = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setPhotoErr("זאת לא תמונה.");
      return;
    }
    if (f.size > MAX_PICK) {
      setPhotoErr("התמונה גדולה מדי. עד 25MB.");
      return;
    }
    setPhotoErr("");
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const dropPhoto = () => {
    setPhoto(null);
    setPreview("");
    setPhotoErr("");
    if (pick.current) pick.current.value = "";
  };

  const publish = async () => {
    if (!canSend || busy) return;
    // A filled honeypot, or a review written in under four seconds, is not a
    // person. Nothing is said about it — a bot that is told it failed retries.
    if (hp || clockNow() - opened.current < 4000) {
      setSent("published");
      return;
    }
    // The picture goes up first. If it does not, the review still does — losing
    // what someone wrote because their photo would not upload is the wrong trade.
    let url: string | undefined;
    if (photo) {
      setBusy("photo");
      url = await uploadReviewPhoto(photo);
    }
    setBusy("send");
    const r = await submitReview({ name, tag, seg, stars, txt: text, item, photo: url });
    setBusy("");
    if (r === "published" || r === "published-no-photo") {
      // "published-no-photo" comes back when the table took the review but not
      // the picture. Either way the words are up and the picture is not.
      setSent(r === "published-no-photo" || (photo && !url) ? "no-photo" : "published");
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
    dropPhoto();
    opened.current = clockNow();
  };

  if (sent) {
    const failed = sent === "whatsapp";
    return (
      <div
        className={cn(
          "p-5 rounded-2xl border text-center",
          failed ? "border-flame/40 bg-flame/10" : "border-good/30 bg-good/10",
        )}
      >
        <div
          className={cn(
            "inline-flex items-center justify-center h-11 w-11 rounded-full mb-2",
            failed ? "bg-flame/20 text-flame" : "bg-good/20 text-good",
          )}
        >
          <Icon name={failed ? "info" : "check"} size={22} strokeWidth={2.5} />
        </div>
        <div className="font-bold mb-1">{failed ? "הביקורת לא נשמרה" : "תודה!"}</div>
        <p className="text-ink-300 text-sm leading-relaxed">
          {sent === "published"
            ? "הביקורת שלך פורסמה באתר. רענן את הדף כדי לראות אותה בין השאר."
            : sent === "no-photo"
              ? "הביקורת שלך פורסמה באתר, אבל התמונה לא עלתה. אפשר לשלוח לי אותה בוואטסאפ ואני אצרף אותה."
              : "משהו אצלי לא עבד, וזה לא בגללך. הטקסט שכתבת שמור כאן למטה — שלח לי אותו ואני מעלה אותו ידנית."}
        </p>

        {/* The words themselves, on the screen.
            Not inside a popup that the browser may have blocked, and not only
            inside a WhatsApp draft that was never sent — that is exactly how a
            real review was lost once. */}
        {failed && draft && (
          <div className="mt-4 text-start">
            <pre className="p-3 rounded-xl bg-ink-950 border border-ink-800 text-ink-200 text-xs leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {draft}
            </pre>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Btn size="sm" icon={copied ? "check" : "file"} onClick={() => void copyDraft()}>
                {copied ? "הועתק" : "העתק"}
              </Btn>
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <Btn size="sm" variant="ghost" icon="whatsapp">שלח בוואטסאפ</Btn>
              </a>
              <a href={mailUrl}>
                <Btn size="sm" variant="ghost" icon="mail">שלח במייל</Btn>
              </a>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-3 text-xs text-ink-400 hover:text-flame transition-colors"
        >
          {failed ? "חזרה לטופס (מה שכתבת עדיין שם)" : "לכתוב ביקורת נוספת"}
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

      {/* ── The picture ───────────────────────────────────────────────────
          Optional, and said so. `capture` is deliberately NOT set: on a phone
          that would force the camera open, and most of these photos already
          exist in the roll by the time someone sits down to write. */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-semibold text-ink-100">
            תמונה מההזמנה <span className="text-ink-400 text-xs font-normal mr-1">(אופציונלי)</span>
          </span>
          <span className="text-xs text-ink-400">התמונות של הלקוחות הן החלק הכי משכנע</span>
        </div>

        <input
          ref={pick}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />

        {preview ? (
          <div className="relative rounded-xl border border-ink-700 bg-ink-950 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="התמונה שבחרת" className="w-full max-h-64 object-contain" />
            <div className="absolute top-2 left-2 flex gap-2">
              <button
                type="button"
                onClick={() => pick.current?.click()}
                className="px-2.5 py-1 rounded-lg text-xs bg-ink-950/80 border border-ink-700 text-ink-200 hover:text-flame transition-colors"
              >
                החלף
              </button>
              <button
                type="button"
                onClick={dropPhoto}
                className="px-2.5 py-1 rounded-lg text-xs bg-ink-950/80 border border-ink-700 text-ink-200 hover:text-bad transition-colors"
              >
                הסר
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => pick.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choose(e.dataTransfer.files?.[0]);
            }}
            className="w-full py-5 rounded-xl border border-dashed border-ink-700 bg-ink-950/40 text-ink-400 hover:border-flame hover:text-flame transition-colors flex flex-col items-center gap-1.5"
          >
            <Icon name="camera" size={20} />
            <span className="text-sm font-semibold">צרף תמונה</span>
            <span className="text-[11px] text-ink-500">JPG / PNG / HEIC · עד 25MB</span>
          </button>
        )}

        {photoErr && <p className="mt-1 text-xs text-bad">{photoErr}</p>}
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
        <Btn type="submit" icon="star" disabled={!canSend || !!busy}>
          {busy === "photo" ? "מעלה תמונה…" : busy === "send" ? "מפרסם…" : "פרסם ביקורת"}
        </Btn>
        <button
          type="button"
          onClick={() => canSend && openMessage("mail")}
          disabled={!canSend || !!busy}
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
