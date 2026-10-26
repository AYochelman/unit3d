"use client";
import { useCallback, useEffect, useState } from "react";
import Btn from "@/components/ui/Btn";
import { Input } from "@/components/ui/Field";
import { liveNow, saveLiveTargets, type LiveNow, type LiveTarget } from "@/lib/printer-remote";
import { cn } from "@/lib/cn";

const PLATFORM_HE: Record<string, string> = { instagram: "אינסטגרם", tiktok: "טיקטוק" };

const SOCIAL_HE = (s: string) =>
  s === "streaming" ? "משדר — אפשר ללחוץ Go live" : s === "waiting" ? "מחכה שההדפסה תשדר…" : s;

/**
 * Instagram (and TikTok, once the account may stream from software): neither
 * has a fixed stream key, so each live is opened by hand and its key pasted
 * here. The agent starts streaming to it within seconds, vertical, and stops
 * when the print ends.
 */
export default function SocialLive({ token }: { token: string }) {
  const [platform, setPlatform] = useState<LiveTarget["platform"]>("instagram");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState<LiveNow | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState("");

  const refresh = useCallback(() => {
    void liveNow(token).then((r) => { setNow(r.now); setPending(r.pending); });
  }, [token]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, 5_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [refresh]);

  const copy = (what: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(""), 1500); });
  };

  const send = async (targets: LiveTarget[], done: string) => {
    setSaving(true);
    const ok = await saveLiveTargets(token, targets);
    setSaving(false);
    setMsg(ok ? { ok: true, text: done } : { ok: false, text: "השמירה נכשלה. נסה שוב." });
    if (ok) { setUrl(""); setKey(""); refresh(); }
  };

  const start = () => {
    if (!/^rtmps?:\/\//i.test(url.trim())) { setMsg({ ok: false, text: "הכתובת מתחילה ב-rtmps:// — העתק את Stream URL כמו שהוא." }); return; }
    if (!key.trim()) { setMsg({ ok: false, text: "חסר מפתח השידור (Stream key)." }); return; }
    void send([{ platform, url: url.trim(), key: key.trim() }], "נשלח. תוך כמה שניות התצוגה המקדימה תופיע שם — ואז לוחצים Go live.");
  };

  const streaming = Object.entries(now?.social ?? {});

  return (
    <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
      <div className="text-sm font-bold">לייב באינסטגרם / טיקטוק</div>
      <p className="text-[12px] text-ink-400">
        שם אין מפתח קבוע, אז כל לייב נפתח ביד: פותחים לייב ב-instagram.com, מדביקים כאן את הכתובת והמפתח, וה-Pi משדר לשם תוך שניות, במסך אנכי.
        כשההדפסה נגמרת השידור נעצר לבד והמפתח נשכח.
      </p>

      <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("h-2.5 w-2.5 rounded-full", now?.printing ? "bg-good" : "bg-ink-600")} />
          {now?.printing ? "המדפסת מדפיסה עכשיו" : "המדפסת לא מדפיסה — הלייב יתחיל כשתתחיל הדפסה"}
        </div>
        {pending && <p className="text-[12px] text-amber-300">נשלח לסוכן, מחכה שיקלוט…</p>}
        {streaming.map(([p, s]) => (
          <p key={p} className="text-[12px] text-ink-300">
            {PLATFORM_HE[p] ?? p}: <span className={s === "streaming" ? "text-good" : "text-ink-400"}>{SOCIAL_HE(s)}</span>
          </p>
        ))}
        {now?.printing && now.title && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] text-ink-500">כותרת מוכנה ללייב:</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-[13px] text-ink-100 bg-ink-900 border border-ink-800 rounded-lg px-3 py-2">{now.title}</div>
              <Btn size="sm" variant="ghost" onClick={() => copy("title", now.title!)}>{copied === "title" ? "הועתק" : "העתקה"}</Btn>
            </div>
            {now.description && (
              <button type="button" onClick={() => copy("desc", now.description!)} className="text-[11px] text-ink-400 underline">
                {copied === "desc" ? "התיאור הועתק" : "להעתיק גם את התיאור"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1">
        {(["instagram", "tiktok"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={cn("px-3 h-8 rounded-lg text-xs border", platform === p ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-400")}
          >
            {PLATFORM_HE[p]}
          </button>
        ))}
      </div>
      {platform === "tiktok" && (
        <p className="text-[11px] text-amber-300">טיקטוק נותן מפתח שידור רק לחשבונות עם 1,000 עוקבים ומעלה. עד אז הוא לא יופיע שם.</p>
      )}
      <label className="block space-y-1">
        <span className="text-[12px] text-ink-300">Stream URL</span>
        <Input dir="ltr" autoComplete="off" spellCheck={false} placeholder="rtmps://edgetee-upload-….fbcdn.net:443/rtmp/" value={url} onChange={(e) => { setUrl(e.target.value.trim()); setMsg(null); }} className="font-mono text-xs" />
      </label>
      <label className="block space-y-1">
        <span className="text-[12px] text-ink-300">Stream key</span>
        <Input dir="ltr" autoComplete="off" spellCheck={false} type="password" placeholder="…" value={key} onChange={(e) => { setKey(e.target.value.trim()); setMsg(null); }} className="font-mono text-xs" />
      </label>
      <div className="flex items-center gap-2">
        <Btn size="sm" onClick={start} disabled={saving}>{saving ? "שולח…" : "התחל לשדר לשם"}</Btn>
        {streaming.length > 0 && (
          <button type="button" onClick={() => void send([], "נשלח. השידור לשם ייעצר תוך כמה שניות.")} className="text-[12px] text-ink-500 hover:text-bad underline">
            עצור
          </button>
        )}
      </div>
      {msg && <p className={cn("text-[12px]", msg.ok ? "text-good" : "text-bad")}>{msg.text}</p>}

      {now?.topic && (
        <div className="pt-2 border-t border-ink-800 space-y-1">
          <div className="text-[12px] font-bold">התראה לטלפון כשמתחילה הדפסה</div>
          <p className="text-[11px] text-ink-400">
            מתקינים את האפליקציה החינמית <b>ntfy</b> (אנדרואיד / אייפון), לוחצים ״+״ ומקלידים את הנושא:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-[13px] bg-ink-900 border border-ink-800 rounded-lg px-3 py-1.5" dir="ltr">{now.topic}</code>
            <Btn size="sm" variant="ghost" onClick={() => copy("topic", now.topic!)}>{copied === "topic" ? "הועתק" : "העתקה"}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
