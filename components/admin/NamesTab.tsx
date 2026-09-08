"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import AdminSaveToSite from "@/components/AdminSaveToSite";
import { useAdminStore } from "@/lib/admin-store";
import { IMPORTED } from "@/lib/imported";
import { HE_NAMES } from "@/lib/he-names";
import { cn } from "@/lib/cn";

const FILE = "lib/he-names.overrides.ts";

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
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "english" | "edited">("all");

  const rows = useMemo(() => {
    const list = IMPORTED.map((m) => {
      const current = names[m.id] ?? HE_NAMES[m.id] ?? m.name;
      return { id: m.id, original: m.name, current, image: m.image, shelf: m.shelf, status: m.status };
    });
    const needle = q.trim();
    return list
      .filter((r) => (only === "english" ? !HEB.test(r.current) : only === "edited" ? r.id in names : true))
      .filter((r) => !needle || r.current.includes(needle) || r.original.toLowerCase().includes(needle.toLowerCase()) || r.id.includes(needle))
      .slice(0, 300);
  }, [names, q, only]);

  const english = useMemo(() => IMPORTED.filter((m) => !HEB.test(names[m.id] ?? HE_NAMES[m.id] ?? m.name)).length, [names]);
  const siteFile = () => fileText(names);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black mb-1">שמות מוצרים</h2>
        <p className="text-xs text-ink-500">
          כל דגם שמגיע מבחוץ נושא את השם המקורי שלו. כאן משנים אותו לעברית — והשינוי נשמר לאתר
          כמו כל שאר הלשוניות. השם המקורי נשאר מוצג בעמוד המוצר לצד קרדיט המעצב.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש שם או מזהה…" className="max-w-xs h-9" />
        <div className="flex gap-1">
          {([["all", `הכל (${IMPORTED.length})`], ["english", `עדיין באנגלית (${english})`], ["edited", `נערכו (${Object.keys(names).length})`]] as const).map(([id, label]) => (
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
            <div key={r.id} className="flex items-center gap-3 p-2.5 hover:bg-ink-900/50">
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
              <span className="shrink-0 text-[10px] font-mono text-ink-600 hidden sm:block">{r.shelf}</span>
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
          );
        })}
        {!rows.length && <div className="p-6 text-center text-sm text-ink-500">אין תוצאות.</div>}
      </div>

      <AdminSaveToSite json={siteFile} path={FILE} title="סיים ועדכן" what="שמות המוצרים" />
    </div>
  );
}
