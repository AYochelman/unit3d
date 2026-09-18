#!/usr/bin/env node
/**
 * Does every model on every shelf have everything the source page had?
 *
 *   npm run audit:media            # the summary, per shelf
 *   npm run audit:media -- --list  # every model that is missing something
 *
 * Three separate questions, and the shop used to answer only the first:
 *
 *   1. Is there a cover picture?  A model without one is filtered off the
 *      shelf entirely (lib/listing.ts), so a gap here is invisible: the
 *      product simply is not there.
 *   2. Is there a GALLERY?  The designer publishes five, eight, fifteen shots
 *      of a model; the shop stored the cover and nothing else for a third of
 *      the catalogue, so the product page showed one picture of a thing
 *      photographed from every side. This is the gap that hides, because the
 *      page looks finished.
 *   3. Is there a clip?  Only some models have one, and that is fine — the
 *      point is to know which, not to have one everywhere.
 *
 * This reads only files on disk, so it runs anywhere and costs nothing.
 * Filling the gap it finds needs the network: `npm run backfill:images`.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c } from "./lib/makerworld.mjs";

const CATALOGUE = path.join(ROOT, "lib", "imported.generated.ts");
const VIDEOS = path.join(ROOT, "lib", "localVideos.generated.ts");
const LIST = process.argv.includes("--list");

/** Every model in the generated catalogue, as plain objects. */
export function readModels() {
  const src = fs.readFileSync(CATALOGUE, "utf8");
  // Not the first "[" in the file: the declaration is annotated
  // `ImportedModel[]`, and the type's own brackets come first.
  const decl = src.indexOf("IMPORTED_GENERATED");
  const start = decl === -1 ? -1 : src.indexOf("[", src.indexOf("=", decl));
  const end = src.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    return JSON.parse(src.slice(start, end + 1));
  } catch {
    return [];
  }
}

function videoIds() {
  if (!fs.existsSync(VIDEOS)) return new Set();
  const src = fs.readFileSync(VIDEOS, "utf8");
  return new Set([...src.matchAll(/"(mw-\d+)":/g)].map((m) => m[1]));
}

function main() {
  const models = readModels();
  if (!models.length) {
    console.error(c.r("\n  לא הצלחתי לקרוא את הקטלוג. lib/imported.generated.ts השתנה?\n"));
    process.exitCode = 1;
    return;
  }
  const clips = videoIds();
  const live = models.filter((m) => m.status !== "rejected" && m.status !== "pending");

  const shelves = new Map();
  const gaps = { noCover: [], coverOnly: [] };

  for (const m of live) {
    const shelf = m.shelf || "—";
    const row = shelves.get(shelf) ?? { total: 0, noCover: 0, coverOnly: 0, gallery: 0, shots: 0, clips: 0 };
    row.total++;

    const gallery = Array.isArray(m.images) ? m.images.length : 0;
    if (!m.image && !gallery) { row.noCover++; gaps.noCover.push(m); }
    else if (gallery <= 1) { row.coverOnly++; gaps.coverOnly.push(m); }
    else { row.gallery++; row.shots += gallery; }

    if (clips.has(m.id)) row.clips++;
    shelves.set(shelf, row);
  }

  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);

  console.log(c.b("\n  מדיה לפי מדף\n"));
  console.log("  " + pad("מדף", 12) + num("מודלים", 8) + num("בלי תמונה", 11) + num("שער בלבד", 11) + num("גלריה", 8) + num("סרטון", 8));
  console.log("  " + "-".repeat(58));

  const totals = { total: 0, noCover: 0, coverOnly: 0, gallery: 0, shots: 0, clips: 0 };
  for (const [shelf, r] of [...shelves].sort((a, b) => b[1].total - a[1].total)) {
    for (const k of Object.keys(totals)) totals[k] += r[k];
    const warn = r.noCover || r.coverOnly;
    console.log(
      "  " + pad(shelf, 12) + num(r.total, 8) +
      num(r.noCover || "·", 11) + num(r.coverOnly || "·", 11) +
      num(r.gallery, 8) + num(r.clips || "·", 8) + (warn ? c.y("  ←") : ""),
    );
  }
  console.log("  " + "-".repeat(58));
  console.log("  " + pad("הכל", 12) + num(totals.total, 8) + num(totals.noCover, 11) + num(totals.coverOnly, 11) + num(totals.gallery, 8) + num(totals.clips, 8));

  const avg = totals.gallery ? (totals.shots / totals.gallery).toFixed(1) : "0";
  console.log(c.b(`\n  ${totals.shots} תמונות בגלריות · ${avg} בממוצע למודל שיש לו גלריה\n`));

  if (totals.noCover) {
    console.log(c.r(`  ${totals.noCover} מודלים בלי שום תמונה — הם מסוננים מהמדף ולא מוצגים בכלל.`));
  }
  if (totals.coverOnly) {
    console.log(c.y(`  ${totals.coverOnly} מודלים עם תמונת שער בלבד — עמוד המוצר מראה תמונה אחת`));
    console.log(c.y(`  במקום הגלריה של המעצב. להשלמה:  npm run backfill:images`));
  }
  if (!totals.noCover && !totals.coverOnly) {
    console.log(c.g("  לכל מודל יש גלריה מלאה."));
  }

  if (LIST) {
    const show = (title, rows) => {
      if (!rows.length) return;
      console.log(c.b(`\n  ${title} (${rows.length})\n`));
      for (const m of rows) console.log(`    ${pad(m.id, 14)}${pad(m.shelf || "—", 10)}${(m.name || "").slice(0, 46)}`);
    };
    show("בלי שום תמונה", gaps.noCover);
    show("תמונת שער בלבד", gaps.coverOnly);
  } else if (totals.noCover + totals.coverOnly) {
    console.log(c.b(`\n  לרשימה המלאה:  npm run audit:media -- --list\n`));
  } else {
    console.log("");
  }

  // A shelf with no picture at all is a product nobody can reach; that is a
  // failure. A gallery that is only the cover is a page worth improving, and
  // the run says so without failing a nightly job over it.
  process.exitCode = totals.noCover ? 1 : 0;
}

main();
