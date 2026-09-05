"use client";
import { useState } from "react";
import Link from "next/link";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { useAdminStore } from "@/lib/admin-store";

/**
 * The little "admin" affordance in the corner of a product page.
 *
 * The admin session lives in memory only (the project forbids storing it), so
 * a hard refresh on a product page logs you out. Rather than send you back to
 * /admin every time, this unlocks in place: click "admin", type the PIN, and
 * the cost panel appears on the page you were already looking at.
 */
export default function AdminUnlock() {
  const unlocked = useAdminStore((s) => s.unlocked);
  const unlock = useAdminStore((s) => s.unlock);
  const lock = useAdminStore((s) => s.lock);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={() => lock()}
        title="נעל את מצב המנהל"
        className="shrink-0"
      >
        <Pill tone="neutral" className="text-[10px] font-mono">ADMIN</Pill>
      </button>
    );
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] font-mono text-ink-600 hover:text-ink-300 transition-colors"
        >
          admin
        </button>
        <Link href="/admin" className="text-ink-700 hover:text-ink-400 transition-colors" title="עמוד הניהול">
          <Icon name="settings" size={12} />
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (unlock(pin)) {
          setOpen(false);
          setPin("");
          setBad(false);
        } else {
          setBad(true);
        }
      }}
      className="flex items-center gap-1.5 shrink-0"
    >
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setBad(false);
        }}
        placeholder="קוד"
        aria-label="קוד מנהל"
        aria-invalid={bad}
        className={`h-8 w-20 px-2 rounded-lg bg-ink-950 border text-xs font-mono text-ink-100 focus:outline-none ${
          bad ? "border-bad" : "border-ink-700 focus:border-amber-500/60"
        }`}
        dir="ltr"
      />
      <button
        type="submit"
        aria-label="פתח"
        className="h-8 w-8 rounded-lg bg-ink-800 text-amber-400 inline-flex items-center justify-center hover:bg-ink-700 transition-colors"
      >
        <Icon name="check" size={13} strokeWidth={3} />
      </button>
      <button
        type="button"
        aria-label="בטל"
        onClick={() => {
          setOpen(false);
          setPin("");
          setBad(false);
        }}
        className="text-ink-600 hover:text-ink-300 transition-colors"
      >
        <Icon name="x" size={13} />
      </button>
    </form>
  );
}
