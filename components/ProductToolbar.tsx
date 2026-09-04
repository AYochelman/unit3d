"use client";
import Icon from "@/components/ui/Icon";
import { COLOR_FILTERS, PRICE_FILTERS, SORTS, DEFAULT_LISTING, type ListingState } from "@/lib/listing";
import { cn } from "@/lib/cn";

type Props = {
  state: ListingState;
  onChange: (s: ListingState) => void;
  /** Items after filtering / total. */
  shown: number;
  total: number;
};

/**
 * Sticky filter + sort bar shared by every listing page.
 * Row 1: sort chips. Row 2: colour-count and price filters.
 */
export default function ProductToolbar({ state, onChange, shown, total }: Props) {
  const set = <K extends keyof ListingState>(k: K, v: ListingState[K]) => onChange({ ...state, [k]: v });
  const dirty = state.colors !== "all" || state.price !== "all" || state.sort !== "popular";

  return (
    <div className="sticky top-16 z-20 bg-ink-950/85 backdrop-blur-md py-3 -mx-6 px-6 md:-mx-10 md:px-10 border-b border-ink-800 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-widest text-ink-500 uppercase ml-1">מיון</span>
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => set("sort", s.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              state.sort === s.id ? "bg-flame text-white border-flame" : "bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-600",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-widest text-ink-500 uppercase ml-1">סינון</span>
        <div className="inline-flex rounded-full border border-ink-700 bg-ink-900 p-0.5">
          {COLOR_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => set("colors", f.id)}
              className={cn(
                "px-2.5 h-7 rounded-full text-xs font-medium transition-colors",
                state.colors === f.id ? "bg-cyan2/20 text-cyan2" : "text-ink-300 hover:text-ink-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full border border-ink-700 bg-ink-900 p-0.5">
          {PRICE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => set("price", f.id)}
              className={cn(
                "px-2.5 h-7 rounded-full text-xs font-medium transition-colors",
                state.price === f.id ? "bg-cyan2/20 text-cyan2" : "text-ink-300 hover:text-ink-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="mr-auto font-mono text-[11px] text-ink-400" dir="ltr">
          {shown} / {total}
        </span>
        {dirty && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_LISTING)}
            className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-bad transition-colors"
          >
            <Icon name="x" size={11} />
            נקה
          </button>
        )}
      </div>
    </div>
  );
}
