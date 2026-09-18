import { readFileSync, writeFileSync, renameSync, existsSync, statSync } from "node:fs";
import { DB_FILE, ensureDirs } from "./paths";
import type { Database, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  model: "claude-opus-5",
  desktopViewport: { width: 1440, height: 900 },
  mobileViewport: { width: 390, height: 844 },
  captureTimeoutMs: 30000,
  fullPage: true,
  theme: "dark",
  uiLanguage: "en",
  integrations: {
    impeccable: { enabled: false, path: "" },
    higgsfield: { enabled: false, note: "" },
    twentyFirst: { enabled: false, note: "" },
  },
};

function emptyDb(): Database {
  return { version: 1, references: [], collections: [], projects: [], settings: { ...DEFAULT_SETTINGS } };
}

// A single JSON file behind a process-wide promise chain. The studio is
// single-user by design, so the only concurrency that matters is two fetches
// from the same browser landing at once - serialising writes is enough, and it
// keeps the library readable and hand-editable, which a SQLite file would not.
let cache: Database | null = null;
let cacheStamp = 0;
let queue: Promise<unknown> = Promise.resolve();

/** The file's last-modified time, or 0 when it does not exist yet. */
function stamp(): number {
  try { return statSync(DB_FILE).mtimeMs; } catch { return 0; }
}

export function readDb(): Database {
  // Re-read whenever the file has moved on. Next.js can load this module more
  // than once (route handlers and server components are separate bundles), so
  // a purely in-memory cache would let one half of the app keep serving
  // settings the other half has already replaced - the theme would not change
  // until a restart. It also means editing library.json by hand just works.
  const current = stamp();
  if (cache && current === cacheStamp) return cache;
  ensureDirs();
  if (!existsSync(DB_FILE)) {
    cache = emptyDb();
    cacheStamp = 0;
    return cache;
  }
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, "utf8")) as Partial<Database>;
    cache = {
      version: parsed.version ?? 1,
      references: parsed.references ?? [],
      collections: parsed.collections ?? [],
      projects: parsed.projects ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}),
        integrations: { ...DEFAULT_SETTINGS.integrations, ...(parsed.settings?.integrations ?? {}) } },
    };
    cacheStamp = current;
    return cache;
  } catch (err) {
    // A corrupt library is worth stopping for: silently starting empty would
    // look exactly like "it lost all my references".
    throw new Error(
      `data/library.json could not be parsed (${(err as Error).message}). ` +
        "The file was left untouched - fix or move it, then restart.",
    );
  }
}

/** Serialised read-modify-write. The mutator may return a value to pass back. */
export function withDb<T>(mutate: (db: Database) => T): Promise<T> {
  const run = queue.then(() => {
    const db = readDb();
    const result = mutate(db);
    ensureDirs();
    // Write to a sibling and rename: a crash mid-write cannot truncate the
    // library, because the rename is atomic on every platform we run on.
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
    renameSync(tmp, DB_FILE);
    cache = db;
    cacheStamp = stamp();
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Strips anything the browser must never see. */
export function publicSettings(s: Settings) {
  const { anthropicApiKey, ...rest } = s;
  return { ...rest, hasApiKey: Boolean(anthropicApiKey && anthropicApiKey.trim()) };
}
