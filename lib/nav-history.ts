/**
 * Where the visitor came from, inside this tab.
 *
 * `document.referrer` does not change on a client-side navigation, so the
 * header notes every path it sees here. Kept in memory only (no storage, per
 * the project's rules): a reload starts fresh and falls back to the referrer.
 */
let current: string | null = null;
let previous: string | null = null;

export function notePath(path: string) {
  if (path === current) return;
  previous = current;
  current = path;
}

export function previousPath(): string | null {
  if (previous) return previous;
  try {
    const r = document.referrer ? new URL(document.referrer) : null;
    if (r && r.origin === location.origin) {
      const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
      const p = base && r.pathname.startsWith(base) ? r.pathname.slice(base.length) || "/" : r.pathname;
      return p + r.search;
    }
  } catch {}
  return null;
}
