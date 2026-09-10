/**
 * Take back the models that were published without anyone saying yes.
 *
 *   node scripts/unpublish-unapproved.mjs --dry
 *   node scripts/unpublish-unapproved.mjs
 *
 * The collection sync used to append straight to the catalogue, so 108 models
 * reached the shop on the strength of having been saved on a phone. That is
 * exactly what the approval queue exists to prevent, and the fix to the sync
 * does nothing about the ones already through.
 *
 * So this moves them back: out of lib/imported.generated.ts, into
 * lib/candidates.generated.ts, where each is approved onto a shelf or rejected
 * like anything else. Nothing is lost — every number the shop had is carried
 * over, so approving one puts it back exactly as it was.
 *
 * Anything the owner has already answered is left alone: a decision, once
 * made, is not asked again.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE = path.join(ROOT, "lib", "imported.generated.ts");
const CANDIDATES = path.join(ROOT, "lib", "candidates.generated.ts");
const DECISIONS = path.join(ROOT, "public", "model-decisions.json");
const IDS = path.join(ROOT, "data", "auto-published-ids.json");

const DRY = process.argv.includes("--dry");

const rowsOf = (src) => {
  const m = /export const IMPORTED_GENERATED: ImportedModel\[\] = (\[[\s\S]*?\n\]);/.exec(src);
  if (!m) throw new Error("could not find IMPORTED_GENERATED in the catalogue");
  return { rows: JSON.parse(m[1]), block: m[1], full: m[0] };
};

const candidatesOf = (src) => {
  const m = /export const CANDIDATES: Candidate\[\] = (\[[\s\S]*\]);/.exec(src);
  return m ? JSON.parse(m[1]) : [];
};

/** A catalogue row already holds everything the queue needs to show. */
const toCandidate = (r) => ({
  id: r.id.replace(/^mw-/, ""),
  title: r.name,
  slug: (r.sourceUrl || "").split("/").pop()?.split("-").slice(1).join("-") || "",
  license: r.license || "",
  creator: r.creator || "",
  image: r.image || "",
  downloads: r.downloads || 0,
  likes: 0,
  grams: r.grams,
  hours: r.hours,
  colors: r.colors ?? 1,
  suggested: r.shelf,
  // The holds it already carried are the reasons to look twice before
  // approving: a brand, a weapon, a licence that forbids selling.
  warnings: r.holds ?? [],
  via: "auto-published",
  tags: "",
});

const ids = new Set(JSON.parse(fs.readFileSync(IDS, "utf8")).map(String));
const decided = new Set(
  (() => {
    try { return (JSON.parse(fs.readFileSync(DECISIONS, "utf8")).decisions ?? []).map((d) => String(d.id)); }
    catch { return []; }
  })(),
);

const src = fs.readFileSync(CATALOGUE, "utf8");
const { rows, full } = rowsOf(src);

const pull = rows.filter((r) => ids.has(r.id.replace(/^mw-/, "")) && !decided.has(r.id.replace(/^mw-/, "")));
const keep = rows.filter((r) => !pull.includes(r));

console.log(`  ${rows.length} in the shop`);
console.log(`  ${pull.length} were published without approval → moving to the queue`);
console.log(`  ${keep.length} stay`);
if (!pull.length) { console.log("\n  nothing to do.\n"); process.exit(0); }
if (DRY) { console.log("\n  --dry: nothing written.\n"); process.exit(0); }

// ─── Out of the shop ─────────────────────────────────────────────────────────
const nextCatalogue = src
  .replace(full, `export const IMPORTED_GENERATED: ImportedModel[] = ${JSON.stringify(keep, null, 2)};`)
  .replace(/\/\/ Items: \d+/, `// Items: ${keep.length}`);
fs.writeFileSync(CATALOGUE, nextCatalogue, "utf8");

// ─── Into the queue, newest first ────────────────────────────────────────────
const existing = candidatesOf(fs.readFileSync(CANDIDATES, "utf8"));
const fresh = pull.map(toCandidate);
const have = new Set(fresh.map((c) => c.id));
const merged = [...fresh, ...existing.filter((c) => !have.has(String(c.id)))];

fs.writeFileSync(
  CANDIDATES,
  `// Auto-generated — DO NOT EDIT BY HAND.\n` +
    `//\n// Models waiting for approval in /admin → "מודלים לאישור". Nothing here is\n` +
    `// on the shop; the owner decides, one by one, in that tab.\n` +
    `// Items: ${merged.length}\n// Collected: ${new Date().toISOString()}\n\n` +
    `import type { Candidate } from "./candidates";\n\n` +
    `export const CANDIDATES: Candidate[] = ${JSON.stringify(merged, null, 2)};\n`,
  "utf8",
);

console.log(`\n  done. ${merged.length} waiting in /admin → "מודלים לאישור"\n`);
