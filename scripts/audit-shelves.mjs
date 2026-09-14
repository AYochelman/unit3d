#!/usr/bin/env node
/**
 * Every model in the catalogue: is it reachable in the shop, and if not, why.
 *
 *   npm run audit:shelves
 *
 * Written after three attempts to answer this by scraping the rendered grid
 * produced three different answers, and every item they accused turned out to
 * be on the shelf after all. A card is a moving target — it paginates, it
 * truncates, it renders through two different components — so this asks the
 * DATA the same questions the shop asks, and never touches the DOM.
 *
 * It reads exactly what lib/imported.ts reads: the generated rows, the owner's
 * shelf moves, the two removal lists and the blocked holds. If this says a
 * model has no shelf, no amount of browsing will find it.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c } from "./lib/makerworld.mjs";

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const idsIn = (text) => [...text.matchAll(/"(mw-[^"]+)"/g)].map((m) => m[1]);

const gen = read("lib/imported.generated.ts");
const MODELS = JSON.parse(gen.slice(gen.indexOf("= [") + 2, gen.lastIndexOf("]") + 1));

// The owner's own removals, and the ones hard-coded in the module.
const ov = read("lib/shop-overrides.ts");
const removedByOwner = new Set(idsIn(ov.slice(ov.indexOf("REMOVED_BY_OWNER"), ov.indexOf("];", ov.indexOf("REMOVED_BY_OWNER")))));
const imp = read("lib/imported.ts");
const removedInCode = new Set(idsIn(imp.slice(imp.indexOf("REMOVED_IDS"), imp.indexOf("]", imp.indexOf("REMOVED_IDS")))));

// What is never offered for sale. Mirrors BLOCKED_HOLDS in lib/imported.ts —
// "brand" is deliberately NOT here: printing something with a known name on it
// is not illegal on our side, and that decision is documented there.
const BLOCKED = new Set(["weapon", "license-nc"]);

// Filaments we no longer print. A model that needs one cannot be made, so the
// shop does not offer it — mirrors `retired` in lib/materials.ts.
const mat = read("lib/materials.ts");
const RETIRED = new Set(
  [...mat.matchAll(/\{\s*(?:family:[^,]*,\s*)?id:\s*"([^"]+)"[^}]*retired:\s*true/g)].map((m) => m[1]),
);

// The owner's moves decide the shelf when there is one.
const movesSrc = ov.slice(ov.indexOf("SHELF_MOVES"), ov.indexOf("};", ov.indexOf("SHELF_MOVES")));
const MOVES = {};
for (const m of movesSrc.matchAll(/"(mw-[^"]+)":\s*\[([^\]]*)\]/g)) {
  MOVES[m[1]] = m[2].split(",").map((s) => s.replace(/[\s"]/g, "")).filter(Boolean);
}

// Every shelf that has a page a customer can open.
const PAGES = {
  fidget: "/fidgets", flexi: "/fidgets", home: "/home", office: "/office",
  statues: "/statues", pets: "/pets", screen: "/screen", smoke: "/smoke",
  trendy: "/trendy", b2b: "/b2b",
};

const rows = MODELS.map((m) => {
  const moved = MOVES[m.id];
  const shelves = moved?.length ? moved : [m.shelf, ...(m.also ?? [])];
  const reason =
    removedByOwner.has(m.id) ? "הורד על ידך ב-admin"
    : removedInCode.has(m.id) ? "הוסר בקוד"
    : (m.holds ?? []).some((h) => BLOCKED.has(h)) ? `מוחזק (${m.holds.join(",")})`
    : RETIRED.has(m.material) ? `חומר שהוסר (${m.material})`
    : !shelves.some((s) => PAGES[s]) ? `מדף ללא עמוד: ${shelves.join(",") || "—"}`
    : null;
  return { ...m, shelves, reason };
});

const shown = rows.filter((r) => !r.reason);
const hidden = rows.filter((r) => r.reason);
const byReason = hidden.reduce((a, r) => ((a[r.reason.replace(/\(.*/, "").trim()] = (a[r.reason.replace(/\(.*/, "").trim()] ?? 0) + 1), a), {});
const perShelf = {};
for (const r of shown) for (const s of new Set(r.shelves)) if (PAGES[s]) perShelf[s] = (perShelf[s] ?? 0) + 1;

console.log(c.b(`\n  ${MODELS.length} מודלים בקטלוג\n`));
console.log(c.g(`  ${shown.length} מוצגים בחנות`));
console.log(c.y(`  ${hidden.length} לא מוצגים:`));
for (const [k, v] of Object.entries(byReason)) console.log(c.d(`      ${String(v).padStart(3)}  ${k}`));

console.log(c.b(`\n  לפי מדף:`));
for (const [s, n] of Object.entries(perShelf).sort((a, b) => b[1] - a[1])) {
  console.log(c.d(`      ${String(n).padStart(3)}  ${PAGES[s].padEnd(10)} (${s})`));
}

// The only finding that is a BUG rather than a decision.
const orphans = hidden.filter((r) => r.reason.startsWith("מדף ללא עמוד"));
if (orphans.length) {
  console.log(c.y(`\n  ${orphans.length} מודלים שאין להם מדף להופיע בו — זו תקלה, לא החלטה:`));
  for (const r of orphans) console.log(`      ${r.id}  ${r.shelves.join(",") || "(no shelf)"}  ${r.name}`);
} else {
  console.log(c.g(`\n  לכל מודל שאמור להימכר יש מדף שהוא מופיע בו.`));
}
console.log("");
