/**
 * The owner's sign-in to the orders queue, kept on this device.
 *
 * Reading an order means reading a customer's name, phone and mail, so the
 * table opens only to a signed-in user — and until now that meant typing a mail
 * and a password every time the tab was reopened, several times a day, to look
 * at his own work.
 *
 * So this is the second (and last) exception to the project's no-browser-storage
 * rule, and it stores the smallest thing that can do the job: the refresh token
 * Supabase issued, never the password. A refresh token can be revoked from the
 * Supabase dashboard without changing anything else, expires on its own, and is
 * useless to anyone who is not on this machine. The rule exists to keep CUSTOMER
 * state out of the browser; this is the owner's own key on the owner's own
 * device, like the GitHub token beside it.
 *
 * "יציאה" in the admin erases it.
 */
const KEY = "unit3d.sb";

type Saved = { email: string; refresh: string };

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

export function readSession(): Saved | null {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved>;
    return v.refresh ? { email: v.email ?? "", refresh: v.refresh } : null;
  } catch {
    return null;
  }
}

export function writeSession(email: string, refresh: string): void {
  try {
    const s = store();
    if (!s) return;
    if (refresh) s.setItem(KEY, JSON.stringify({ email, refresh } satisfies Saved));
    else s.removeItem(KEY);
  } catch {
    /* the admin still works, it just asks again next time */
  }
}

export function forgetSession(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** True when this browser can remember at all — private windows cannot. */
export const canRemember = (): boolean => store() !== null;
