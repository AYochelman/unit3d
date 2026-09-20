#!/usr/bin/env node
/**
 * Take what the Chrome extension collected and hand it to the sync.
 *
 *   npm run ingest:collected
 *   npm run ingest:collected -- --keep   # do not delete the file afterwards
 *
 * The extension (extension/) runs in his own Chrome — the one browser
 * MakerWorld does not challenge — and drops a file in Downloads\unit3d. This
 * folds it into data/pending-models.json, which sync-collections.mjs --offline
 * already reads, and then deletes it so the same models are not offered again
 * tomorrow.
 *
 * Both halves stay honest about where a model came from. The extension groups
 * by collection and keeps likes apart; this preserves that, because the shop
 * treats them differently: saving to a collection IS the decision, a like is
 * only a nomination. A run that flattens the two approves things he merely
 * liked, which is how a shop ends up selling someone else's taste.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, c } from "./lib/makerworld.mjs";

const PENDING = path.join(ROOT, "data", "pending-models.json");
const KEEP = process.argv.includes("--keep");

/**
 * Where Chrome put it.
 *
 * DOWNLOADS_DIR covers a moved Downloads folder, which Windows allows and
 * people do. Otherwise the default, which is where it is for almost everyone.
 */
function source() {
  const set = (process.env.UNIT3D_COLLECTED || "").trim();
  if (set) return set;
  const dir = (process.env.DOWNLOADS_DIR || "").trim() || path.join(os.homedir(), "Downloads");
  return path.join(dir, "unit3d", "makerworld-ids.json");
}

function main() {
  const file = source();
  if (!fs.existsSync(file)) {
    console.log(c.d(`\n  אין קובץ מהתוסף (${file}) — מדלג.\n`));
    return;
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(c.r(`\n  הקובץ מהתוסף לא נקרא: ${e.message}\n`));
    process.exitCode = 1;
    return;
  }

  // `pending` is the grouped form the extension writes. An older file, or one
  // saved by hand from collect-models.html, carries only a flat `ids` list —
  // take it, but with no collection name, so nothing in it is auto-approved.
  const groups = Array.isArray(doc.pending) && doc.pending.length
    ? doc.pending
    : Array.isArray(doc.ids) && doc.ids.length
      ? [{ collection: "", note: "רשימה שטוחה — בלי שיוך לאוסף, ולכן הכל ממתין לאישור", ids: doc.ids }]
      : [];

  if (!groups.length) {
    console.log(c.y("\n  הקובץ מהתוסף ריק — לא שונה כלום.\n"));
    return;
  }

  const out = JSON.parse(fs.readFileSync(PENDING, "utf8"));
  const already = new Set((out.pending ?? []).flatMap((g) => (g.ids ?? []).map(String)));

  let added = 0;
  const next = [...(out.pending ?? [])];
  for (const g of groups) {
    const ids = (g.ids ?? []).map(String).filter((id) => !already.has(id) && already.add(id));
    if (!ids.length) continue;
    added += ids.length;
    // Merge into the group of the same name when there is one, so the file
    // stays one entry per collection however many times this runs.
    const row = next.find((x) => (x.collection || "") === (g.collection || ""));
    if (row) row.ids = [...(row.ids ?? []), ...ids];
    else next.push({ collection: g.collection || "", ...(g.note ? { note: g.note } : {}), ids });
  }

  out.pending = next;
  fs.writeFileSync(PENDING, JSON.stringify(out, null, 2) + "\n", "utf8");

  const when = doc.readAt ? new Date(doc.readAt).toLocaleString("he-IL") : "—";
  console.log(c.b(`\n  נקרא מהתוסף (${when}): ${(doc.ids ?? []).length} מודלים · ${added} חדשים לתור`));
  if (doc.likes?.length) console.log(c.d(`  ${doc.likes.length} לייקים — נשארים לייקים, לא נכנסים כהחלטה`));

  if (KEEP) {
    console.log(c.d(`  --keep: הקובץ נשאר ב-${file}\n`));
  } else {
    fs.rmSync(file, { force: true });
    console.log(c.d("  הקובץ נמחק — הריצה הבאה תחכה לאיסוף חדש.\n"));
  }
}

main();
