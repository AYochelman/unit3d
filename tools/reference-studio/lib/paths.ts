import { mkdirSync } from "node:fs";
import path from "node:path";

// The studio always runs with its own folder as the working directory (see
// scripts/studio.mjs), so `data` sits next to app/ and lib/ and survives
// restarts. STUDIO_DATA_DIR moves the whole library somewhere else - useful if
// you keep references on another drive.
export const DATA_DIR = process.env.STUDIO_DATA_DIR
  ? path.resolve(process.env.STUDIO_DATA_DIR)
  : path.resolve(process.cwd(), "data");

export const FILES_DIR = path.join(DATA_DIR, "files");
export const DB_FILE = path.join(DATA_DIR, "library.json");
export const EXPORT_DIR = path.join(DATA_DIR, "exports");

export function ensureDirs(): void {
  for (const dir of [DATA_DIR, FILES_DIR, EXPORT_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Resolves a stored file name to an absolute path, refusing anything that
 * escapes FILES_DIR. Every path that reaches the filesystem from a request goes
 * through here.
 */
export function resolveStoredFile(name: string): string | null {
  if (!name || name.includes("\0")) return null;
  const full = path.resolve(FILES_DIR, name);
  const root = path.resolve(FILES_DIR) + path.sep;
  if (!full.startsWith(root)) return null;
  return full;
}
