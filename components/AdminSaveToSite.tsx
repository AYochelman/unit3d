"use client";
import { useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

// Saving from the phone, without a computer and without a server.
//
// The site is a static build on GitHub Pages, so the only writable store it
// has is the repository itself. This writes public/admin-settings.json through
// the GitHub contents API with a token the owner types here; the push starts
// the normal Pages build, and a minute later every visitor gets the new prices.
//
// The token is held in component state for the length of the save and is never
// stored, exported or logged — the project forbids browser storage anyway, and
// a credential is the last thing that should live in it.

const DEFAULT_REPO = "AYochelman/unit3d";
const FILE_PATH = "public/admin-settings.json";
const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";

/** UTF-8 safe base64 — btoa alone throws on anything outside Latin-1. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

type Msg = { ok: boolean; text: string };

export default function AdminSaveToSite({ json }: { json: () => string }) {
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const save = async () => {
    if (!token.trim()) {
      setMsg({ ok: false, text: "צריך טוקן GitHub כדי לכתוב לאתר." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const api = `https://api.github.com/repos/${repo.trim()}/contents/${FILE_PATH}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      // The API needs the current sha to replace a file; 404 just means it is new.
      let sha: string | undefined;
      const head = await fetch(`${api}?ref=${encodeURIComponent(branch.trim())}`, { headers });
      if (head.ok) {
        sha = ((await head.json()) as { sha?: string }).sha;
      } else if (head.status === 401) {
        setMsg({ ok: false, text: "הטוקן לא תקין או פג תוקף." });
        return;
      } else if (head.status === 403) {
        setMsg({ ok: false, text: "לטוקן אין הרשאת כתיבה למאגר הזה." });
        return;
      } else if (head.status !== 404) {
        setMsg({ ok: false, text: `GitHub החזיר שגיאה ${head.status}.` });
        return;
      }

      const put = await fetch(api, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Update shop settings from /admin",
          content: toBase64(json()),
          branch: branch.trim(),
          ...(sha ? { sha } : {}),
        }),
      });

      if (put.ok) {
        setToken("");
        setMsg({
          ok: true,
          text: "נשמר. האתר נבנה מחדש עכשיו — תוך כדקה ההגדרות יחולו על כל מי שנכנס.",
        });
      } else if (put.status === 409) {
        setMsg({ ok: false, text: "מישהו עדכן את הקובץ בינתיים. רענן ונסה שוב." });
      } else if (put.status === 403 || put.status === 404) {
        setMsg({ ok: false, text: "לטוקן אין הרשאת כתיבה למאגר הזה." });
      } else {
        const body = (await put.json().catch(() => null)) as { message?: string } | null;
        setMsg({ ok: false, text: `שמירה נכשלה (${put.status}): ${body?.message ?? "שגיאה לא ידועה"}` });
      }
    } catch {
      setMsg({ ok: false, text: "אין חיבור ל-GitHub. בדוק את האינטרנט ונסה שוב." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-flame/40 bg-flame/5">
      <h2 className="font-black text-lg mb-1">שמירה ישירות לאתר</h2>
      <p className="text-sm text-ink-300 leading-relaxed mb-3">
        עובד גם מהטלפון, בלי מחשב. הכפתור כותב את ההגדרות ל-GitHub, האתר נבנה מחדש לבד,
        ותוך כדקה כל מי שנכנס רואה את המחירים והמלאי שקבעת. המיילים של רשימת ההמתנה לא נכללים בקובץ.
      </p>

      <div className="grid gap-2 sm:grid-cols-2 mb-2">
        <label className="text-xs text-ink-400">
          מאגר
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} dir="ltr" className="mt-1" />
        </label>
        <label className="text-xs text-ink-400">
          ענף
          <Input value={branch} onChange={(e) => setBranch(e.target.value)} dir="ltr" className="mt-1" />
        </label>
      </div>

      <label className="block text-xs text-ink-400 mb-3">
        טוקן GitHub
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_..."
          dir="ltr"
          autoComplete="off"
          className="mt-1"
        />
        <span className="block mt-1 text-[11px] text-ink-500 leading-relaxed">
          הטוקן משמש לשמירה אחת ולא נשמר בשום מקום — צריך להדביק אותו שוב בכל שמירה.{" "}
          <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="text-flame underline">
            ליצירת טוקן
          </a>
          {" — בחר "}
          <bdi dir="ltr">Fine-grained</bdi>
          {", רק את המאגר הזה, והרשאה "}
          <bdi dir="ltr">Contents: Read and write</bdi>
          {"."}
        </span>
      </label>

      <Btn variant="primary" size="sm" icon={busy ? "rotate" : "check"} onClick={save} disabled={busy}>
        {busy ? "שומר…" : "שמור לאתר עכשיו"}
      </Btn>

      {msg && (
        <p
          className={cn(
            "mt-3 text-sm flex items-start gap-2",
            msg.ok ? "text-good" : "text-bad",
          )}
        >
          <Icon name={msg.ok ? "check" : "x"} size={15} className="mt-0.5 shrink-0" />
          <span>{msg.text}</span>
        </p>
      )}
    </div>
  );
}
