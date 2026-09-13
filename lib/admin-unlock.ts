/**
 * That the owner already opened the admin on this device.
 *
 * The gate was in memory only, so every refresh — and every hard navigation,
 * and every new tab — asked for the password again. He is in there all day.
 *
 * This is the third and last exception to the project's no-browser-storage
 * rule, and it is the cheapest of the three: it stores a TIMESTAMP, never the
 * password. That gives away nothing, because the password already ships inside
 * the published bundle (see the note in admin-store.ts) — the gate keeps the
 * admin out of a stranger's way, it is not a lock. What it does mean is that
 * anyone sitting at this browser walks in, which was already true of the
 * remembered GitHub token and the remembered Supabase session beside it.
 *
 * It expires on its own after a month, and "נעילה" in the admin erases it.
 *
 * Nothing that reads a customer's details rides on this: orders, expenses and
 * reviews each sit behind the Supabase sign-in, which is a real one.
 */
const KEY = "unit3d.unlocked";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** localStorage throws in private windows and with site data blocked. */
function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    s.getItem(KEY);
    return s;
  } catch {
    return null;
  }
}

/** True when this device was unlocked recently enough to skip the password. */
export function readUnlock(): boolean {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return false;
    const at = Number(JSON.parse(raw)?.at);
    if (!Number.isFinite(at)) return false;
    if (Date.now() - at > MAX_AGE_MS) {
      forgetUnlock();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function rememberUnlock(): void {
  try {
    store()?.setItem(KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* the admin still works, it just asks again next time */
  }
}

export function forgetUnlock(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
