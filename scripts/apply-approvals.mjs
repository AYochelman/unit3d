#!/usr/bin/env node
/**
 * Turn the owner's answers into catalogue rows.
 *
 *   npm run apply:approvals
 *
 * /admin → "מודלים לאישור" writes public/model-decisions.json straight to the
 * repository. This reads it: every "approved" becomes a real product on the
 * shelf he chose, every "rejected" is remembered so the next sweep does not
 * offer it again, and both leave the waiting list.
 *
 * It re-reads each model from the API rather than trusting the queued figures,
 * because a candidate may have sat there for a week and the designer may have
 * re-sliced it since.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, c, sleep, fetchDetails, holdsFor, platesFrom, readableTitle,
  fmtSize, ESTIMATE, HUE, ART, HE_DESC,
} from "./lib/makerworld.mjs";

const OUT = path.join(ROOT, "lib", "imported.generated.ts");
const RAW = path.join(ROOT, "data", "makerworld-raw.json");
const DECISIONS = path.join(ROOT, "public", "model-decisions.json");
const SEEN = path.join(ROOT, "data", "rejected-models.json");

const log = (...a) => console.log(...a);

/** Ids that were said no to, so a sweep never offers them twice. */
function loadRejected() {
  if (!fs.existsSync(SEEN)) return { version: 1, rejected: [] };
  try { return JSON.parse(fs.readFileSync(SEEN, "utf8")); } catch { return { version: 1, rejected: [] }; }
}

function buildRow(id, d, shelf) {
  const name = readableTitle((d.title || "").trim(), d.slug);
  if (!name) return null;
  const est = ESTIMATE[shelf] ?? ESTIMATE.trendy;
  const p = platesFrom(d.instances);
  const grams = Math.max(1, p?.base.g ?? d.grams ?? est.grams);
  const hours = Math.max(0.2, p?.base.h ?? (d.seconds ? d.seconds / 3600 : est.hours));
  const holds = holdsFor(`${name} ${d.tags.join(" ")} ${d.cats.join(" ")}`, d.license);

  const row = {
    id: `mw-${id}`,
    name,
    desc: HE_DESC[shelf] ?? HE_DESC.trendy,
    shelf,
    hours: Math.round(hours * 100) / 100,
    grams,
    size: fmtSize(grams),
    colors: Math.max(1, p?.base.mc ?? d.colors ?? est.colors),
    image: d.cover ? `${d.cover}?x-oss-process=image/resize,w_400/format,webp` : undefined,
    creator: d.creator || undefined,
    sourceUrl: `https://makerworld.com/en/models/${id}${d.slug ? `-${d.slug}` : ""}`,
    license: d.license || undefined,
    downloads: d.downloads || undefined,
    hue: HUE[shelf] ?? HUE.trendy,
    art: ART[shelf] ?? ART.trendy,
    status: holds.length ? "hold" : "live",
    holds,
    licenseChecked: !!d.license,
  };
  if (p?.ams) { row.hoursAms = p.ams.h; row.gramsAms = p.ams.g; }
  if (p?.plates) row.plates = p.plates;
  return row;
}

function append(rows) {
  let s = fs.readFileSync(OUT, "utf8");
  const before = [...s.matchAll(/"id": "mw-(\d+)"/g)].length;
  const block = rows.map((r) => "  " + JSON.stringify(r, null, 2).split("\n").join("\n  ")).join(",\n");
  s = s.replace(/\n\];\n\nexport const IMPORTED_AT/, ",\n" + block + "\n];\n\nexport const IMPORTED_AT");
  s = s.replace(/\/\/ Items: \d+/, `// Items: ${before + rows.length}`);
  fs.writeFileSync(OUT, s, "utf8");

  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
  const have = new Set(raw.map((r) => String(r.id)));
  for (const r of rows) {
    const id = r.id.slice(3);
    if (!have.has(id)) raw.push({ id, slug: "", title: r.name, cover: r.image, url: r.sourceUrl });
  }
  fs.writeFileSync(RAW, JSON.stringify(raw, null, 2) + "\n", "utf8");
}

function summary(added, rejected) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (!f) return;
  const lines = ["## החלטות שיושמו", ""];
  if (added.length) {
    lines.push("| דגם | מדף |", "| --- | --- |");
    for (const r of added) lines.push(`| [${r.name}](${r.sourceUrl}) | ${r.shelf} |`);
  } else lines.push("לא אושר אף מודל.");
  if (rejected) lines.push("", `נדחו: ${rejected}`);
  fs.appendFileSync(f, lines.join("\n") + "\n", "utf8");
}

async function main() {
  if (!fs.existsSync(DECISIONS)) { log(c.d("  אין החלטות לטפל בהן.")); return; }
  const doc = JSON.parse(fs.readFileSync(DECISIONS, "utf8"));
  const decisions = doc.decisions ?? [];
  if (!decisions.length) { log(c.d("  קובץ ההחלטות ריק.")); return; }

  const known = new Set([...fs.readFileSync(OUT, "utf8").matchAll(/"id": "mw-(\d+)"/g)].map((m) => m[1]));
  const approved = decisions.filter((d) => d.decision === "approved" && !known.has(String(d.id)));
  const rejected = decisions.filter((d) => d.decision === "rejected");
  log(c.b(`\n  ${approved.length} לאישור · ${rejected.length} נדחו\n`));

  const rows = [];
  for (const d of approved) {
    const details = await fetchDetails(String(d.id));
    await sleep(200);
    if (!details) { log(c.y(`  ${d.id}: ה-API לא ענה, מדולג`)); continue; }
    const row = buildRow(String(d.id), details, d.shelf || "trendy");
    if (row) { rows.push(row); log(c.g(`  ✓ ${row.name} → ${row.shelf}`)); }
  }

  if (rows.length) append(rows);

  // Remember the noes, so the next sweep offers something else.
  const seen = loadRejected();
  const set = new Set(seen.rejected.map(String));
  for (const d of rejected) set.add(String(d.id));
  fs.writeFileSync(SEEN, JSON.stringify({ version: 1, rejected: [...set] }, null, 2) + "\n", "utf8");

  // The queue is answered; clear it so the tab is not full of old decisions.
  fs.writeFileSync(DECISIONS, JSON.stringify({ version: 1, decisions: [] }, null, 2) + "\n", "utf8");

  summary(rows, rejected.length);
  log(c.g(`\n  נוספו ${rows.length} מודלים, נרשמו ${rejected.length} דחיות\n`));
}

main().catch((e) => {
  console.error(c.r(`\n  שגיאה: ${e.message}\n`));
  process.exitCode = 1;
});
