"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { helpBotNow, loadHelpBot, warmHelpBot } from "@/lib/helpbot-lazy";
import MorphOrb, { type MorphOrbApi, type MorphOrbPhase } from "@/components/ui/ai-thiking-orb-and-input";
import type { BotAnswer, BotLink } from "@/lib/helpbot";

/**
 * The site's help bot, asked through the thinking orb.
 *
 * Answers come from a fixed list of intents (lib/helpbot.ts) that restate facts
 * already published on the site, so it can't invent a price or a delivery date;
 * anything it doesn't recognise is handed to WhatsApp. The orb is the face; the
 * links an answer carries (WhatsApp, the contact form, a shelf) are shown under
 * it once the answer has opened, because every answer should lead somewhere.
 *
 * Nothing is stored — the project forbids localStorage, so closing the panel
 * starts fresh.
 */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [seenPrompt, setSeenPrompt] = useState(false);
  const [phase, setPhase] = useState<MorphOrbPhase>("idle");
  const [links, setLinks] = useState<BotLink[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const orbApi = useRef<MorphOrbApi | null>(null);
  const titleId = useId();

  // Esc closes the panel (the orb itself also uses Esc to stop thinking).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "idle") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase]);

  // Fetch the engine in the background as soon as the page is quiet, so the
  // first question is answered without a wait.
  useEffect(() => { warmHelpBot(); }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void loadHelpBot().then((m) => {
      if (alive) setChips((prev) => (prev.length ? prev : m.BOT_STARTERS));
    });
    return () => { alive = false; };
  }, [open]);

  const answer = async (text: string): Promise<string> => {
    const m = await loadHelpBot();
    const byChip = m.BOT_ANSWERS.find((a) => (a.chip ?? a.keys[0]) === text);
    const a: BotAnswer = byChip ?? m.matchAnswer(text) ?? m.BOT_FALLBACK;
    setLinks(a.links ?? []);
    setChips(a.next?.length ? a.next : m.BOT_STARTERS);
    return a.text;
  };

  const onPhase = (p: MorphOrbPhase) => {
    setPhase(p);
    if (p === "launch") setLinks([]);
  };

  const showLinks = phase === "answered" && links.length > 0;
  // Chips only while the orb is waiting for a question; after an answer,
  // its links take that place and "שאלה חדשה" brings the chips back.
  const showChips = phase === "idle";

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
          "fab fixed right-6 z-40 inline-flex items-center justify-center h-14 w-14 rounded-full shadow-soft transition-all duration-200 hover:-translate-y-0.5",
          open ? "bg-ink-800 text-ink-100" : "btn-shiny",
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
          className="fixed right-4 left-4 sm:left-auto sm:w-[380px] z-40 bottom-[calc(var(--fab-bottom)+4.25rem)] rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl flex flex-col overflow-hidden max-h-[min(80vh,600px)]"
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

          <div className="h-[380px] max-h-[48vh] min-h-[340px] shrink-0">
            <MorphOrb
              onSubmit={answer}
              onPhaseChange={onPhase}
              apiRef={orbApi}
              autoFocus
              maxCardHeight={220}
              className="!rounded-none"
              copy={{ placeholder: "כתוב שאלה…" }}
            />
          </div>

          {showLinks && (
            <div className="px-3.5 pt-3 flex flex-wrap gap-1.5">
              {links.map((l) =>
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

          {/* Suggested questions — asked through the orb, as if typed. */}
          <div className={cn("px-3.5 pt-3 pb-2 flex flex-wrap gap-1.5", !showChips && "invisible")}>
            {chips
              .map((id) => helpBotNow()?.BOT_ANSWERS.find((a) => a.id === id))
              .filter((a): a is BotAnswer => !!a)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={phase !== "idle"}
                  onClick={() => orbApi.current?.ask(a.chip ?? a.keys[0])}
                  className="px-2.5 py-1 rounded-full border border-ink-700 bg-ink-950/50 text-xs text-ink-300 hover:border-flame hover:text-flame transition-colors disabled:opacity-40 disabled:hover:border-ink-700 disabled:hover:text-ink-300"
                >
                  {a.chip ?? a.keys[0]}
                </button>
              ))}
          </div>

          <p className="px-3.5 pb-3 text-[10px] text-ink-600 leading-relaxed">
            העוזר עונה מתוך המידע שמופיע באתר. לשאלה שהוא לא מכיר — הוא יעביר אותך לאריאל.
          </p>
        </div>
      )}
    </>
  );
}
