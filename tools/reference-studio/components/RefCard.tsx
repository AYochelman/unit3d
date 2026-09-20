"use client";

import { useStudio } from "@/lib/store";
import { PURPOSE_LABELS } from "@/lib/types";
import type { Reference } from "@/lib/types";
import { coverOf } from "@/lib/cover";
import { Icon, Spinner } from "./ui";

export { coverOf as thumbOf } from "@/lib/cover";

/**
 * A card is mostly the picture. Everything else - the badges, the title - sits
 * out of the way until you hover or focus, because the whole point of a visual
 * library is that you scan it with your eyes, not by reading.
 */
export function RefCard({ reference, selected }: { reference: Reference; selected: boolean }) {
  const select = useStudio((s) => s.select);
  const patch = useStudio((s) => s.patchRef);
  const busy = useStudio((s) => s.busy[reference.id]);
  const lang = useStudio((s) => s.settings?.uiLanguage ?? "en");
  const asset = coverOf(reference);
  const failed = reference.source?.status === "failed";

  return (
    <article
      className="group relative overflow-hidden rounded-xl border transition-all duration-200"
      style={{
        borderColor: selected ? "rgb(var(--accent))" : "rgb(var(--line) / var(--line-alpha))",
        background: "rgb(var(--surface))",
        boxShadow: selected ? "0 0 0 1px rgb(var(--accent))" : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => select(reference.id)}
        aria-current={selected ? "true" : undefined}
        className="block w-full text-start"
      >
        <div className="checker relative aspect-[4/3] w-full overflow-hidden" style={{ background: "rgb(var(--raised))" }}>
          {asset ? (
            // eslint-disable-next-line @next/next/no-img-element -- local file route, no optimiser involved
            <img
              src={`/api/files/${asset.file}`}
              alt={reference.title || "Reference"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
              {busy ? <Spinner className="h-5 w-5 text-muted" />
                : <Icon name={failed ? "alert" : reference.kind === "url" ? "link" : "image"} className="h-5 w-5 text-faint" />}
              <span className="text-xs text-faint">
                {busy ? "Capturing…" : failed ? "No screenshot" : "No image yet"}
              </span>
            </div>
          )}

          {/* Badges float over the image; they are small and only two at most. */}
          <div className="absolute inset-inline-start-2 inset-block-start-2 flex gap-1" style={{ insetInlineStart: 8, insetBlockStart: 8 }}>
            {reference.kind === "url" && (
              <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">URL</span>
            )}
            {reference.analysis && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm"
                style={{ background: "rgb(var(--ok) / 0.85)", color: "#08150e" }}
                title={`Analysis: ${reference.analysisMeta.source}`}>
                {reference.analysisMeta.source === "ai" ? "AI" : reference.analysisMeta.source === "observed" ? "measured" : reference.analysisMeta.source === "imported" ? "imported" : "manual"}
              </span>
            )}
          </div>

          {reference.autoPalette && reference.autoPalette.length > 0 && (
            <div className="absolute inset-inline-0 inset-block-end-0 flex h-1.5 w-full opacity-90"
              style={{ insetBlockEnd: 0, insetInlineStart: 0, insetInlineEnd: 0 }} aria-hidden="true">
              {reference.autoPalette.slice(0, 6).map((c, i) => (
                <span key={`${c.hex}-${i}`} className="h-full" style={{ background: c.hex, flex: Math.max(0.4, c.share ?? 0.2) }} />
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-2.5">
          <h3 className="truncate text-sm font-medium" dir="auto" title={reference.title}>
            {reference.title || "Untitled"}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
            {reference.purposes.slice(0, 2).map((p) => (
              <span key={p} className="truncate text-[11px] text-faint">{PURPOSE_LABELS[p][lang]}</span>
            ))}
            {reference.purposes.length > 2 && <span className="text-[11px] text-faint">+{reference.purposes.length - 2}</span>}
            {!reference.purposes.length && reference.note && (
              <span className="truncate text-[11px] text-faint" dir="auto">{reference.note}</span>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => void patch(reference.id, { favorite: !reference.favorite })}
        aria-pressed={reference.favorite}
        aria-label={reference.favorite ? "Remove from favourites" : "Add to favourites"}
        className="absolute rounded-full p-1.5 opacity-0 backdrop-blur-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        style={{
          insetBlockStart: 8, insetInlineEnd: 8,
          background: "rgb(var(--shade) / 0.5)",
          color: reference.favorite ? "rgb(var(--accent))" : "#fff",
          opacity: reference.favorite ? 1 : undefined,
        }}
      >
        <Icon name="star" className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}
