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
    <div className="fab fixed left-4 sm:left-6 z-30 max-w-[calc(100vw-2rem)] sm:max-w-xs rounded-2xl border border-ink-700 bg-ink-900/95 backdrop-blur shadow-soft p-4">
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
  );
}
