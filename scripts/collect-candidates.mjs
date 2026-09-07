#!/usr/bin/env node
/**
 * Find what is hot on MakerWorld right now, and queue it for approval.
 *
 *   npm run collect:candidates
 *
 * Nothing this finds reaches the shop. It writes lib/candidates.generated.ts,
 * which fills /admin → "מודלים לאישור"; the owner approves each one onto a
 * shelf or rejects it, and only then does scripts/apply-approvals.mjs turn the
 * approved ones into catalogue rows.
 *
 * That order matters. A trending sweep returns a hundred models a week, most of
 * them things this shop would never print, and a pipeline that imports them
 * automatically is a pipeline that fills the shop with someone else's taste.
 *
 * Weapons and non-commercial licences are dropped here rather than shown: they
 * could never be sold anyway, so putting them in front of the owner is just
 * work. Everything else arrives with its licence, its numbers and a warning
 * where one is deserved.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c, sleep, getJson, fetchDetails, classify, platesFrom, readableTitle } from "./lib/makerworld.mjs";

const OUT = path.join(ROOT, "lib", "candidates.generated.ts");
const CATALOGUE = path.join(ROOT, "lib", "imported.generated.ts");
const DECISIONS = path.join(ROOT, "public", "model-decisions.json");

const SEARCH = (sort, offset) =>
  `https://makerworld.com/api/v1/search-service/select/design2?orderBy=${sort}&designType=0&keyword=&limit=20&offset=${offset}`;

// Four different senses of "popular": what is climbing now, what everyone has
// printed, what people liked, and what they saved to print later.
const SORTS = ["trending", "downloadCount", "likeCount", "collectionCount"];
const PAGES = [0, 20, 40];
const LIMIT = Number(process.env.CANDIDATE_LIMIT || 140);

const WEAPON =
  /(knife|knives|katana|sword|blade|shuriken|kunai|karambit|balisong|dagger|machete|blowgun|airsoft|pistol|shotgun|rifle|\bgun\b|ammo|bullet|nunchaku|taser|crossbow|spear)/i;
const BRAND =
  /(kaws|bearbrick|smiski|hello kitty|spider[- ]?man|marvel|batman|superman|disney|pokemon|pikachu|mario|zelda|nintendo|star wars|mandalorian|jujutsu|demon slayer|one piece|naruto|dragon ball|warhammer|lego|ferrari|nike|adidas|panda by bambu)/i;

const log = (...a) => console.log(...a);

/** Ids the shop already has, plus everything already ruled on. */
function alreadyHandled() {
  const seen = new Set(
    [...fs.readFileSync(CATALOGUE, "utf8").matchAll(/"id": "mw-(\d+)"/g)].map((m) => m[1]),
  );
  if (fs.existsSync(DECISIONS)) {
    try {
      for (const d of JSON.parse(fs.readFileSync(DECISIONS, "utf8")).decisions ?? []) seen.add(String(d.id));
    } catch { /* a malformed file must not stop the sweep */ }
  }
  // Everything already said no to, so the queue never re-offers it.
  const rejected = path.join(ROOT, "data", "rejected-models.json");
  if (fs.existsSync(rejected)) {
    try {
      for (const id of JSON.parse(fs.readFileSync(rejected, "utf8")).rejected ?? []) seen.add(String(id));
    } catch { /* same */ }
  }
  return seen;
}

async function main() {
  const handled = alreadyHandled();
  log(c.b(`\n  סורק מה חם עכשיו במייקרוורלד\n`));

  const found = new Map();
  for (const sort of SORTS) {
    for (const offset of PAGES) {
      const res = await getJson(SEARCH(sort, offset));
      const hits = res.ok ? res.body.hits ?? [] : [];
      for (const h of hits) {
        const id = String(h.id);
        if (!found.has(id)) found.set(id, sort);
      }
      await sleep(200);
    }
    log(`  ${sort}: ${found.size} עד כה`);
  }

  const fresh = [...found.entries()].filter(([id]) => !handled.has(id)).slice(0, LIMIT);
  log(c.b(`\n  ${found.size} נמצאו · ${fresh.length} חדשים\n`));

  const rows = [];
  let dropped = 0;
  for (const [id, via] of fresh) {
    const d = await fetchDetails(id);
    await sleep(150);
    if (!d) continue;

    const title = readableTitle((d.title || "").trim(), d.slug);
    const text = `${title} ${d.tags.join(" ")}`;
    // Not shown at all: they could not be sold whatever the answer was.
    if (WEAPON.test(text) || /(^|-)NC(-|$)/i.test(d.license)) { dropped++; continue; }

    const p = platesFrom(d.instances, d.defaultInstanceId);
    const grams = Math.max(1, p?.base.g ?? d.grams ?? 40);
    const hours = Math.max(0.2, p?.base.h ?? (d.seconds ? d.seconds / 3600 : 2));
    const warnings = [];
    if (BRAND.test(text)) warnings.push("מותג");
    if (/exclusive/i.test(d.license)) warnings.push("רישיון בלעדי");
    if (grams > 250) warnings.push("הדפסה ארוכה");

    rows.push({
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
      via,
      tags: d.tags.join(" · "),
    });
  }

  rows.sort((a, b) => b.downloads - a.downloads);
  const byShelf = rows.reduce((a, r) => ((a[r.suggested] = (a[r.suggested] ?? 0) + 1), a), {});
  log(`  ${c.g(`${rows.length} ממתינים לאישור`)}${dropped ? c.y(`, ${dropped} נופו (נשק / NC)`) : ""}`);
  for (const [k, v] of Object.entries(byShelf)) log(c.d(`    ${k.padEnd(9)} ${v}`));

  fs.writeFileSync(
    OUT,
    `// Auto-generated by scripts/collect-candidates.mjs — DO NOT EDIT BY HAND.\n` +
      `//\n// Models waiting for approval in /admin → "מודלים לאישור". Nothing here is\n` +
      `// on the shop; the owner decides, one by one, in that tab.\n` +
      `// Items: ${rows.length}\n// Collected: ${new Date().toISOString()}\n\n` +
      `import type { Candidate } from "./candidates";\n\n` +
      `export const CANDIDATES: Candidate[] = ${JSON.stringify(rows, null, 2)};\n`,
    "utf8",
  );
  log(c.g(`\n  נכתב lib/candidates.generated.ts\n`));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
