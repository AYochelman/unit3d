"use client";
import { useState } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { useAdminStore } from "@/lib/admin-store";

// Saving from the phone, without a computer and without a server.
//
// The site is a static build on GitHub Pages, so the only writable store it
// has is the repository itself. This writes public/admin-settings.json through
// the GitHub contents API with a token the owner types here; the push starts
// the normal Pages build, and a minute later every visitor gets the new prices.
//
// The token is pasted once, ever, and remembered on this device (see
// lib/admin-token.ts). From then on saving is a single click — which is the
// point: an approvals page that asks for a credential before every batch is a
// page nobody uses. It never goes into the export file or a log.

const DEFAULT_REPO = "AYochelman/unit3d";
const DEFAULT_FILE = "public/admin-settings.json";
const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";

/** UTF-8 safe base64 — btoa alone throws on anything outside Latin-1. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Why GitHub said no.
 *
 * A 403/404 from the contents API is the same answer for four different
 * mistakes, and "no write permission" sent the owner back to a settings page
 * he had already filled in once. So when a write is refused we ask GitHub two
 * cheap questions — who is this token, and can it see the repository — and
 * name the one box that is actually wrong.
 */
async function diagnose(token: string, repo: string, branch: string, failed?: Response): Promise<string> {
  // GitHub's own words about the refusal, when it sent any. They name the case
  // the checks below cannot see — most often a token that may read the
  // repository but was never granted Contents: Read and write.
  const said = failed
    ? ((await failed.json().catch(() => null)) as { message?: string } | null)?.message ?? ""
    : "";
  const quote = said ? ` (GitHub: "${said}")` : "";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  try {
    const who = await fetch("https://api.github.com/user", { headers });
    if (who.status === 401) return "הטוקן לא תקין או פג תוקף. צור אחד חדש והדבק שוב.";

    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (r.status === 404) {
      return `הטוקן לא רואה את המאגר ${repo}. בדף יצירת הטוקן: Repository access ← Only select repositories ← לבחור את unit3d. בלי זה הטוקן לא מגיע לשם.`;
    }
    if (!r.ok) return `GitHub החזיר ${r.status} על המאגר ${repo}.`;

    const info = (await r.json()) as { permissions?: { push?: boolean }; default_branch?: string };
    if (info.default_branch && info.default_branch !== branch) {
      return `הענף ${branch} לא קיים. הענף של האתר הוא ${info.default_branch}.`;
    }
    // `permissions.push` describes the ACCOUNT's rights on the repository, not
    // the token's. A fine-grained token with Contents left on Read-only still
    // reports push:true and then refuses the write — so a refusal that gets
    // this far is that box, until GitHub says otherwise.
    return `לטוקן אין הרשאת כתיבה לקבצים${quote}. בדף הטוקן: Permissions ← Repository permissions ← Contents ← Read and write, ולוודא ש-unit3d נבחר תחת Repository access. אם זה עדיין נכשל — טוקן קלאסי מ-github.com/settings/tokens/new עם הסימון repo עובד תמיד.`;
  } catch {
    return "אין חיבור ל-GitHub.";
  }
}

type Msg = { ok: boolean; text: string };

