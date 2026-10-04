"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "./ui/Icon";
import { warmHelpBot } from "@/lib/helpbot-lazy";

/**
 * Find anything in the shop from anywhere in it.
 *
 * The catalogue is 340 sellable models spread over nine shelves, and the only
 * other way in is to guess the right shelf and scroll. The index searched is
 * the one the help bot already uses (lib/helpbot-catalog.ts) — same Hebrew
 * folding, same scoring, same prices.
 *
 * This file is only the button and the shortcuts ("/" and Ctrl/⌘+K). The
 * window itself (components/SearchPalette.tsx) and the catalogue are fetched
 * when the browser is idle or on first open, not in the page's first load.
 */
const loadPalette = () => import("./SearchPalette");
const SearchPalette = dynamic(loadPalette, { ssr: false });

export default function QuickSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const warm = () => { warmHelpBot(); void loadPalette(); };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(warm, { timeout: 4000 });
    else window.setTimeout(warm, 2500);
  }, []);

  // "/" anywhere opens it, unless the visitor is already typing into
  // something, where a slash is just a slash. Ctrl/⌘+K always does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const slash = e.key === "/" && !typing;
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (slash || cmdK) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="חיפוש מוצרים"
        title="חיפוש (/)"
        className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700/60 text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
      >
        <Icon name="search" size={18} />
      </button>
      {open && <SearchPalette onClose={() => setOpen(false)} />}
    </>
  );
}
