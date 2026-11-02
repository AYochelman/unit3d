"use client";
import { useSyncExternalStore } from "react";
import { readConsent, resetConsent, serverConsent, subscribeConsent } from "@/lib/consent";

const SAID = { granted: "אישרת", denied: "דחית", unset: "עוד לא בחרת" } as const;

/** The cookies page's "change my answer": forget it, and the banner asks again. */
export default function ConsentReset() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, serverConsent);
  return (
    <p className="flex flex-wrap items-center gap-3">
      <span>הבחירה שלך כרגע: <strong className="text-ink-100">{SAID[consent]}</strong>.</span>
      {consent !== "unset" && (
        <button type="button" onClick={resetConsent} className="px-3 h-9 rounded-lg border border-ink-700 text-sm font-semibold text-ink-100 hover:border-flame">
          שינוי הבחירה
        </button>
      )}
    </p>
  );
}
