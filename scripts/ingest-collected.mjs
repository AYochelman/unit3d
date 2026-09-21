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
/** The last sweep this machine already folded in — so a re-run is a no-op. */
const STATE = path.join(ROOT, "data", "collected-state.json");

/**
 * Where Chrome put it, back when it put it anywhere.
 *
 * The extension no longer downloads: Chrome's "Ask where to save each file"
 * overrode its request for a silent write, so every unattended sweep opened a
 * dialog and died. It writes to the database now. This path stays as the
 * fallback, because a file saved by hand from collect-models.html still lands
 * here and should still work.
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

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/**
 * The latest sweep, from the shop's own database.
 *
 * One row, id 1, replaced by every sweep — so this is always "the collections
 * as they were last read", never a backlog to work through. The publishable
 * key is the one the site already ships; reading this table needs nothing
 * more.
 *
 * Returns null for every reason it might not answer — no table yet, no
 * network, nothing collected — and says which, because "no models" and "the
 * database refused me" are different problems and looked identical before.
 */
async function fromDatabase() {
  const shop = readJson(path.join(ROOT, "public", "shop.json"));
  const url = String(shop?.supabaseUrl || "").replace(/\/$/, "");
  const key = shop?.supabaseAnonKey;
  if (!url || !key) return null;
  let res;
  try {
    res = await fetch(`${url}/rest/v1/collected_models?select=read_at,doc&id=eq.1`, {
      headers: { apikey: key, accept: "application/json" },
      cache: "no-store",
    });
  } catch (e) {
    console.log(c.y(`  המסד לא נענה (${e.message}) — בודק אם יש קובץ מקומי.`));
    return null;
  }
  if (res.status === 404 || res.status === 406) {
    console.log(c.y("  הטבלה collected_models לא קיימת — צריך להריץ את ה-SQL פעם אחת."));
    return null;
  }
  if (!res.ok) {
    console.log(c.y(`  המסד סירב (${res.status}) — בודק אם יש קובץ מקומי.`));
    return null;
  }
  const rows = await res.json();
  if (!rows.length) return null;
  const { read_at: readAt, doc } = rows[0];
  const last = readJson(STATE)?.lastReadAt;
  if (last && last === readAt) {
    console.log(c.d(`\n  הסריקה האחרונה (${new Date(readAt).toLocaleString("he-IL")}) כבר נקלטה — אין חדש.\n`));
    return "done";
  }
  return { doc, readAt, from: "database" };
}

async function main() {
  // The database first, a downloaded file second. Both carry the same shape,
  // so everything below this point is the same work either way.
  const live = await fromDatabase();
  if (live === "done") return;

  const file = source();
  let doc, from, readAt;
  if (live) {
    ({ doc, readAt } = live);
    from = "המסד";
  } else if (fs.existsSync(file)) {
    try {
      doc = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      console.error(c.r(`\n  הקובץ מהתוסף לא נקרא: ${e.message}\n`));
      process.exitCode = 1;
      return;
    }
    from = "קובץ";
    readAt = doc.readAt;
  } else {
    console.log(c.d(`\n  אין סריקה במסד ואין קובץ מקומי (${file}) — מדלג.\n`));
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

  const when = readAt ? new Date(readAt).toLocaleString("he-IL") : "—";
  console.log(c.b(`\n  נקרא מ${from} (${when}): ${(doc.ids ?? []).length} מודלים · ${added} חדשים לתור`));
  if (doc.likes?.length) console.log(c.d(`  ${doc.likes.length} לייקים — נשארים לייקים, לא נכנסים כהחלטה`));

  if (KEEP) {
    console.log(c.d("  --keep: המקור נשאר כפי שהוא.\n"));
    return;
  }
  if (live) {
    // The row stays — it is the latest sweep, not a queue — and this machine
    // records that it has taken it. A second run says "nothing new" instead of
    // re-reading the same models and reporting 0 as if something had changed.
    fs.writeFileSync(STATE, JSON.stringify({ lastReadAt: readAt }, null, 2) + "\n", "utf8");
    console.log(c.d("  נרשם שהסריקה הזו נקלטה — הריצה הבאה תחכה לחדשה.\n"));
  } else {
    fs.rmSync(file, { force: true });
    console.log(c.d("  הקובץ נמחק — הריצה הבאה תחכה לאיסוף חדש.\n"));
  }
}

main();
