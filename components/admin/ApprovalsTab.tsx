"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { CANDIDATES } from "@/lib/candidates.generated";
import SyncStatus from "./SyncStatus";
import { SHELF_LABEL, SHELVES, type Decision, type DecisionsFile, type ModelDecision } from "@/lib/candidates";
import { fetchRepoQueue, useApprovalsStore } from "@/lib/approvals-store";
import { useAdminStore } from "@/lib/admin-store";
import { suggestPrice, type ImportedShelf } from "@/lib/imported";
import { photoSrc } from "@/lib/assets";
import { fmtILS } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * "מודלים לאישור" — nothing reaches the shop without a yes.
 *
 * The scans find far more than anyone would want to sell. Each find lands here
 * with its photo, its numbers, its licence and anything worth knowing before
 * agreeing to print it; the owner picks a shelf and approves, or rejects. The
 * answers are saved to the repository exactly like the prices are, and the next
 * build turns the approved ones into real products.
 */
export default function ApprovalsTab() {
  // In a store, not useState: switching admin tabs unmounts this one, and that
  // used to throw away every answer given so far.
  const choices = useApprovalsStore((s) => s.choices);
  const setChoices = useApprovalsStore((s) => s.update);
  const saved = useApprovalsStore((s) => s.saved);
  const markSaved = useApprovalsStore((s) => s.markSaved);
  const token = useAdminStore((s) => s.ghToken);
  const [onlyOpen, setOnlyOpen] = useState(true);

  /**
   * The repository's view of the queue. After a save the site takes about five
   * minutes to rebuild, and until then this build still lists every model that
   * was just answered — which read as "it did not save". So: a model gone from
   * the repository's queue is done; one in model-decisions.json is saved and
   * waiting for the bot. Neither is shown as open.
   */
  const [repo, setRepo] = useState<{ queued: Set<string>; pending: ModelDecision[] } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetchRepoQueue(token || undefined).then((r) => { if (live && r) setRepo(r); });
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, [token]);

  const done = useMemo(() => {
    const ids = new Set<string>(Object.keys(saved));
    if (repo) {
      for (const c of CANDIDATES) if (!repo.queued.has(c.id)) ids.add(c.id);
      for (const d of repo.pending) ids.add(d.id);
    }
    return ids;
  }, [repo, saved]);
  const open = CANDIDATES.filter((c) => !done.has(c.id));
  const doneHere = CANDIDATES.length - open.length;

  const unsaved = Object.entries(choices).filter(([id, c]) => c.decision && !done.has(id));
  const decided = unsaved.length;

  /**
   * Refusing to let an hour of answers disappear.
   *
   * Deciding 108 models is long work, and until it is saved it exists only in
   * this tab. A refresh used to take all of it silently. The browser will now
   * ask before leaving, which is the one warning it is allowed to give — and
   * the save bar above stays on screen while scrolling, so the way to keep the
   * work is never off the top of the page.
   */
  useEffect(() => {
    if (!decided) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [decided]);
  const list = useMemo(
    () => (onlyOpen ? open.filter((c) => !choices[c.id]?.decision) : CANDIDATES),
    [choices, onlyOpen, open],
  );

  const set = (id: string, decision: Decision, shelves: ImportedShelf[]) =>
    setChoices((c) => ({ ...c, [id]: { ...c[id], decision, shelves } }));   // keeps `he`

  /**
   * Clicking a shelf adds it, clicking it again removes it, and the last one
   * cannot be removed — something has to be its home. The FIRST click replaces
   * the suggestion: he meant "put it there", not "and there as well".
   */
  const toggle = (id: string, shelf: ImportedShelf) =>
    setChoices((prev) => {
      const cur = prev[id];
      if (!cur?.touched) return { ...prev, [id]: { ...cur, shelves: [shelf], touched: true } };
      const on = cur.shelves.includes(shelf);
      const shelves = on ? cur.shelves.filter((s2) => s2 !== shelf) : [...cur.shelves, shelf];
      return { ...prev, [id]: { ...cur, shelves: shelves.length ? shelves : cur.shelves } };
    });

  /**
   * Everything answered and not yet applied — this visit's answers plus the
   * ones already waiting in the repository. The bot empties the file after
   * applying it, so a second save before it ran must carry the first one too,
   * or it would overwrite it.
   */
  const json = () => {
    const mine = Object.entries(choices).filter(([, c]) => c.decision);
    const mineIds = new Set(mine.map(([id]) => id));
    const waiting = (repo?.pending ?? []).filter((d) => !mineIds.has(d.id) && repo?.queued.has(d.id));
    const file: DecisionsFile = {
      version: 1,
      decisions: [...waiting, ...mine
        .map(([id, c]) => ({
        id,
        decision: c.decision as Decision,
        ...(c.decision === "approved"
          ? {
              shelf: c.shelves[0],
              ...(c.shelves.length > 1 ? { also: c.shelves.slice(1) } : {}),
              ...(c.he?.trim() ? { he: c.he.trim() } : {}),
            }
          : {}),
        at: new Date().toISOString(),
      }))],
    };
    return JSON.stringify(file, null, 2);
  };

  if (!open.length && !decided) {
    return (
      <div className="space-y-4">
        <div className="max-w-3xl p-6 rounded-2xl border border-ink-800 bg-ink-900 text-center">
          <h2 className="font-black text-lg mb-1">
            {CANDIDATES.length ? `כל ${CANDIDATES.length} המודלים הוכרעו ונשמרו` : "אין מודלים שממתינים"}
          </h2>
          <p className="text-sm text-ink-400">
            {CANDIDATES.length
              ? "האתר מתעדכן תוך כ-5 דקות, והמודלים שאישרת עוברים לחנות. "
              : ""}
            התור מתמלא מהסריקה של התוסף בכרום, פעם ביום. למטה — מתי זה קרה לאחרונה ומה יצא מזה.
          </p>
        </div>
        <SyncStatus />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-lg">
            {open.length} מודלים ממתינים
            {decided > 0 && <span className="text-flame"> · {decided} הוכרעו</span>}
          </h2>
          <p className="text-sm text-ink-400">כל מודל כאן עדיין לא בחנות. בחר עמודה ואשר, או דחה.</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
          className="text-xs font-semibold px-3 h-9 rounded-lg border border-ink-700 text-ink-300 hover:border-ink-500"
        >
          {onlyOpen ? "הצג גם מה שהוכרע" : "הצג רק ממתינים"}
        </button>
      </div>

      {doneHere > 0 && (
        <p className="text-sm rounded-xl border border-good/40 bg-good/10 text-good px-3 py-2 flex items-start gap-2">
          <Icon name="check" size={15} className="mt-0.5 shrink-0" />
          <span>
            {doneHere} החלטות כבר נשמרו ב-GitHub. האתר מתעדכן לבד תוך כ-5 דקות, והמודלים שאישרת עוברים לחנות.
            אין צורך לשמור אותן שוב.
          </span>
        </p>
      )}

      {decided > 0 && (
        <div className="sticky top-2 z-20">
          <AdminSaveToSite
            json={json}
            path="public/model-decisions.json"
            onSaved={() => markSaved(unsaved.map(([id]) => id))}
            title={`שמירת ${decided} החלטות`}
            what="ההחלטות נשמרות גם כשעוברים בין לשוניות; רק רענון של הדף לפני שמירה ימחק אותן"
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => {
          const chosen = choices[c.id];
          const shelves = chosen?.shelves ?? [c.suggested];
          const price = suggestPrice(c.grams, c.hours, 1);
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-2xl border bg-ink-900 overflow-hidden transition-colors",
                chosen?.decision === "approved" ? "border-good/60"
                  : chosen?.decision === "rejected" ? "border-ink-800 opacity-50"
                  : "border-ink-800",
              )}
            >
              <div className="flex gap-3 p-3">
                <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-950">
                  <Image src={photoSrc(c.image)} alt="" aria-hidden fill sizes="96px" className="object-cover" unoptimized />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm leading-tight mb-0.5 line-clamp-2" dir="auto">{c.title}</div>
                  <div className="text-[11px] text-ink-400 mb-1.5">{c.creator}</div>
                  <div className="font-mono text-[10px] text-ink-400 flex flex-wrap gap-x-2" dir="ltr">
                    <span>{c.downloads.toLocaleString()} DL</span>
                    <span>{c.likes.toLocaleString()} ♥</span>
                    <span>{c.grams}g · {c.hours}h</span>
                    <span className="text-flame">{fmtILS(price)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Pill tone="neutral" className="text-[9px] px-1.5 py-0">{c.license || "—"}</Pill>
                    <Pill tone="cyan" className="text-[9px] px-1.5 py-0">{c.via}</Pill>
                    {c.warnings.map((w) => (
                      <Pill key={w} tone="flame" className="text-[9px] px-1.5 py-0">{w}</Pill>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3">
                <div className="text-[11px] text-ink-400 mb-1">
                  לאילו עמודות? <span className="text-ink-600">אפשר לבחור כמה. הראשונה היא הבית.</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {SHELVES.map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => toggle(c.id, sh)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                        shelves[0] === sh ? "border-flame text-flame bg-flame/15"
                          : shelves.includes(sh) ? "border-flame/50 text-flame/80 bg-flame/5"
                          : "border-ink-800 text-ink-400 hover:border-ink-600",
                      )}
                    >
                      {shelves[0] === sh && "★ "}{SHELF_LABEL[sh]}
                    </button>
                  ))}
                </div>
                <label className="block mb-2.5">
                  <span className="text-[11px] text-ink-400">שם בעברית לחנות</span>
                  <input
                    value={chosen?.he ?? ""}
                    onChange={(e) => {
                      const he = e.target.value;
                      setChoices((prev) => ({ ...prev, [c.id]: { ...prev[c.id], shelves: prev[c.id]?.shelves ?? shelves, he } }));
                    }}
                    placeholder="אם ריק — השם באנגלית, ואפשר לתקן אחר כך בלשונית שמות"
                    className="mt-1 w-full h-9 px-2.5 rounded-lg bg-ink-950 border border-ink-800 text-sm focus:border-flame outline-none"
                  />
                </label>
                <div className="flex gap-2">
                  <Btn
                    size="sm"
                    variant={chosen?.decision === "approved" ? "primary" : "ghost"}
                    icon="check"
                    className="flex-1"
                    onClick={() => set(c.id, "approved", shelves)}
                  >
                    {chosen?.decision === "approved"
                      ? `אושר · ${shelves.map((sh) => SHELF_LABEL[sh]).join(" + ")}`
                      : "אשר"}
                  </Btn>
                  <Btn
                    size="sm"
                    variant={chosen?.decision === "rejected" ? "danger" : "ghost"}
                    icon="x"
                    onClick={() => set(c.id, "rejected", shelves)}
                  >
                    דחה
                  </Btn>
                  <a
                    href={`https://makerworld.com/en/models/${c.id}-${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="לדף המקורי"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-ink-800 text-ink-400 hover:border-ink-600"
                  >
                    <Icon name="search" size={14} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!list.length && (
        <p className="text-sm text-ink-400 text-center py-6">הכרעת בכולם. שמור למעלה כדי שזה ייכנס לאתר.</p>
      )}
    </div>
  );
}
