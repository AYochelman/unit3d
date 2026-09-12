"use client";
import { useCallback, useEffect, useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import { Input } from "@/components/ui/Field";
import { useSupabaseSession } from "@/lib/use-supabase-session";
import { adminReviews, deleteReview, setReviewHidden, type RemoteReview } from "@/lib/reviews-remote";
import type { ReviewSeg } from "@/lib/types";
import { cn } from "@/lib/cn";

const SEG_LABEL: Record<ReviewSeg, string> = {
  private: "פרטי",
  soldier: "חייל",
  family: "מתנה",
  b2b: "עסקי",
};

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
};

/**
 * The reviews customers wrote.
 *
 * They are already on the site by the time they appear here — that is the whole
 * point of publishing without approval — so this screen is not a queue. It is
 * the undo: "הורד מהאתר" hides a review from every visitor and keeps the row,
 * so a takedown can be reversed; "מחק" is for the spam, and is final.
 */
export default function ReviewsTab() {
  const { token, email, setEmail, busy: authBusy, error: authErr, setError: setAuthErr, tried, signIn, signOut } =
    useSupabaseSession();
  const [pw, setPw] = useState("");
  const [rows, setRows] = useState<RemoteReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState("");

  const load = useCallback(async (t: string) => {
    const r = await adminReviews(t);
    setRows(r);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void adminReviews(token).then((r) => {
      if (!alive) return;
      setRows(r);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [token]);

  const hide = async (r: RemoteReview, hidden: boolean) => {
    setWorking(r.id);
    const ok = await setReviewHidden(r.id, hidden, token);
    setWorking("");
    if (ok) setRows((list) => list.map((x) => (x.id === r.id ? { ...x, hidden } : x)));
  };

  const remove = async (r: RemoteReview) => {
    if (!confirm(`למחוק לגמרי את הביקורת של ${r.name}? אין דרך חזרה.`)) return;
    setWorking(r.id);
    const ok = await deleteReview(r.id, token);
    setWorking("");
    if (ok) setRows((list) => list.filter((x) => x.id !== r.id));
  };

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-bold">ביקורות מהאתר</div>
        <p className="text-[11px] text-ink-500 mt-0.5">
          מתפרסמות לבד, מיד. כאן רק מורידים אחת שלא במקומה.
        </p>
      </div>
      {token && (
        <div className="flex items-center gap-2">
          <Btn size="sm" variant="ghost" onClick={() => void load(token)}>רענן</Btn>
          <Btn size="sm" variant="ghost" onClick={() => { signOut(); setRows([]); setLoaded(false); }}>יציאה</Btn>
        </div>
      )}
    </div>
  );

  if (!token) {
    return (
      <div className="space-y-4">
        {header}
        {!tried ? (
          <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div>
        ) : (
          <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3 max-w-sm">
            <div className="text-sm font-bold">כניסה</div>
            <p className="text-[11px] text-ink-500">אותה כניסה של ההזמנות.</p>
            <Input
              type="email" dir="ltr" placeholder="מייל" value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthErr(""); }}
            />
            <Input
              type="password" dir="ltr" placeholder="סיסמה" value={pw}
              onChange={(e) => { setPw(e.target.value); setAuthErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void signIn(email, pw).then((ok) => ok && setPw("")); }}
            />
            <div className="flex items-center gap-2">
              <Btn size="sm" onClick={() => void signIn(email, pw).then((ok) => ok && setPw(""))} disabled={authBusy || !email.trim() || !pw}>
                {authBusy ? "רגע…" : "כניסה"}
              </Btn>
              {authErr && <span className="text-xs text-bad">{authErr}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {!loaded && <div className="p-8 text-center text-sm text-ink-500 rounded-2xl border border-ink-800">טוען…</div>}

      {loaded && rows.length === 0 && (
        <div className="p-8 rounded-2xl border border-dashed border-ink-700 text-center text-sm text-ink-400">
          עוד לא כתבו ביקורת דרך האתר. כשיכתבו — היא תהיה כאן ובאתר באותו רגע.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <article
            key={r.id}
            className={cn(
              "p-4 rounded-2xl border bg-ink-900/40",
              r.hidden ? "border-ink-800 opacity-60" : "border-ink-700",
            )}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{r.name}</span>
                {r.tag && <span className="text-xs text-ink-400">{r.tag}</span>}
                <Pill tone="neutral">{SEG_LABEL[r.seg] ?? r.seg}</Pill>
                <span className="flex gap-0.5 text-flame">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Icon key={i} name="star" size={13} className="fill-current" />
                  ))}
                </span>
                {r.hidden && <Pill tone="flame">מוסתרת</Pill>}
              </div>
              <span className="text-[11px] text-ink-500 font-mono" dir="ltr">{when(r.created_at)}</span>
            </div>

            {r.item && <div className="text-xs text-ink-400 mb-1">הזמינו: {r.item}</div>}
            <p className="text-sm text-ink-200 leading-relaxed whitespace-pre-wrap">{r.txt}</p>

            <div className="mt-3 flex items-center gap-2">
              <Btn size="sm" variant="ghost" disabled={working === r.id} onClick={() => void hide(r, !r.hidden)}>
                {r.hidden ? "החזר לאתר" : "הורד מהאתר"}
              </Btn>
              <button
                type="button"
                disabled={working === r.id}
                onClick={() => void remove(r)}
                className="text-xs text-ink-500 hover:text-bad transition-colors disabled:opacity-40"
              >
                מחק
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
