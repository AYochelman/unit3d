"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import Icon from "./ui/Icon";
import { track } from "@/lib/analytics";

/**
 * The corner card that sends people to the questionnaire.
 *
 * It took the WhatsApp button's corner: the shop has ten shelves and someone
 * arriving from an ad has no idea which one is theirs, and "which print is
 * right for me" is a better first question than "want to chat". WhatsApp is
 * still one tap away on the result page, on /contact, and in the help bot.
 *
 * Dismissed for the visit only, in memory: no localStorage on this site, and
 * a card that comes back on the next visit is the intended behaviour.
 */
const useDismissed = create<{ gone: boolean; dismiss: () => void }>((set) => ({
  gone: false,
  dismiss: () => set({ gone: true }),
}));

export default function FinderPrompt() {
  const path = usePathname();
  const { gone, dismiss } = useDismissed();
  if (gone || path?.startsWith("/finder") || path?.startsWith("/admin")) return null;
  return (
    <>
      {/* Phones: one line, the height of the button this replaced. The full
          card at this width sat on top of "המשך לטופס" on /upload and on the
          contact box on /catalog -- a corner card that hides the page's own
          button is worse than no card. */}
      <Link
        href="/finder/"
        onClick={() => track("finder_open", { from: path ?? "" })}
        className="fab fixed left-4 z-30 sm:hidden inline-flex items-center gap-1.5 h-11 pr-4 pl-3 rounded-full border border-ink-700 bg-ink-900/95 backdrop-blur shadow-soft text-sm font-semibold text-flame"
      >
        בוא נעזור לך לבחור <Icon name="chevLeft" size={16} />
      </Link>
      <div className="fab fixed left-6 z-30 hidden sm:block max-w-xs rounded-2xl border border-ink-700 bg-ink-900/95 backdrop-blur shadow-soft p-4">
        <button
          type="button"
          onClick={dismiss}
          aria-label="סגור"
          className="absolute top-2 left-2 h-7 w-7 inline-flex items-center justify-center rounded-full text-ink-400 hover:text-ink-100"
        >
          <Icon name="x" size={14} />
        </button>
        <p className="text-sm leading-snug pl-6">
          יש לנו מבחר גדול, אנחנו יודעים.
          <br />
          <span className="text-ink-300">בוא נעזור לך לבחור.</span>
        </p>
        <Link
          href="/finder/"
          onClick={() => track("finder_open", { from: path ?? "" })}
          className="mt-3 inline-flex items-center gap-1.5 font-semibold text-sm text-flame"
        >
          למעבר לשאלון לחץ פה <Icon name="chevLeft" size={16} />
        </Link>
      </div>
    </>
  );
}