export default function AdminSaveToSite({
  json,
  path = DEFAULT_FILE,
  title = "שמירה לאתר (מהטלפון)",
  what = "המחירים",
}: {
  json: () => string;
  /** Which file in the repository this button writes. */
  path?: string;
  title?: string;
  /** What the owner is saving, for the confirmation line. */
  what?: string;
}) {
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [branch, setBranch] = useState("main");
  const token = useAdminStore((s) => s.ghToken);
  const setToken = useAdminStore((s) => s.setGhToken);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const save = async () => {
    if (!token.trim()) {
      setMsg({ ok: false, text: "צריך טוקן GitHub כדי לכתוב לאתר." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const api = `https://api.github.com/repos/${repo.trim()}/contents/${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Right after a write, the contents API keeps serving the previous sha
    // from its cache for a few seconds — so the second save of a sitting
    // arrives with a stale sha and GitHub answers 409. Nobody else edited
    // anything; the fix is to ask again, uncached, and retry. Only a conflict
    // that survives every attempt is worth telling the owner about.
    const readSha = async (): Promise<{ sha?: string; error?: Msg }> => {
      const url = `${api}?ref=${encodeURIComponent(branch.trim())}&t=${Date.now()}`;
      // No Cache-Control header here on purpose: GitHub's CORS policy does not
      // allow it, and a rejected preflight surfaces as a bare network failure.
      // The timestamp above plus `cache: "no-store"` are enough to bypass the
      // browser's copy without adding a header the server will not accept.
      const r = await fetch(url, { headers, cache: "no-store" });
      if (r.ok) return { sha: ((await r.json()) as { sha?: string }).sha };
      if (r.status === 404) return {};                       // a file that does not exist yet
      if (r.status === 401) return { error: { ok: false, text: "הטוקן לא תקין או פג תוקף." } };
      if (r.status === 403) return { error: { ok: false, text: await diagnose(token.trim(), repo.trim(), branch.trim(), r) } };
      return { error: { ok: false, text: `GitHub החזיר שגיאה ${r.status}.` } };
    };

    try {
      const body = toBase64(json());
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 700 * attempt));

        const { sha, error } = await readSha();
        if (error) return setMsg(error);

        const put = await fetch(api, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Update shop settings from /admin",
            content: body,
            branch: branch.trim(),
            ...(sha ? { sha } : {}),
          }),
        });

        if (put.ok) {
          return setMsg({
            ok: true,
            text: "נשמר. האתר נבנה מחדש עכשיו — תוך כדקה ההגדרות יחולו על כל מי שנכנס.",
          });
        }
        if (put.status === 409 || put.status === 422) continue;   // stale sha — read it again
        if (put.status === 403 || put.status === 404) {
          return setMsg({ ok: false, text: await diagnose(token.trim(), repo.trim(), branch.trim(), put) });
        }
        const err = (await put.json().catch(() => null)) as { message?: string } | null;
        return setMsg({ ok: false, text: `שמירה נכשלה (${put.status}): ${err?.message ?? "שגיאה לא ידועה"}` });
      }
      setMsg({ ok: false, text: "GitHub עדיין מחזיק את הגרסה הקודמת. חכה כחצי דקה ולחץ שוב." });
    } catch (e) {
      const why = e instanceof Error && e.message ? ` (${e.message})` : "";
      setMsg({ ok: false, text: `הבקשה ל-GitHub נכשלה${why}. בדוק את האינטרנט ונסה שוב.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-flame/40 bg-flame/5">
      <h2 className="font-black text-lg mb-1">{title}</h2>
      <p className="text-sm text-ink-300 leading-relaxed mb-3">
        {token
          ? <>לחיצה אחת. האתר נבנה מחדש לבד, ותוך כדקה {what} באוויר.</>
          : <>עובד גם מהטלפון, בלי מחשב. אחרי הדבקה אחת של הטוקן, כל שמירה מכאן היא לחיצה אחת.</>}
      </p>

      {token && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-good/10 text-good border border-good/30 font-semibold">
            <Icon name="check" size={12} strokeWidth={3} />
            מחובר · לחיצה אחת ושמור
          </span>
          <button type="button" onClick={() => setToken("")} className="text-ink-500 hover:text-ink-300 underline underline-offset-2">
            שכח את הטוקן
          </button>
        </div>
      )}

      <div className={cn("grid gap-2 sm:grid-cols-2 mb-2", token && "hidden")}>
        <label className="text-xs text-ink-400">
          מאגר
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} dir="ltr" className="mt-1" />
        </label>
        <label className="text-xs text-ink-400">
          ענף
          <Input value={branch} onChange={(e) => setBranch(e.target.value)} dir="ltr" className="mt-1" />
        </label>
      </div>

      <div className={cn(token && "hidden")}>
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
            מדביקים <b>פעם אחת בלבד</b>. הוא נשמר במכשיר הזה, וכל שמירה מכאן והלאה היא לחיצה אחת. לא נכנס לקובץ הגיבוי.{" "}
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
      </div>


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
