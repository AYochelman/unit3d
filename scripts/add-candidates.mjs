#!/usr/bin/env node
/**
 * Queue something the owner pasted, for approval.
 *
 *   npm run add:candidates -- https://makerworld.com/en/models/2335039-military-dog-tag
 *   npm run add:candidates -- 2335039 714373
 *
 * The standing rule: anything he sends to be added goes into /admin →
 * "מודלים לאישור" first, never straight onto a shelf. He decides whether it is
 * sold at all and in which columns, and the decision is one click. Importing
 * on his behalf would be guessing at both.
 *
 * A collection link cannot be read from the JSON API (MakerWorld publishes
 * none), so it is registered in scripts/makerworld-sources.json instead and
 * the nightly browser sync picks it up.
 *
 * Weapons and non-commercial licences are dropped rather than queued: they
 * could not be sold whatever he answered.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c, sleep, fetchDetails, classify, platesFrom, readableTitle } from "./lib/makerworld.mjs";

const OUT = path.join(ROOT, "lib", "candidates.generated.ts");
const CATALOGUE = path.join(ROOT, "lib", "imported.generated.ts");
const DECISIONS = path.join(ROOT, "public", "model-decisions.json");
const SOURCES = path.join(ROOT, "scripts", "makerworld-sources.json");

const WEAPON =
  /(knife|knives|katana|sword|blade|shuriken|kunai|karambit|balisong|dagger|machete|blowgun|airsoft|pistol|shotgun|rifle|\bgun\b|ammo|bullet|nunchaku|taser|crossbow|spear)/i;
const BRAND =
  /(kaws|bearbrick|smiski|hello kitty|spider[- ]?man|marvel|batman|superman|disney|pokemon|pikachu|mario|zelda|nintendo|star wars|mandalorian|jujutsu|demon slayer|one piece|naruto|dragon ball|warhammer|lego|ferrari|nike|adidas|panda by bambu)/i;

const log = (...a) => console.log(...a);

/** The queue as it stands, so a second run adds rather than replaces. */
function readQueue() {
  if (!fs.existsSync(OUT)) return [];
  const src = fs.readFileSync(OUT, "utf8");
  const from = src.indexOf("= [");
  const to = src.lastIndexOf("];");
  if (from < 0 || to < 0) return [];
  try {
    return JSON.parse(src.slice(from + 2, to + 1));
  } catch {
    return [];
  }
}

/** Ids already in the shop or already ruled on — those must not be re-offered. */
function alreadyHandled() {
  const seen = new Set(
    [...fs.readFileSync(CATALOGUE, "utf8").matchAll(/"id": "mw-(\d+)"/g)].map((m) => m[1]),
  );
  for (const file of [DECISIONS, path.join(ROOT, "data", "rejected-models.json")]) {
    if (!fs.existsSync(file)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      for (const d of j.decisions ?? []) seen.add(String(d.id));
      for (const id of j.rejected ?? []) seen.add(String(id));
    } catch { /* a malformed file must not stop an add */ }
  }
  return seen;
}

/** Register a collection so the nightly browser sync reads it. */
function addCollection(url) {
  const j = JSON.parse(fs.readFileSync(SOURCES, "utf8"));
  const id = /\/collections\/(\d+)/.exec(url)?.[1];
  if (j.sources.some((s) => s.url.includes(`/collections/${id}`))) {
    log(c.d(`  אוסף ${id} כבר רשום`));
    return false;
  }
  j.sources.push({ url, shelf: "auto", label: `Collection ${id}` });
  fs.writeFileSync(SOURCES, `${JSON.stringify(j, null, 2)}\n`, "utf8");
  log(c.g(`  אוסף ${id} נרשם — הסריקה הלילית תמשוך אותו`));
  return true;
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  if (!args.length) {
    log(c.y('\n  שימוש: npm run add:candidates -- <קישור או מספר מודל> [עוד...]\n'));
    process.exitCode = 1;
    return;
  }

  const ids = [];
  for (const a of args) {
    if (/\/collections\//.test(a)) { addCollection(a); continue; }
    const id = /\/models\/(\d+)/.exec(a)?.[1] ?? (/^\d+$/.test(a.trim()) ? a.trim() : null);
    if (id) ids.push(id);
    else log(c.y(`  לא זוהה מודל בקישור: ${a}`));
  }
  if (!ids.length) return;

  const queue = readQueue();
  const queued = new Set(queue.map((r) => String(r.id)));
  const handled = alreadyHandled();
  const added = [];

  for (const id of ids) {
    if (queued.has(id)) { log(c.d(`  ${id} כבר בתור`)); continue; }
    if (handled.has(id)) { log(c.d(`  ${id} כבר בחנות או שכבר החלטת עליו`)); continue; }

    const d = await fetchDetails(id);
    await sleep(150);
    if (!d) { log(c.y(`  ${id} לא נמצא במייקרוורלד`)); continue; }

    const title = readableTitle((d.title || "").trim(), d.slug);
    const text = `${title} ${d.tags.join(" ")}`;
    if (WEAPON.test(text) || /(^|-)NC(-|$)/i.test(d.license)) {
      log(c.y(`  ${title} — לא ניתן למכירה (נשק / רישיון NC), לא נוסף`));
      continue;
    }

    const p = platesFrom(d.instances, d.defaultInstanceId);
    const grams = Math.max(1, p?.base.g ?? d.grams ?? 40);
    const hours = Math.max(0.2, p?.base.h ?? (d.seconds ? d.seconds / 3600 : 2));
    const warnings = [];
    if (BRAND.test(text)) warnings.push("מותג");
    if (/exclusive/i.test(d.license)) warnings.push("רישיון בלעדי");
    if (grams > 250) warnings.push("הדפסה ארוכה");

    added.push({
      id,
      title,
      slug: d.slug,
      license: d.license,
      creator: d.creator,
      image: d.cover ? `${d.cover}?x-oss-process=image/resize,w_400/format,webp` : "",
      downloads: d.downloads,
      likes: d.likes,
      grams,
      hours: Math.round(hours * 100) / 100,
      colors: Math.max(1, p?.base.mc ?? d.colors ?? 1),
      suggested: classify(title, d.tags, d.cats),
      warnings,
      via: "נשלח על ידך",
      tags: d.tags.join(" · "),
    });
    log(c.g(`  + ${title}`) + c.d(`  → מוצע: ${added[added.length - 1].suggested}`));
  }

  if (!added.length) { log(c.d("\n  אין מה להוסיף\n")); return; }

  // Newest first: what he just sent should be the first thing he sees.
  const rows = [...added, ...queue];
  fs.writeFileSync(
    OUT,
    `// Auto-generated by scripts/collect-candidates.mjs and scripts/add-candidates.mjs — DO NOT EDIT BY HAND.\n` +
      `//\n// Models waiting for approval in /admin → "מודלים לאישור". Nothing here is\n` +
      `// on the shop; the owner decides, one by one, in that tab.\n` +
      `// Items: ${rows.length}\n// Updated: ${new Date().toISOString()}\n\n` +
      `import type { Candidate } from "./candidates";\n\n` +
      `export const CANDIDATES: Candidate[] = ${JSON.stringify(rows, null, 2)};\n`,
    "utf8",
  );
  log(c.g(`\n  ${added.length} נוספו לתור האישור (סה"כ ${rows.length})\n`));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
