#!/usr/bin/env node
/**
 * Re-read every model's weight and print time from MakerWorld, and correct it.
 *
 *   npm run recheck:figures            # fix the catalogue
 *   npm run recheck:figures -- --dry   # report only, write nothing
 *
 * Weight and time ARE the price here — suggestPrice(grams, hours) is the whole
 * cost model — so a wrong figure is a wrong price on the shelf, every day,
 * quietly. This exists because they were wrong: the importer took the LIGHTEST
 * profile a designer published, and designers publish parts. "Shoe Rack / Wall
 * Shelf" has a 23g "just the pins" profile beside the 433g shelf, so a wall
 * unit was priced at 22 ₪.
 *
 * The rule is now the designer's own default profile (or the one people
 * actually print), and this walks the whole catalogue to apply it to rows that
 * were imported under the old one. Run it after any change to how platesFrom
 * reads a design.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, c, sleep, fetchDetails, platesFrom, fmtSize } from "./lib/makerworld.mjs";

const OUT = path.join(ROOT, "lib", "imported.generated.ts");
const DRY = process.argv.includes("--dry");
const log = (...a) => console.log(...a);

/** How far off a row was, as a share of the corrected figure. */
const drift = (was, now) => (now > 0 ? Math.abs(was - now) / now : 0);

async function main() {
  const src = fs.readFileSync(OUT, "utf8");
  const head = src.slice(0, src.indexOf("= [") + 2);
  const tail = src.slice(src.lastIndexOf("];") + 2);
  const rows = JSON.parse(src.slice(src.indexOf("= [") + 2, src.lastIndexOf("];") + 1));

  log(c.b(`\n  בודק ${rows.length} מודלים מול מייקרוורלד\n`));

  const changed = [];
  let checked = 0;
  let unreachable = 0;

  for (const row of rows) {
    const id = row.id.replace(/^mw-/, "");
    if (!/^\d+$/.test(id)) continue; // hand-written rows are not MakerWorld's
    const d = await fetchDetails(id);
    await sleep(160);
    checked++;
    if (!d) { unreachable++; continue; }

    const p = platesFrom(d.instances, d.defaultInstanceId);
    if (!p) continue;

    const was = { grams: row.grams, hours: row.hours };
    const now = { grams: p.base.g, hours: Math.round(p.base.h * 100) / 100 };
    const moved = drift(was.grams, now.grams) > 0.02 || drift(was.hours, now.hours) > 0.02;

    row.grams = now.grams;
    row.hours = now.hours;
    row.size = fmtSize(now.grams);
    row.colors = Math.max(1, p.base.mc);
    if (p.ams) { row.hoursAms = p.ams.h; row.gramsAms = p.ams.g; }
    else { delete row.hoursAms; delete row.gramsAms; }
    if (p.plates) row.plates = p.plates;
    else delete row.plates;

    if (moved) changed.push({ name: row.name, was, now, factor: now.grams / Math.max(1, was.grams) });
    if (checked % 25 === 0) log(c.d(`   ${checked}/${rows.length}`));
  }

  changed.sort((a, b) => b.factor - a.factor);
  log(c.b(`\n  ${changed.length} מתוך ${checked} תוקנו${unreachable ? c.y(` · ${unreachable} לא נענו`) : ""}\n`));
  for (const ch of changed.slice(0, 25)) {
    const arrow = ch.factor >= 1 ? c.y("↑") : c.d("↓");
    log(`  ${arrow} ${ch.was.grams}g/${ch.was.hours}h → ${ch.now.grams}g/${ch.now.hours}h  ${ch.name.slice(0, 46)}`);
  }
  if (changed.length > 25) log(c.d(`  ועוד ${changed.length - 25}`));

  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) {
    const lines = [`## תיקון משקלים וזמני הדפסה`, "", `${changed.length} מתוך ${checked} מודלים תוקנו.`, ""];
    if (changed.length) {
      lines.push("| דגם | היה | תוקן ל |", "| --- | --- | --- |");
      for (const ch of changed) lines.push(`| ${ch.name} | ${ch.was.grams}g · ${ch.was.hours}h | **${ch.now.grams}g · ${ch.now.hours}h** |`);
    }
    fs.appendFileSync(f, lines.join("\n") + "\n", "utf8");
  }

  if (DRY) { log(c.d("\n  --dry: לא נכתב קובץ.\n")); return; }
  if (!changed.length) { log(c.g("  הכל כבר נכון.\n")); return; }
  fs.writeFileSync(OUT, head + JSON.stringify(rows, null, 2).slice(1) + tail, "utf8");
  log(c.g(`  נכתב lib/imported.generated.ts\n`));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
