/**
 * Every model the owner already answered — and above all, rejected.
 *
 * Rejections live in two places: public/model-decisions.json while they wait
 * to be applied, and data/rejected-models.json after apply-approvals has moved
 * them there and emptied the first file. The nightly collection sweep read
 * only the first, so once a rejection was applied it stopped counting, and on
 * 22.10 eleven of the 24 models in the queue were ones already turned down.
 *
 * Every script that writes lib/candidates.generated.ts filters through this,
 * at the moment it writes — so a model still sitting in a collection, or kept
 * from an older queue, cannot come back.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DECISIONS = path.join(ROOT, "public", "model-decisions.json");
const REJECTED = path.join(ROOT, "data", "rejected-models.json");

const bare = (id) => String(id).replace(/^mw-/, "");

const read = (file) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
};

/** Ids (bare MakerWorld numbers) the owner said no to. */
export function rejectedIds() {
  const out = new Set();
  for (const d of read(DECISIONS)?.decisions ?? []) if (d?.decision === "rejected") out.add(bare(d.id));
  for (const id of read(REJECTED)?.rejected ?? []) out.add(bare(id));
  return out;
}

/** Ids he answered either way (approved or rejected). */
export function answeredIds() {
  const out = rejectedIds();
  for (const d of read(DECISIONS)?.decisions ?? []) out.add(bare(d.id));
  return out;
}

/** The queue without anything already rejected. Logs what it drops. */
export function withoutRejected(rows, log = console.log) {
  const no = rejectedIds();
  const kept = rows.filter((r) => !no.has(bare(r.id)));
  if (kept.length < rows.length) log(`  ${rows.length - kept.length} models were already rejected - kept out of the queue`);
  return kept;
}
