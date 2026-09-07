"use client";
import Icon from "@/components/ui/Icon";
import { useAdminStore } from "@/lib/admin-store";
import { SHELF_LABEL, SHELVES } from "@/lib/candidates";
import type { ImportedShelf } from "@/lib/imported";
import { cn } from "@/lib/cn";

/**
 * Move this product between columns, from the product's own page.
 *
 * Only the owner sees it, and only while the admin is unlocked. A click takes
 * effect immediately everywhere on the site — the listings read the same store
 * — so he can look at the product, decide it belongs somewhere else, and watch
 * it move without leaving the page. Publishing it to everyone else is the save
 * button in /admin, which is deliberate: a mis-click should not reach the shop.
 */
export default function ShelfMover({ productId, current }: { productId: string; current: ImportedShelf[] }) {
  const unlocked = useAdminStore((s) => s.unlocked);
  const moves = useAdminStore((s) => s.shelves);
  const setShelves = useAdminStore((s) => s.setShelves);
  const clearShelves = useAdminStore((s) => s.clearShelves);
  if (!unlocked) return null;

  const moved = moves[productId];
  const shelves = moved ?? current;

  const toggle = (sh: ImportedShelf) => {
    // The first click from the original placement means "put it HERE", not
    // "and here as well" — the same rule the approval queue uses.
    if (!moved) return setShelves(productId, [sh]);
    const on = shelves.includes(sh);
    const next = on ? shelves.filter((s2) => s2 !== sh) : [...shelves, sh];
    setShelves(productId, next.length ? next : shelves);
  };

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] tracking-wider">
          <Icon name="settings" size={11} />
          ADMIN · באיזו עמודה זה יושב
        </div>
        {moved && (
          <button type="button" onClick={() => clearShelves(productId)} className="text-[11px] text-ink-500 hover:text-ink-300 underline underline-offset-2">
            החזר למקור
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {SHELVES.map((sh) => (
          <button
            key={sh}
            type="button"
            onClick={() => toggle(sh)}
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
      <p className="mt-2 text-[11px] text-ink-500 leading-relaxed">
        משתנה מיד בכל האתר אצלך. כדי שגם הלקוחות יראו — /admin ← גיבוי ← שמור לאתר.
      </p>
    </div>
  );
}
