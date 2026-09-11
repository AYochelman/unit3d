"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { CONTACT } from "@/lib/contact";
import { cn } from "@/lib/cn";

/**
 * The four dials that move a 3D-printed price, in words a customer owns.
 *
 * Everyone in this trade knows a print gets cheaper with less infill, fewer
 * colours, a smaller scale or a plainer filament. A customer knows none of
 * that: they see one number, decide it is too much, and leave. Nobody asks
 * "can you print it hollow?" if they have never been told that hollow is a
 * thing.
 *
 * So it is said plainly, on the page, before the price does the deciding —
 * and it ends in a conversation rather than a form, because which dial to
 * turn depends on what the thing is for, and that is a question, not a
 * checkbox. No numbers are promised here: the saving depends on the model,
 * and a made-up percentage would be a lie a customer could hold us to.
 */
const LEVERS = [
  {
    icon: "expand" as const,
    title: "גודל",
    text: "אותו דגם, קצת יותר קטן. פחות חומר ופחות שעות — וברוב הדברים בכלל לא מרגישים.",
  },
  {
    icon: "layers" as const,
    title: "כמה מלא זה מבפנים",
    text: "מוצרים מודפסים אינם מלאים מבפנים, אלא עם רשת פנימית. פריט תצוגה לא צריך להיות חזק כמו חלק מכני, ורשת דלילה יותר חוסכת חומר וזמן בלי שרואים את זה מבחוץ.",
  },
  {
    icon: "droplet" as const,
    title: "מספר הצבעים",
    text: "כל צבע נוסף מאריך את ההדפסה ומבזבז חומר בהחלפות. בצבע אחד זה תמיד הכי זול.",
  },
  {
    icon: "cube" as const,
    title: "סוג החומר",
    text: "אם זה לא צריך לעמוד בשמש, בחום או להיות גמיש — החומר הבסיסי עושה את העבודה ועולה פחות.",
  },
];

export default function CheaperOptions({ productName }: { productName?: string }) {
  const [open, setOpen] = useState(false);
  const msg = productName
    ? `היי, ראיתי את ${productName} באתר ואשמח להתייעץ איך להוזיל אותו`
    : "היי, אשמח להתייעץ איך להוזיל הדפסה";
  const wa = `${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 p-4 text-right hover:bg-ink-900/60 transition-colors"
      >
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-flame/15 text-flame shrink-0">
          <Icon name="sparkles" size={17} />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-sm">יקר מדי? כמעט תמיד אפשר להוזיל.</span>
          <span className="block text-[12px] text-ink-400 leading-relaxed">
            יש כמה דברים שאפשר לשנות בהדפסה כדי להוריד את המחיר. אנחנו זמינים לייעוץ.
          </span>
        </span>
        <Icon name="chevDown" size={16} className={cn("text-ink-500 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {LEVERS.map((l) => (
            <div key={l.title} className="flex gap-2.5">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-ink-800 text-ink-300 shrink-0 mt-0.5">
                <Icon name={l.icon} size={13} />
              </span>
              <div>
                <div className="text-[13px] font-bold text-ink-100">{l.title}</div>
                <p className="text-[12px] text-ink-400 leading-relaxed">{l.text}</p>
              </div>
            </div>
          ))}

          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-good/15 text-good border border-good/35 hover:bg-good hover:text-ink-950 transition-colors"
          >
            <Icon name="whatsapp" size={16} />
            תשאל אותנו מה משתלם כאן
          </a>
          <p className="text-[11px] text-ink-500 leading-relaxed">
            אין צורך להבין בהדפסה — תגיד למה זה מיועד ואנחנו נגיד מה כדאי לשנות ומה לא.
          </p>
        </div>
      )}
    </div>
  );
}
