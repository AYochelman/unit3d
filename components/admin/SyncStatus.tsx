"use client";
import { useEffect, useState } from "react";

const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

type Status = {
  sweep?: { readAt?: string | null; checkedAt?: string; models?: number; likes?: number; newToQueue?: number };
  nightly?: { ranAt?: string; blockedCollections?: number; collections?: number; newForApproval?: number; alreadyHandled?: number };
  decisions?: { appliedAt?: string; approved?: number; rejected?: number };
};

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const hoursAgo = (iso?: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : Infinity);

/**
 * Why the queue holds what it holds, in sentences.
 *
 * Three things feed it and each can go quiet on its own: the extension in the
 * owner's Chrome sweeps his collections into the database; the nightly run
 * reads that sweep and queues what is new; applying his answers empties it.
 * "No new models" has looked identical whether the extension had not run,
 * the run found nothing, or he had just rejected the lot. This says which.
 * public/sync-status.json is written by the three scripts and committed.
 */
export default function SyncStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    fetch(`${BASE}/sync-status.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setS(j))
      .catch(() => setS(null));
  }, []);
  if (!s) return null;
  const sweepAge = hoursAgo(s.sweep?.readAt);
  const stale = sweepAge > 36;
  return (
    <div className="max-w-3xl text-right text-sm rounded-2xl border border-ink-800 bg-ink-900/60 p-4 space-y-1.5">
      <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-2">מה הזין את התור</div>
      <p className={stale ? "text-amber-300" : "text-ink-200"}>
        <b>התוסף בכרום</b> סרק לאחרונה ב-{when(s.sweep?.readAt)}
        {s.sweep?.models != null && <> — {s.sweep.models} מודלים בקולקציות, {s.sweep.newToQueue ?? 0} חדשים</>}.
        {stale && <> <b>זה יותר מיום וחצי.</b> התוסף סורק רק כשכרום עם התוסף פתוח — מודל ששמרת מאז לא הגיע לכאן עדיין.</>}
      </p>
      <p className="text-ink-200">
        <b>הריצה הלילית</b> רצה ב-{when(s.nightly?.ranAt)}
        {s.nightly?.newForApproval != null && <> — {s.nightly.newForApproval} נכנסו לתור, {s.nightly.alreadyHandled ?? 0} כבר הוכרעו בעבר</>}
        {(s.nightly?.blockedCollections ?? 0) > 0 && (
          <span className="text-ink-400"> (הקריאה הישירה מהשרת חסומה ב-Cloudflare — התוסף הוא הדרך)</span>
        )}.
      </p>
      {s.decisions?.appliedAt && (
        <p className="text-ink-200">
          <b>ההחלטות שלך</b> הוחלו ב-{when(s.decisions.appliedAt)} — {s.decisions.approved ?? 0} אושרו, {s.decisions.rejected ?? 0} נדחו.
        </p>
      )}
    </div>
  );
}
