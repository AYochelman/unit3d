#!/usr/bin/env node
/**
 * The designer's whole gallery, for models that only ever got the cover.
 *
 *   npm run backfill:images            # only models with no gallery yet
 *   npm run backfill:images -- --all   # re-read every model
 *   npm run backfill:images -- --dry   # say what would change, write nothing
 *
 * `npm run audit:media` counts the gap this closes. A third of the catalogue
 * was imported before anything read the gallery, so those models carry a cover
 * and nothing else: the product page shows one photograph of a thing the
 * designer photographed from five sides, printed in three colours, held in a
 * hand and next to a coin for scale.
 *
 * Runs against the MakerWorld API, which answers a plain request (HANDOFF §17)
 * — but RATE LIMITS. Twelve parallel requests with no pause failed 86% of the
 * time. This is deliberately one at a time with a pause between, because a
 * backfill that runs once has no reason to hurry.
 *
 * Writes lib/imported.generated.ts in place, preserving field order, and then
 * `npm run fetch:images` downloads the new URLs into public/img/catalog so the
 * site serves its own copies.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c, sleep, fetchDetails, picturesOf } from "./lib/makerworld.mjs";

const CATALOGUE = path.join(ROOT, "lib", "imported.generated.ts");
const ALL = process.argv.includes("--all");
const DRY = process.argv.includes("--dry");

/** How many pictures a model carries today. */
const galleryOf = (m) => (Array.isArray(m.images) ? m.images.length : 0);

function read() {
  const src = fs.readFileSync(CATALOGUE, "utf8");
  // Not the first "[": the declaration is annotated `ImportedModel[]`.
  const decl = src.indexOf("IMPORTED_GENERATED");
  const start = decl === -1 ? -1 : src.indexOf("[", src.indexOf("=", decl));
  const end = src.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  return { src, start, end, models: JSON.parse(src.slice(start, end + 1)) };
}

/**
 * Put the file back exactly as it was, with a new array in the middle.
 *
 * Only the array is replaced, so the header comment, the type import and
 * IMPORTED_AT below it survive a run untouched — this file is generated, but
 * it is also read by a person looking for when it was last refreshed.
 */
function write(file, models) {
  // Two-space JSON reproduces the generated file byte for byte: the array
  // opens at column 0 of the declaration and its members are already indented
  // by two. Adding an indent here on top of that re-indents the whole
  // catalogue and turns a five-model backfill into a 13,000-line diff.
  const body = JSON.stringify(models, null, 2);
  fs.writeFileSync(CATALOGUE, file.src.slice(0, file.start) + body + file.src.slice(file.end + 1), "utf8");
}

async function main() {
  const file = read();
  if (!file) {
    console.error(c.r("\n  לא הצלחתי לקרוא את הקטלוג. lib/imported.generated.ts השתנה?\n"));
    process.exitCode = 1;
    return;
  }
  const { models } = file;
  const todo = models.filter((m) => {
    if (m.status === "rejected") return false;
    // An id is what the API is asked for; a model without one is the shop's own.
    if (!/^mw-\d+$/.test(m.id || "")) return false;
    return ALL || galleryOf(m) <= 1;
  });

  console.log(c.b(`\n  ${models.length} מודלים · ${todo.length} לבדיקה${DRY ? c.y("  (יבש — לא נכתב כלום)") : ""}\n`));
  if (!todo.length) {
    console.log(c.g("  לכל מודל כבר יש גלריה. אין מה להשלים.\n"));
    return;
  }

  let filled = 0, added = 0, empty = 0, failed = 0;
  for (const [i, m] of todo.entries()) {
    const id = m.id.replace(/^mw-/, "");
    const d = await fetchDetails(id);
    if (!d) {
      failed++;
      console.log(`  ${c.r("✗")} ${m.id}  ${(m.name || "").slice(0, 40)}  — לא נענה`);
    } else {
      const pics = picturesOf(d) ?? [];
      const before = galleryOf(m);
      if (pics.length > before) {
        // The cover stays the cover. `picturesOf` puts it first, and the card
        // and the gallery both lead on the same picture as a result.
        m.images = pics;
        filled++;
        added += pics.length - before;
        console.log(`  ${c.g("✓")} ${m.id}  ${(m.name || "").slice(0, 40)}  ${before} → ${pics.length}`);
      } else {
        empty++;
        console.log(`  ${c.d("·")} ${m.id}  ${(m.name || "").slice(0, 40)}  — אין יותר ממה שיש`);
      }
    }
    // Slow on purpose. See the header.
    if (i < todo.length - 1) await sleep(300 + Math.random() * 900);
  }

  if (!DRY && filled) write(file, models);

  console.log(c.b(`\n  ${filled} מודלים קיבלו גלריה · ${added} תמונות חדשות · ${empty} בלי תוספת · ${failed} נכשלו\n`));
  if (DRY) {
    console.log(c.y("  ריצה יבשה — הקובץ לא נגע. להרצה אמיתית: בלי --dry\n"));
  } else if (filled) {
    console.log("  הצעד הבא, כדי שהאתר יגיש עותקים משלו:");
    console.log(c.b("    npm run fetch:images\n"));
    console.log("  ואז קומיט של lib/imported.generated.ts ושל public/img/catalog.\n");
  }
  // A few models failing is the API rate limiting, not a broken run: the next
  // run picks them up, because they still have no gallery.
  process.exitCode = failed && !filled ? 1 : 0;
}

main();
