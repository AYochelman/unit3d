"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  BOT_ANSWERS,
  BOT_FALLBACK,
  BOT_GREETING,
  BOT_STARTERS,
  getAnswer,
  matchAnswer,
  type BotAnswer,
  type BotLink,
} from "@/lib/helpbot";

type Msg = {
  id: number;
  from: "bot" | "me";
  text: string;
  links?: BotLink[];
};

/**
 * The site's help bot. It answers from a fixed list of intents (lib/helpbot.ts)
 * that restate facts already published on the site, so it can't invent a price
 * or a delivery date; anything it doesn't recognise is handed to WhatsApp.
 *
 * The conversation lives in component state only — the project forbids
 * localStorage, so closing the tab starts a fresh chat.
 */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "bot", text: BOT_GREETING }]);
  const [chips, setChips] = useState<string[]>(BOT_STARTERS);
  const [draft, setDraft] = useState("");
  const [seenPrompt, setSeenPrompt] = useState(false);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const push = (m: Omit<Msg, "id">) => setMsgs((prev) => [...prev, { ...m, id: nextId.current++ }]);

  const reply = (a: BotAnswer) => {
    push({ from: "bot", text: a.text, links: a.links });
    setChips(a.next?.length ? a.next : BOT_STARTERS);
  };

  const askById = (id: string) => {
    const a = getAnswer(id);
    if (!a) return;
    push({ from: "me", text: a.chip ?? a.keys[0] ?? id });
    reply(a);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    push({ from: "me", text });
    setDraft("");
    reply(matchAnswer(text) ?? BOT_FALLBACK);
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setSeenPrompt(true);
        }}
        aria-label={open ? "סגור את העוזר" : "פתח את העוזר"}
        aria-expanded={open}
        className={cn(
          "fixed bottom-6 right-6 z-40 inline-flex items-center justify-center h-14 w-14 rounded-full shadow-soft transition-all duration-200 hover:-translate-y-0.5",
          open ? "bg-ink-800 text-ink-100" : "bg-flame text-white hover:shadow-glow",
        )}
      >
        <Icon name={open ? "x" : "sparkles"} size={24} />
        {!open && !seenPrompt && (
          <span className="absolute -top-0.5 -left-0.5 h-3.5 w-3.5 rounded-full bg-cyan2 border-2 border-ink-950" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          dir="rtl"
          className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[380px] z-40 rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl flex flex-col overflow-hidden max-h-[min(70vh,560px)]"
        >
          <header className="flex items-center gap-3 p-3.5 border-b border-ink-800 bg-ink-950/60">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-flame/15 text-flame shrink-0">
              <Icon name="sparkles" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div id={titleId} className="font-bold text-sm">העוזר של Unit 3D</div>
              <div className="text-[11px] text-good inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-good live-dot" />
                עונה מיד
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגור"
              className="text-ink-500 hover:text-ink-100 transition-colors"
            >
              <Icon name="x" size={18} />
            </button>
          </header>

          <div ref={logRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.from === "me" ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    m.from === "me"
                      ? "bg-flame text-white rounded-br-sm"
                      : "bg-ink-800 text-ink-100 rounded-bl-sm",
                  )}
                >
                  {m.text}
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.links.map((l) =>
                        l.href.startsWith("http") ? (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ink-950/60 border border-ink-700 text-xs font-semibold text-cyan2 hover:border-cyan2/60 transition-colors"
                          >
                            {l.label}
                            <Icon name="arrowLeft" size={11} />
                          </a>
                        ) : (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ink-950/60 border border-ink-700 text-xs font-semibold text-cyan2 hover:border-cyan2/60 transition-colors"
                          >
                            {l.label}
                            <Icon name="arrowLeft" size={11} />
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Suggested questions */}
          <div className="px-3.5 pb-2 flex flex-wrap gap-1.5">
            {chips
              .map((id) => BOT_ANSWERS.find((a) => a.id === id))
              .filter((a): a is BotAnswer => !!a)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => askById(a.id)}
                  className="px-2.5 py-1 rounded-full border border-ink-700 bg-ink-950/50 text-xs text-ink-300 hover:border-flame hover:text-flame transition-colors"
                >
                  {a.chip ?? a.keys[0]}
                </button>
              ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="p-3 border-t border-ink-800 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="כתוב שאלה…"
              aria-label="שאלה לעוזר"
              className="flex-1 h-10 px-3 rounded-xl bg-ink-950 border border-ink-700 text-sm text-ink-100 placeholder:text-ink-600 focus:border-flame focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="שלח"
              className="h-10 w-10 rounded-xl bg-flame text-white inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-flame/90 transition-colors"
            >
              <Icon name="arrowLeft" size={18} />
            </button>
          </form>

          <p className="px-3.5 pb-3 text-[10px] text-ink-600 leading-relaxed">
            העוזר עונה מתוך המידע שמופיע באתר. לשאלה שהוא לא מכיר — הוא יעביר אותך לאריאל.
          </p>
        </div>
      )}
    </>
  );
}
