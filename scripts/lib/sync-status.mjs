import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./makerworld.mjs";

/**
 * One small file the owner can read instead of asking why the queue is empty.
 *
 * Three scripts feed the approval queue and each knows one piece: the sweep
 * the extension left in the database, the nightly run, and the moment his
 * decisions were applied. Each patches its own section here; the admin tab
 * reads the whole and turns it into sentences. Committed beside the data, so
 * it is true for the site, not for whichever machine last ran a script.
 */
const FILE = path.join(ROOT, "public", "sync-status.json");

export function patchStatus(section, data) {
  let cur = {};
  try { cur = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* first write */ }
  cur[section] = { ...(cur[section] ?? {}), ...data };
  try {
    fs.writeFileSync(FILE, JSON.stringify(cur, null, 2) + "\n", "utf8");
  } catch { /* a status file is never worth failing a run for */ }
}
