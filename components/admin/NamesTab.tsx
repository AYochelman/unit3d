"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { useAdminStore } from "@/lib/admin-store";
import { IMPORTED, type ImportedShelf } from "@/lib/imported";
import { SHELF_LABEL, SHELVES } from "@/lib/candidates";
import { HE_NAMES } from "@/lib/he-names";
import { cn } from "@/lib/cn";

const FILE = "lib/he-names.overrides.ts";
const SHOP_FILE = "lib/shop-overrides.ts";

const HEB = /[֐-׿]/;

/** The generated module, exactly as it should sit in the repository. */
function fileText(names: Record<string, string>): string {
  const rows = Object.entries(names)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, name]) => `  ${JSON.stringify(id)}: ${JSON.stringify(name)},`);
  return `${[
    '// Names the owner edited from /admin \u2192 "\u05e9\u05de\u05d5\u05ea". WRITTEN BY THE SITE, NOT BY HAND.',
    "//",
    "// he-names.ts is the hand-written list, grouped by shelf with comments. Rather",
    "// than let the admin page rewrite that file (and lose its structure), edits made",
    "// from the shop land here and win over it. Deleting an entry here restores the",
    "// hand-written name.",
    "",
    "export const HE_NAME_OVERRIDES: Record<string, string> = {",
    ...rows,
    "};",
  ].join("\n")}\n`;
}

/** lib/shop-overrides.ts, exactly as it should sit in the repository. */
function shopFileText(shelves: Record<string, ImportedShelf[]>, removed: string[]): string {
  const moves = Object.entries(shelves)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, list]) => `  ${JSON.stringify(id)}: ${JSON.stringify(list)},`);
  return `${[
    '// Moves and removals the owner made from /admin \u2192 "\u05e9\u05de\u05d5\u05ea".',
    "// WRITTEN BY THE SITE, NOT BY HAND.",
    "//",
    "// lib/shelves.ts holds the hand-written placements, grouped and commented;",
    "// lib/imported.ts holds the hand-written removals. Letting the admin page",
    "// rewrite either would flatten their structure and their reasoning, so edits",
    "// made from the shop land here instead and win over both.",
    "//",
    "// Deleting an entry here restores whatever the hand-written files say.",
    "",
    'import type { ImportedShelf } from "./imported";',
    "",
    "/** id \u2192 the shelves it sits on. The first is its home. */",
    "export const SHELF_MOVES: Record<string, ImportedShelf[]> = {",
    ...moves,
    "};",
    "",
    "/** Ids taken off the shop entirely. */",
    `export const REMOVED_BY_OWNER: string[] = ${JSON.stringify([...removed].sort(), null, 2)};`,
  ].join("\n")}\n`;
}

/**
 * Rename a product from the shop.
 *
 * The models arrive from MakerWorld with English, Spanish or Chinese titles and
 * are translated by hand in lib/he-names.ts. Anything the import brings in
 * afterwards shows up in its original language until someone edits that file —
 * which means a laptop, a clone and a push for a two-word fix.
 *
 * This is the same fix from a phone: type the name, press save, and the shop
 * writes lib/he-names.overrides.ts through the GitHub API like every other
 * "סיים ועדכן" here. The original title stays visible in the row, because that
 * is what a customer needs to find the model at its source.
 */
