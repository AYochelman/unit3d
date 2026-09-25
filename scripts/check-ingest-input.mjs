#!/usr/bin/env node
/**
 * What the ingest validator must refuse.
 *
 *   npm run check:ingest
 *
 * collected_models is writable by anyone holding the publishable key, which
 * is public by design. The document it holds feeds data/pending-models.json,
 * and sync-collections drops those ids straight into a URL — so an id that is
 * not a number is a request pointed somewhere else.
 *
 * The validator lives in scripts/ingest-collected.mjs and is exercised here
 * through the same rules rather than through the network.
 */
const ID_RE = /^[0-9]{3,9}$/;
const MAX_GROUPS = 40, MAX_IDS = 2000, MAX_NAME = 60;

function clean(raw) {
  const rejected = [];
  const groups = [];
  let kept = 0;
  for (const g of raw.slice(0, MAX_GROUPS)) {
    if (!g || typeof g !== "object") { rejected.push("not an object"); continue; }
    const name = String(g.collection ?? "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, MAX_NAME);
    const ids = [];
    for (const v of Array.isArray(g.ids) ? g.ids : []) {
      if (kept >= MAX_IDS) { rejected.push("over the id cap"); break; }
      const id = String(v);
      if (!ID_RE.test(id)) { rejected.push(id); continue; }
      ids.push(id); kept++;
    }
    if (ids.length) groups.push({ collection: name, ids });
    if (kept >= MAX_IDS) break;
  }
  return { groups, rejected };
}

let bad = 0;
const ok = (label, cond) => { if (!cond) { console.log(`  \x1b[31m✗\x1b[0m ${label}`); bad++; } };

const evil = clean([
  { collection: "flexi", ids: ["2335039", "714373"] },
  { collection: "../../etc/passwd", ids: ["../../../secret", "1;rm -rf /", "90174?x=1", "https://evil.test/a", "12", "1234567890123"] },
  { collection: "<script>alert(1)</script>ok", ids: ["90174"] },
  "not-an-object",
]);
const kept = evil.groups.flatMap((g) => g.ids);
ok("a real id survives", kept.includes("2335039") && kept.includes("90174"));
ok("path traversal refused", !kept.some((i) => i.includes("..")));
ok("shell metacharacters refused", !kept.some((i) => /[;&|`$]/.test(i)));
ok("a url refused", !kept.some((i) => i.includes("://")));
ok("a query string refused", !kept.some((i) => i.includes("?")));
ok("too short and too long refused", !kept.includes("12") && !kept.includes("1234567890123"));
ok("a non-object group refused", evil.groups.length === 2);
ok("markup stripped from the collection name", evil.groups.every((g) => !/[<>]/.test(g.collection)));
ok("path characters stripped from the collection name", evil.groups.every((g) => !g.collection.includes("/")));

const flood = clean([{ collection: "x", ids: Array.from({ length: 5000 }, (_, i) => String(100000 + i)) }]);
ok(`the id cap holds (${flood.groups[0].ids.length})`, flood.groups[0].ids.length === MAX_IDS);

const many = clean(Array.from({ length: 100 }, (_, i) => ({ collection: `c${i}`, ids: ["123456"] })));
ok(`the group cap holds (${many.groups.length})`, many.groups.length <= MAX_GROUPS);

console.log(bad ? `\n  \x1b[31m${bad} failed\x1b[0m\n` : "\n  \x1b[32mall 11 correct\x1b[0m\n");
process.exitCode = bad ? 1 : 0;
