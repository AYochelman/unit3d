"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { readConsent, serverConsent, setConsent, subscribeConsent } from "@/lib/consent";

/**
 * Asked once, before Google Analytics loads. "No" is the same size, colour and
 * distance as "yes" — a refusal that takes more effort than a yes is not a
 * real choice. The answer lives in a cookie (lib/consent.ts) for a year and can
 * be changed from /cookies at any time.
 */
export default function CookieConsent() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, serverConsent);
  const path = usePathname();
  // The owner's own pages are not a visitor's.
  if (consent !== "unset" || path?.startsWith("/admin") || process.env.NEXT_PUBLIC_BASE_PATH) return null;
  return (
    <div
      role="dialog"
      aria-label="הסכמה לעוגיות"
      className="fixed inset-x-3 sm:inset-x-auto sm:left-4 bottom-3 sm:bottom-4 z-[80] sm:max-w-md rounded-2xl border border-ink-700 bg-ink-900/95 backdrop-blur p-4 shadow-2xl"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <p className="text-[13px] leading-relaxed text-ink-200">
        נשמח להשתמש ב-Google Analytics כדי להבין איך גולשים באתר ולשפר אותו. זה מציב עוגיות של Google
        במכשיר שלך, ורק אם תאשר.{" "}
        <Link href="/cookies" className="text-flame-300 underline hover:text-flame">פרטים</Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="h-10 rounded-xl border border-ink-600 bg-ink-800 text-sm font-bold text-ink-50 hover:border-flame transition-colors"
        >
          אישור
        </button>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="h-10 rounded-xl border border-ink-600 bg-ink-800 text-sm font-bold text-ink-50 hover:border-flame transition-colors"
        >
          דחייה
        </button>
      </div>
    </div>
  );
}
