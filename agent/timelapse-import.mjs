// Put a folder of old timelapses onto the site.
//
//   double-click timelapse-import.bat
//   node timelapse-import.mjs "G:\\Unit 3D Assets\\Time Laps"
//   node timelapse-import.mjs "G:\\...\\Time Laps" --dry
//
// The agent fetches new videos off the printer's card as each print finishes.
// This is for the ones that were saved to a folder before any of that existed,
// and it only ever needs running once per folder.
//
// WHAT "RELEVANT" MEANS HERE, AND WHY IT IS NOT A JUDGEMENT
//
// A timelapse file is named after the clock — video_2026-09-18_12-28-20.mp4 —
// and carries nothing about whether the print worked. Sitting in a folder,
// months later, there is no fact left that says so. So this does not pretend to
// know:
//
//   · it skips anything already on the site, by file name. The name is a
//     timestamp from one printer, so the same name IS the same video.
//   · it skips files under --min-mb (1 MB by default). A print that failed in
//     its first minutes leaves a very short video, and that is the only signal
//     the folder actually contains.
//   · everything else it LISTS, and --dry stops before uploading so the list
//     can be read first.
//
// Anything that survives those rules and should not be on the site is a call
// only the owner can make. Delete it from the folder and run again.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { banner } from "./version.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const SB = String(cfg.supabase.url).replace(/\/$/, "");
const KEY = cfg.supabase.serviceKey;
const legacy = String(KEY).startsWith("ey");
const sbHeaders = { apikey: KEY, ...(legacy ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" };

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const minMb = Number((args.find((a) => a.startsWith("--min-mb=")) || "").split("=")[1]) || 1;
const folder = args.find((a) => !a.startsWith("--")) || cfg.timelapse?.importFolder || "";

const ok = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };

banner("importing old timelapses from a folder");

if (!folder) {
  bad("no folder given",
      'run it as:  node timelapse-import.mjs "G:\\Unit 3D Assets\\Time Laps"');
  process.exit(1);
}
if (!fs.existsSync(folder)) {
  bad(`there is no folder at ${folder}`,
      "check the drive letter and the spelling — a moved external drive is the usual cause.");
  process.exit(1);
}

/** Every video in the folder and below it, so subfolders per month still work. */
function walk(dir, depth = 0) {
  if (depth > 3) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { out.push(...walk(full, depth + 1)); continue; }
    if (!/\.(mp4|avi)$/i.test(entry.name)) continue;
    const st = fs.statSync(full);
    out.push({ name: entry.name, full, mb: st.size / 1048576, at: st.mtime });
  }
  return out;
}

const found = walk(folder).sort((a, b) => a.at - b.at);
ok(`${found.length} video${found.length === 1 ? "" : "s"} in the folder`);
if (!found.length) {
  console.log("\n  Nothing to import.\n");
  process.exit(0);
}

// What the site already holds. Asked once, and the reason a second run is quick
// rather than a second upload of everything.
const have = new Set();
try {
  const res = await fetch(`${SB}/rest/v1/printer_timelapses?select=file`, { headers: sbHeaders, cache: "no-store" });
  if (res.ok) for (const row of await res.json()) have.add(row.file);
  ok(`the site already has ${have.size}`);
} catch (e) {
  bad(`could not ask the site what it has (${e.message})`,
      "without that answer this would upload everything again — stopping instead.");
  process.exit(1);
}

// A name can repeat inside the folder itself — the same video copied into two
// month folders. First one wins, and the second is a duplicate like any other.
const picked = [];
const skipped = { already: 0, tiny: 0, twice: 0 };
const seenHere = new Set();
for (const f of found) {
  if (have.has(f.name)) { skipped.already++; continue; }
  if (seenHere.has(f.name)) { skipped.twice++; continue; }
  if (f.mb < minMb) { skipped.tiny++; continue; }
  seenHere.add(f.name);
  picked.push(f);
}

console.log(`
  ${picked.length} to upload
  ${skipped.already} already on the site
  ${skipped.twice} the same file name twice in the folder
  ${skipped.tiny} under ${minMb} MB (a print that stopped in its first minutes)
`);

if (!picked.length) {
  console.log("  Nothing left to do.\n");
  process.exit(0);
}

for (const f of picked.slice(0, DRY ? 40 : picked.length)) {
  if (DRY) { console.log(`  · ${f.name}  ${f.mb.toFixed(1)} MB  ${f.at.toLocaleDateString("he-IL")}`); continue; }
  process.stdout.write(`  ${f.name} ... `);
  try {
    const body = fs.readFileSync(f.full);
    const up = await fetch(`${SB}/storage/v1/object/printer/timelapse/${encodeURIComponent(f.name)}`, {
      method: "POST",
      headers: { apikey: KEY, ...(legacy ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "video/mp4", "x-upsert": "true" },
      body,
    });
    if (!up.ok) { console.log(`upload refused (${up.status})`); continue; }
    await fetch(`${SB}/rest/v1/printer_timelapses?on_conflict=file`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        file: f.name,
        url: `${SB}/storage/v1/object/public/printer/timelapse/${encodeURIComponent(f.name)}`,
        size_mb: Math.round(f.mb * 10) / 10,
        // The file's own date, not today's: these are old prints and the site
        // orders them by when they were recorded.
        recorded_at: f.at.toISOString(),
      }),
    });
    console.log(`saved (${f.mb.toFixed(1)} MB)`);
  } catch (e) {
    console.log(`failed - ${e.message}`);
  }
}

if (DRY) {
  console.log(`
  Dry run — nothing was uploaded.${picked.length > 40 ? `\n  (showing the first 40 of ${picked.length})` : ""}

  To upload them, run the same command without --dry.
`);
} else {
  console.log(`
  Done. They appear at the bottom of unit-3d.com/livestream
`);
}
process.exit(0);
