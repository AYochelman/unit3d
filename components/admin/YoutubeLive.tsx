"use client";
import { useCallback, useEffect, useState } from "react";
import Btn from "@/components/ui/Btn";
import { Input } from "@/components/ui/Field";
import { saveYoutubeSetup, youtubeStatus, type YoutubeStatus } from "@/lib/printer-remote";
import { cn } from "@/lib/cn";

const when = (iso: string) => new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

const STATE_TEXT: Record<YoutubeStatus["state"], string> = {
  off: "כבוי",
  "key-only": "משדר ליוטיוב בכל הדפסה (בלי שם ההדפסה בכותרת — חסר חיבור לערוץ)",
  "signing-in": "הסוכן מתחבר לגוגל…",
  "needs-code": "מחכה לאישור שלך בגוגל",
  connected: "מחובר — הלייב הבא יקבל את שם ההדפסה בכותרת ובתיאור",
  live: "בשידור עכשיו",
  "signed-out": "החיבור לערוץ פג — צריך לאשר שוב",
  error: "שגיאה בחיבור לגוגל",
};

/**
 * YouTube Live, from the phone: the stream key and the Google sign-in.
 * The agent on the Pi picks these up within a minute and keeps them there;
 * what it says back — the code to type at google.com/device, the live title —
 * shows up here.
 */