export default function NamesTab() {
  const names = useAdminStore((s) => s.names);
  const setName = useAdminStore((s) => s.setName);
  const shelves = useAdminStore((s) => s.shelves);
  const setShelves = useAdminStore((s) => s.setShelves);
  const removed = useAdminStore((s) => s.removed);
  const toggleRemoved = useAdminStore((s) => s.toggleRemoved);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "english" | "edited" | "removed">("all");
  /** Which row has its shelf picker open. One at a time keeps the list scannable. */
  const [openShelf, setOpenShelf] = useState<string | null>(null);

  const rows = useMemo(() => {
    const gone = new Set(removed);
    const list = IMPORTED.map((m) => {
      const current = names[m.id] ?? HE_NAMES[m.id] ?? m.name;
      const on = shelves[m.id] ?? [m.shelf, ...(m.also ?? [])];
      return { id: m.id, original: m.name, current, image: m.image, shelves: on, gone: gone.has(m.id) };
    });
    const needle = q.trim();
    return list
      .filter((r) =>
        only === "english" ? !HEB.test(r.current)
          : only === "edited" ? r.id in names
          : only === "removed" ? r.gone
          : true)
      .filter((r) => !needle || r.current.includes(needle) || r.original.toLowerCase().includes(needle.toLowerCase()) || r.id.includes(needle))
      .slice(0, 300);
  }, [names, q, only, shelves, removed]);

  const english = useMemo(() => IMPORTED.filter((m) => !HEB.test(names[m.id] ?? HE_NAMES[m.id] ?? m.name)).length, [names]);
  const siteFile = () => fileText(names);
  const shopFile = () => shopFileText(shelves, removed);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black mb-1">מוצרים · שם, קטגוריה, הורדה</h2>
        <p className="text-xs text-ink-500">
          שם בעברית, לחיצה על הקטגוריה כדי להעביר, ו-<b>✕</b> כדי להוריד מהחנות. הכל משתנה
          מיד אצלך — ונכנס ללקוחות רק אחרי שמירה למטה. השם המקורי נשאר בעמוד המוצר לצד קרדיט המעצב.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש שם או מזהה…" className="max-w-xs h-9" />
        <div className="flex gap-1">
          {([
            ["all", `הכל (${IMPORTED.length})`],
            ["english", `עדיין באנגלית (${english})`],
            ["edited", `נערכו (${Object.keys(names).length})`],
            ["removed", `הורדו (${removed.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOnly(id)}
              className={cn(
                "px-2.5 h-9 rounded-lg text-xs border",
                only === id ? "border-flame text-flame bg-flame/10" : "border-ink-800 text-ink-400 hover:border-ink-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-800 divide-y divide-ink-800 overflow-hidden">
        {rows.map((r) => {
          const edited = r.id in names;
          return (
            <div key={r.id} className={cn("p-2.5 hover:bg-ink-900/50", r.gone && "opacity-45")}>
              <div className="flex items-center gap-3">
                <span className="relative h-11 w-11 shrink-0 rounded-lg bg-ink-950 border border-ink-800 overflow-hidden">
                  {/* IMPORTED rows arrive with their image already resolved by
                      lib/imported.ts — running it through photoSrc a second time
                      prepends the base path twice. */}
                  {r.image && <Image src={r.image} alt="" fill sizes="44px" className="object-cover" unoptimized />}
                </span>
                <span className="min-w-0 flex-1">
                  <Input
                    value={r.current}
                    onChange={(e) => setName(r.id, e.target.value)}
                    className="h-9"
                    aria-label={`שם ל-${r.original}`}
                  />
                  <span className="block mt-1 text-[11px] text-ink-500 truncate" dir="ltr" title={r.original}>
                    {r.original}
                  </span>
                </span>

                {/* The shelf is the button. Reading it and changing it are the
                    same gesture, which is what makes going through 380 rows
                    bearable. */}
                <button
                  type="button"
                  onClick={() => setOpenShelf((v) => (v === r.id ? null : r.id))}
                  className={cn(
                    "shrink-0 px-2 h-8 rounded-lg text-[11px] font-semibold border transition-colors",
                    openShelf === r.id
                      ? "border-flame text-flame bg-flame/10"
                      : "border-ink-800 text-ink-400 hover:border-ink-600",
                  )}
                  title="העברה לקטגוריה אחרת"
                >
                  {SHELF_LABEL[r.shelves[0]] ?? r.shelves[0]}
                  {r.shelves.length > 1 && <span className="text-ink-600"> +{r.shelves.length - 1}</span>}
                </button>

                <button
                  type="button"
                  onClick={() => toggleRemoved(r.id)}
                  title={r.gone ? "החזרה לחנות" : "הורדה מהחנות"}
                  className={cn("shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center",
                    r.gone ? "border-good/50 text-good hover:bg-good/10" : "border-ink-800 text-ink-500 hover:border-bad hover:text-bad")}
                >
                  <Icon name={r.gone ? "rotate" : "x"} size={14} />
                </button>

                {edited && (
                  <button
                    type="button"
                    onClick={() => setName(r.id, "")}
                    title="חזרה לשם המקורי"
                    className="shrink-0 text-ink-500 hover:text-bad"
                  >
                    <Icon name="rotate" size={14} />
                  </button>
                )}
              </div>

              {openShelf === r.id && (
                <div className="flex flex-wrap gap-1 mt-2 ps-14">
                  {SHELVES.map((sh) => {
                    const home = r.shelves[0] === sh;
                    const on = r.shelves.includes(sh);
                    return (
                      <button
                        key={sh}
                        type="button"
                        onClick={() => {
                          // A click on a shelf that is not its home MOVES it
                          // there; a second click on one it already sits on
                          // takes it off, unless it is the only one left.
                          const next = home
                            ? r.shelves
                            : on
                              ? r.shelves.filter((x) => x !== sh)
                              : [sh, ...r.shelves.filter((x) => x !== sh)];
                          setShelves(r.id, next.length ? next : r.shelves);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                          home ? "border-flame text-flame bg-flame/15"
                            : on ? "border-flame/50 text-flame/80 bg-flame/5"
                            : "border-ink-800 text-ink-400 hover:border-ink-600",
                        )}
                      >
                        {home && "★ "}{SHELF_LABEL[sh]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {!rows.length && <div className="p-6 text-center text-sm text-ink-500">אין תוצאות.</div>}
      </div>

      <div className="space-y-2">
        <AdminSaveToSite json={siteFile} path={FILE} title="שמירת שמות" what="שמות המוצרים" />
        <AdminSaveToSite
          json={shopFile}
          path={SHOP_FILE}
          title={`שמירת קטגוריות והורדות (${Object.keys(shelves).length + removed.length})`}
          what="העברות בין קטגוריות ומוצרים שהורדת"
        />
      </div>
    </div>
  );
}
