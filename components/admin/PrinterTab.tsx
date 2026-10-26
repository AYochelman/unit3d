"use client";
import { useCallback, useEffect, useState } from "react";
import Btn from "@/components/ui/Btn";
import { Input } from "@/components/ui/Field";
import { useSupabaseSession } from "@/lib/use-supabase-session";
import { accessCodeSetAt, agentInfo, agentStatus, saveAccessCode, validAccessCode, type AgentInfo, type AgentStatus } from "@/lib/printer-remote";
import { cn } from "@/lib/cn";
import YoutubeLive from "@/components/admin/YoutubeLive";
import SocialLive from "@/components/admin/SocialLive";

const STATE_HE: Record<string, string> = {
  printing: "מדפיסה",
  paused: "מושהית",
  idle: "פנויה",
  finished: "סיימה",
  failed: "נכשלה",
  offline: "לא עונה לסוכן",
};

const when = (iso: string) => new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

/**
 * The printer, from the phone: what the agent sees, and a place to paste the
 * printer's new LAN access code when it changes. The agent picks the code up
 * within a minute and reconnects with it — nobody has to sit at the Pi.
 */
export default function PrinterTab() {
  const { token, email, setEmail, busy: authBusy, error: authErr, setError: setAuthErr, tried, signIn, signOut } = useSupabaseSession();
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [setAt, setSetAt] = useState<string | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [fresh, setFresh] = useState(false);
  const [info, setInfo] = useState<AgentInfo | null>(null);

  const refresh = useCallback(() => {
    void agentStatus().then((st) => {
      setStatus(st);
      setFresh(!!st?.updated_at && Date.now() - Date.parse(st.updated_at) < 3 * 60_000);
    });
    if (token) {
      void accessCodeSetAt(token).then(setSetAt);
      void agentInfo(token).then(setInfo);
    }
  }, [token]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, 10_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [refresh]);

  const save = async () => {
    if (!token) return;
    if (!validAccessCode(code)) { setMsg({ ok: false, text: "קוד הגישה הוא 8 תווים, אותיות ומספרים בלבד, כמו שמופיע במסך המדפסת." }); return; }
    setSaving(true);
    const ok = await saveAccessCode(token, code);
    setSaving(false);
    setMsg(ok
      ? { ok: true, text: "נשמר. הסוכן יקלוט אותו תוך דקה ויתחבר מחדש — המצב למטה יתעדכן לבד." }
      : { ok: false, text: "השמירה נכשלה. נסה שוב." });
    if (ok) { setCode(""); refresh(); }
  };

  const header = (
    <div>
      <h2 className="text-lg font-black mb-1">מדפסת</h2>
      <p className="text-xs text-ink-500">מה הסוכן רואה עכשיו, ומקום להדביק קוד גישה חדש של המדפסת כשהוא מתחלף.</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-xl">
      {header}

      <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-1.5">
        <div className="text-sm font-bold">מצב</div>
        {status ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("h-2.5 w-2.5 rounded-full", !fresh ? "bg-ink-600" : status.state === "offline" ? "bg-bad" : "bg-good")} />
              {!fresh ? "הסוכן לא מדווח (כבוי, או בלי אינטרנט)" : `הסוכן פעיל · המדפסת ${STATE_HE[status.state] ?? status.state}`}
            </div>
            <div className="text-[11px] text-ink-500">
              עדכון אחרון מהסוכן: {when(status.updated_at)}
              {status.job_name ? ` · עבודה: ${status.job_name}` : ""}
            </div>
            {info && (
              <div className="text-[11px] text-ink-400" dir="ltr">
                {info.host} · {info.ips.join(", ")} · {info.platform} · {info.user}@ · v{info.version}
                <div className="text-ink-500">{info.dir} · reported {when(info.at)}</div>
              </div>
            )}
            {fresh && status.state === "offline" && (
              <p className="text-[12px] text-amber-300">הסוכן רץ אבל המדפסת לא עונה לו — בדרך כלל קוד גישה שהתחלף. הדבק את החדש למטה.</p>
            )}
          </>
        ) : (
          <div className="text-[12px] text-ink-500">טוען…</div>
        )}
      </div>

      {!token ? (
        !tried ? null : (
          <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3 max-w-sm">
            <div className="text-sm font-bold">כניסה</div>
            <p className="text-[11px] text-ink-500">אותה כניסה של ההזמנות וההוצאות.</p>
            <Input type="email" dir="ltr" placeholder="מייל" value={email} onChange={(e) => { setEmail(e.target.value); setAuthErr(""); }} />
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
        )
      ) : (
        <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold">קוד גישה חדש למדפסת</div>
            <span className="flex-1" />
            <span className="text-[11px] text-ink-500">מחובר{email ? ` · ${email}` : ""}</span>
            <button type="button" onClick={signOut} className="text-[11px] text-ink-500 hover:text-bad underline">יציאה</button>
          </div>
          <p className="text-[12px] text-ink-400">
            במסך המדפסת: Settings ← LAN Only ← Access Code. הדבק אותו כאן — הסוכן יעדכן את עצמו תוך דקה.
          </p>
          <div className="flex gap-2">
            <Input
              dir="ltr" autoComplete="off" spellCheck={false} placeholder="12345678"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\s/g, "")); setMsg(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") void save(); }}
              aria-label="קוד גישה"
              className="font-mono"
            />
            <Btn size="sm" onClick={() => void save()} disabled={saving || !code}>{saving ? "שומר…" : "עדכון"}</Btn>
          </div>
          {msg && <p className={cn("text-[12px]", msg.ok ? "text-good" : "text-bad")}>{msg.text}</p>}
          {setAt && <p className="text-[11px] text-ink-500">עודכן מכאן לאחרונה: {when(setAt)}</p>}
        </div>
      )}
      {token && <YoutubeLive token={token} />}
      {token && <SocialLive token={token} />}
    </div>
  );
}