export default function YoutubeLive({ token }: { token: string }) {
  const [streamKey, setStreamKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [showText, setShowText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState<YoutubeStatus | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(() => {
    void youtubeStatus(token).then((r) => { setStatus(r.status); setPending(r.pending); });
  }, [token]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, 5_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [refresh]);

  const send = async (setup: Parameters<typeof saveYoutubeSetup>[1], done: string) => {
    setSaving(true);
    const ok = await saveYoutubeSetup(token, setup);
    setSaving(false);
    setMsg(ok ? { ok: true, text: done } : { ok: false, text: "השמירה נכשלה. נסה שוב." });
    if (ok) { setStreamKey(""); setClientId(""); setClientSecret(""); refresh(); }
  };

  const save = () => {
    const setup = {
      ...(streamKey.trim() ? { streamKey: streamKey.trim() } : {}),
      ...(clientId.trim() ? { clientId: clientId.trim() } : {}),
      ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
      ...(title.trim() ? { titleTemplate: title.trim() } : {}),
      ...(desc.trim() ? { descriptionTemplate: desc.trim() } : {}),
    };
    if (!Object.keys(setup).length) { setMsg({ ok: false, text: "לא מילאת כלום." }); return; }
    if (clientId.trim() && !clientId.trim().endsWith(".apps.googleusercontent.com")) {
      setMsg({ ok: false, text: "ה-Client ID נגמר ב-.apps.googleusercontent.com — בדוק שהעתקת את כולו." });
      return;
    }
    void send(setup, "נשמר. הסוכן יקלוט את זה תוך דקה — המצב למטה יתעדכן לבד.");
  };

  const s = status?.state ?? "off";

  return (
    <div className="p-4 rounded-2xl border border-ink-800 bg-ink-900/40 space-y-3">
      <div className="text-sm font-bold">לייב ביוטיוב</div>
      <p className="text-[12px] text-ink-400">
        בכל פעם שהמדפסת מתחילה להדפיס, הסוכן משדר ליוטיוב, וכותרת ותיאור הלייב מקבלים את שם ההדפסה. כשההדפסה נגמרת השידור נעצר לבד.
      </p>

      <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("h-2.5 w-2.5 rounded-full", s === "live" ? "bg-bad animate-pulse" : s === "connected" || s === "key-only" ? "bg-good" : s === "off" ? "bg-ink-600" : "bg-amber-400")} />
          {pending ? "נשלח לסוכן, מחכה שיקלוט (עד דקה)…" : STATE_TEXT[s]}
        </div>
        {s === "needs-code" && status?.code && (
          <div className="space-y-1">
            <p className="text-[12px] text-ink-300">
              פתח בטלפון את <a href={status.url} target="_blank" rel="noreferrer" className="text-flame underline" dir="ltr">{status.url}</a>, הקלד את הקוד, ובחר את חשבון הגוגל של הערוץ:
            </p>
            <div className="font-mono text-2xl font-black tracking-widest text-center py-2" dir="ltr">{status.code}</div>
            {status.until && <p className="text-[11px] text-ink-500">הקוד תקף עד {when(status.until)}. אם פג — קוד חדש יופיע כאן לבד.</p>}
          </div>
        )}
        {s === "live" && status?.video && (
          <p className="text-[12px] text-ink-300">
            {status.title} · <a href={`https://youtu.be/${status.video}`} target="_blank" rel="noreferrer" className="text-flame underline">לצפייה</a>
          </p>
        )}
        {s === "error" && status?.why && <p className="text-[11px] text-bad" dir="ltr">{status.why}</p>}
        {status?.at && <p className="text-[11px] text-ink-500">עדכון מהסוכן: {when(status.at)}</p>}
      </div>

      <label className="block space-y-1">
        <span className="text-[12px] text-ink-300">מפתח שידור (Stream key) — YouTube Studio ← שידור חי ← Stream</span>
        <Input dir="ltr" autoComplete="off" spellCheck={false} type="password" placeholder="xxxx-xxxx-xxxx-xxxx-xxxx" value={streamKey} onChange={(e) => { setStreamKey(e.target.value.trim()); setMsg(null); }} className="font-mono" />
      </label>
      <label className="block space-y-1">
        <span className="text-[12px] text-ink-300">OAuth Client ID (בשביל שם ההדפסה בכותרת)</span>
        <Input dir="ltr" autoComplete="off" spellCheck={false} placeholder="…apps.googleusercontent.com" value={clientId} onChange={(e) => { setClientId(e.target.value.trim()); setMsg(null); }} className="font-mono" />
      </label>
      <label className="block space-y-1">
        <span className="text-[12px] text-ink-300">OAuth Client secret</span>
        <Input dir="ltr" autoComplete="off" spellCheck={false} type="password" placeholder="GOCSPX-…" value={clientSecret} onChange={(e) => { setClientSecret(e.target.value.trim()); setMsg(null); }} className="font-mono" />
      </label>

      <button type="button" onClick={() => setShowText((v) => !v)} className="text-[12px] text-ink-400 underline">
        {showText ? "הסתר" : "לשנות את נוסח הכותרת והתיאור"}
      </button>
      {showText && (
        <div className="space-y-2">
          <p className="text-[11px] text-ink-500">
            אפשר לשלב: <span dir="ltr" className="font-mono">{"{name}"}</span> שם ההדפסה · <span dir="ltr" className="font-mono">{"{model}"}</span> המדפסת · <span dir="ltr" className="font-mono">{"{filament}"}</span> החומר · <span dir="ltr" className="font-mono">{"{layers}"}</span> שכבות · <span dir="ltr" className="font-mono">{"{time}"}</span> זמן הדפסה. ריק = הנוסח הקבוע.
          </p>
          <Input placeholder="🔴 מדפיסים עכשיו: {name} | Unit 3D" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            rows={5}
            placeholder={"מה מודפס עכשיו: {name}\nמדפסת: {model} · חומר: {filament}\n…"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg bg-ink-900 border border-ink-700 text-ink-50 placeholder:text-ink-500 focus:border-flame outline-none text-sm"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Btn size="sm" onClick={save} disabled={saving}>{saving ? "שומר…" : "שמירה"}</Btn>
        {s !== "off" && (
          <button
            type="button"
            onClick={() => { if (confirm("לנתק את הלייב ביוטיוב? הסוכן ימחק את המפתח ואת החיבור לערוץ.")) void send({ clear: true }, "נשלח. הסוכן יתנתק תוך דקה."); }}
            className="text-[12px] text-ink-500 hover:text-bad underline"
          >
            ניתוק
          </button>
        )}
      </div>
      {msg && <p className={cn("text-[12px]", msg.ok ? "text-good" : "text-bad")}>{msg.text}</p>}
      <p className="text-[11px] text-ink-500">המפתחות נשמרים רק על ה-Pi. אחרי שהסוכן קולט אותם הם נמחקים מהמסד, ולא מוצגים כאן שוב.</p>
    </div>
  );
}
