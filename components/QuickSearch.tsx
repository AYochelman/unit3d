"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "./ui/Icon";
import { cn } from "@/lib/cn";
import { fmtILS } from "@/lib/format";
import type { Found } from "@/lib/helpbot-catalog";
import { helpBotNow, loadHelpBot, warmHelpBot } from "@/lib/helpbot-lazy";

/**
 * Find anything in the shop from anywhere in it.
 *
 * The catalogue is 340 sellable models spread over nine shelves, and until now
 * the only way in was to guess the right shelf and scroll. The index this
 * searches is the one the help bot already uses (lib/helpbot-catalog.ts) —
 * same Hebrew folding, same scoring, same prices — so a product cannot be
 * found here under a name or a price the rest of the site does not use.
 *
 * Opens on click or on "/" — the shortcut every search field on the web has —
 * and is driven entirely from the keyboard once open.
 */
export default function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /**
   * The catalogue index is not in the page's first load (lib/helpbot-lazy.ts).
   * `ready` flips once it is here, which is what re-runs the two lookups below
   * for anything already typed.
   */
  const [ready, setReady] = useState(() => helpBotNow() !== null);
  useEffect(() => { warmHelpBot(); }, []);

  const cat = ready ? helpBotNow()?.catalog : undefined;
  const results: Found[] = useMemo(
    () => (!cat || q.trim().length < 2 ? [] : cat.findProducts(q, 7)),
    [cat, q],
  );
  const shelf = useMemo(() => (!cat || q.trim().length < 2 ? null : cat.findShelf(q)), [cat, q]);

  const close = () => {
    setOpen(false);
    setQ("");
    setAt(0);
  };

  const type = (v: string) => {
    setQ(v);
    setAt(0);
  };

  // "/" anywhere on the site opens it — unless the visitor is already typing
  // into something, where a slash is just a slash.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The effect only does the one thing an effect is for here: move focus into
  // a field the browser has just rendered. Clearing the query and the cursor
  // belongs to whoever closes the dialog, not to a render pass reacting to it.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Opening it is the last moment the index can arrive late.
  useEffect(() => {
    if (!open || ready) return;
    let alive = true;
    void loadHelpBot().then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [open, ready]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAt((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAt((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[at].href);
    }
  };

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

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="חיפוש מוצרים">
          <button
            type="button"
            aria-label="סגור חיפוש"
            onClick={close}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
          />
          <div className="relative mx-auto mt-[12vh] w-[min(92vw,620px)] rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-ink-800">
              <Icon name="search" size={18} className="text-ink-400 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => type(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="חפש מוצר"
                placeholder={cat ? `חפש בין ${cat.catalogueSize()} הדגמים — "דרקון", "מחזיק מפתחות"…` : "חפש מוצר…"}
                className="flex-1 h-14 bg-transparent text-ink-50 placeholder:text-ink-500 outline-none text-[15px]"
              />
              <kbd className="hidden sm:block text-[10px] font-mono text-ink-500 border border-ink-700 rounded px-1.5 py-0.5">ESC</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {q.trim().length >= 2 && !results.length && !shelf && (
                <p className="p-6 text-center text-ink-400 text-sm leading-relaxed">
                  לא מצאתי כלום על <span className="text-ink-100">״{q}״</span>.
                  <br />
                  אפשר לנסות מילה אחרת, או לשאול אותי בוואטסאפ.
                </p>
              )}

              {results.map((r, i) => (
                <Link
                  key={r.id}
                  href={r.href}
                  onClick={close}
                  onMouseEnter={() => setAt(i)}
                  aria-current={i === at ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-ink-800/70 last:border-0 transition-colors",
                    i === at ? "bg-flame/10" : "hover:bg-ink-800/60",
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-ink-50 font-semibold text-sm">{r.name}</span>
                    <span className="block text-[11px] text-ink-400">{r.shelfLabel}</span>
                  </span>
                  <span className="font-mono text-flame-300 text-sm shrink-0" dir="ltr">{fmtILS(r.price)}</span>
                  <Icon name="arrowLeft" size={14} className="text-ink-500 shrink-0" />
                </Link>
              ))}

              {shelf && (
                <button
                  type="button"
                  onClick={() => go(cat!.SHELF_ROUTE[shelf.shelf])}
                  className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-ink-800/60 transition-colors border-t border-ink-800"
                >
                  <Icon name="package" size={15} className="text-flame shrink-0" />
                  <span className="flex-1 text-sm text-ink-200">
                    פתח את כל מדף <span className="text-ink-50 font-semibold">{shelf.label}</span>
                  </span>
                  <Icon name="arrowLeft" size={14} className="text-ink-500 shrink-0" />
                </button>
              )}

              {q.trim().length < 2 && (
                <p className="p-6 text-center text-ink-500 text-xs">
                  הקלד שתי אותיות ומעלה. חיצים לניווט, Enter לפתיחה.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
