"use client";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useAdminStore } from "@/lib/admin-store";
import { SOURCE_LABEL, type ModelSource } from "@/lib/model-source";

/**
 * Take the owner to the file he has to print.
 *
 * It opens the designer's own page rather than serving an STL from here: most
 * of the catalogue is licensed for personal printing only, so re-hosting the
 * file would be redistribution — and the download button on that page is the
 * one the licence actually covers.
 *
 * Admin-only. A customer must never see it, because to a customer it reads as
 * "the file is included with the order", which it is not.
 */
export default function ModelDownload({
  model,
  size = "md",
  className,
}: {
  model: ModelSource | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const unlocked = useAdminStore((s) => s.unlocked);
  if (!unlocked) return null;

  const sm = size === "sm";

  // Nothing to link to. Say which of the two reasons it is, so the owner knows
  // whether to go looking or whether there is genuinely no source — silence
  // here would just send him to search MakerWorld by hand anyway.
  if (!model) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-ink-700 text-ink-500",
          sm ? "px-2 py-1 text-[11px]" : "px-3 h-9 text-xs",
          className,
        )}
        title="הפריט הזה לא מקושר לדגם מקור — עיצוב של הסטודיו, קובץ שהלקוח העלה, או הזמנה ישנה מלפני שהקישור נשמר"
      >
        <Icon name="file" size={sm ? 11 : 14} />
        אין דגם מקור
      </span>
    );
  }

  const site = model.site ? SOURCE_LABEL[model.site] : "עמוד המקור";

  return (
    <a
      href={model.url}
      target="_blank"
      rel="noopener noreferrer"
      title={[model.creator ? `עוצב על ידי ${model.creator}` : null, model.license]
        .filter(Boolean)
        .join(" · ")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-semibold border transition-colors",
        "border-cyan2/40 bg-cyan2/10 text-cyan2 hover:bg-cyan2/20 hover:border-cyan2",
        sm ? "px-2 py-1 text-[11px]" : "px-3 h-9 text-xs",
        className,
      )}
    >
      <Icon name="download" size={sm ? 11 : 14} />
      להורדת המודל
      <span className="text-cyan2/70 font-normal" dir="ltr">({site})</span>
    </a>
  );
}
