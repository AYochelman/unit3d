"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Every shelf pages the same way: 24 cards, which is whole rows at 2, 3 and 4
 * columns. One number for the whole shop, so "page 2" means the same amount
 * on /fidgets as on /trendy.
 */
export const PER_PAGE = 24;

/**
 * The slice of `items` the current page shows. Clamped rather than reset in
 * an effect: narrowing a filter must not leave the grid parked on a page that
 * no longer exists.
 */
export function usePaged<T>(items: T[]) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const at = Math.min(page, pages - 1);
  const go = (to: number) => {
    setPage(to);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { shown: items.slice(at * PER_PAGE, at * PER_PAGE + PER_PAGE), at, pages, go };
}

export default function Pager({ at, pages, go }: { at: number; pages: number; go: (to: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="דפדוף">
      <button
        type="button"
        onClick={() => go(at - 1)}
        disabled={at === 0}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100 disabled:opacity-35 disabled:hover:border-ink-800 transition-colors"
      >
        הקודם
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => go(i)}
          aria-current={i === at ? "page" : undefined}
          className={cn(
            "w-8 h-8 rounded-lg text-sm font-bold transition-colors",
            i === at ? "bg-flame-600 text-white" : "text-ink-400 border border-ink-800 hover:border-ink-600 hover:text-ink-100",
          )}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={() => go(at + 1)}
        disabled={at === pages - 1}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100 disabled:opacity-35 disabled:hover:border-ink-800 transition-colors"
      >
        הבא
      </button>
    </nav>
  );
}
