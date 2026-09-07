"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Pill from "@/components/ui/Pill";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { CANDIDATES } from "@/lib/candidates.generated";
import { SHELF_LABEL, SHELVES, type Decision, type DecisionsFile } from "@/lib/candidates";
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
/** `shelves[0]` is the product's home; the rest list it in more places too. */
type Choice = { decision: Decision; shelves: ImportedShelf[] };

export default function ApprovalsTab() {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [onlyOpen, setOnlyOpen] = useState(true);

  const decided = Object.keys(choices).length;
  const list = useMemo(
    () => (onlyOpen ? CANDIDATES.filter((c) => !choices[c.id]) : CANDIDATES),
    [choices, onlyOpen],
  );

  const set = (id: string, decision: Decision, shelves: ImportedShelf[]) =>
    setChoices((c) => ({ ...c, [id]: { decision, shelves } }));

  /** Clicking a shelf adds it; clicking it again takes it off, unless it is the last one. */
  const toggle = (id: string, shelf: ImportedShelf, current: ImportedShelf[]) =>
    setChoices((prev) => {
      const on = current.includes(shelf);
      const shelves = on ? current.filter((s2) => s2 !== shelf) : [...current, shelf];
      return { ...prev, [id]: { decision: prev[id]?.decision ?? "approved", shelves: shelves.length ? shelves : current } };
    });

  const json = () => {
    const file: DecisionsFile = {
      version: 1,
      decisions: Object.entries(choices).map(([id, c]) => ({
        id,
        decision: c.decision,
        ...(c.decision === "approved"
          ? { shelf: c.shelves[0], ...(c.shelves.length > 1 ? { also: c.shelves.slice(1) } : {}) }
          : {}),
        at: new Date().toISOString(),
      })),
    };
    return JSON.stringify(file, null, 2);
  };

  if (!CANDIDATES.length) {
    return (
      <div className="max-w-3xl p-6 rounded-2xl border border-ink-800 bg-ink-900 text-center">
        <h2 className="font-black text-lg mb-1">אין מודלים שממתינים</h2>
        <p className="text-sm text-ink-400">
          הסריקות מוסיפות לכאן. כשיימצא משהו חדש — הוא יופיע כאן לפני שהוא נכנס לחנות.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-lg">
            {CANDIDATES.length} מודלים ממתינים
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

      {decided > 0 && (
        <AdminSaveToSite
          json={json}
          path="public/model-decisions.json"
          title={`שמירת ${decided} החלטות`}
          what="מה שאישרת נכנס לחנות"
        />
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
                  <Image src={photoSrc(c.image)} alt="" aria-hidden fill sizes="96px" className="object-contain p-1" unoptimized />
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
                      onClick={() => toggle(c.id, sh, shelves)}
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
