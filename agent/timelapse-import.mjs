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
//     the folder actually contains. --all turns that rule off and uploads the
//     short ones too, for when the owner wants the whole folder regardless.
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

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const cfg = readJson(path.join(HERE, "config.json"));

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
// `|| 1` here meant --min-mb=0 quietly became 1, because 0 is falsy: asking
// for everything got the default instead, and the run said so in a line nobody
// re-read. A number is a number; only a missing or unparseable one defaults.
const askedRaw = (args.find((a) => a.startsWith("--min-mb=")) || "").slice("--min-mb=".length);
const asked = askedRaw === "" ? NaN : Number(askedRaw);
const minMb = args.includes("--all") ? 0 : (Number.isFinite(asked) && asked >= 0 ? asked : 1);
const folder = args.find((a) => !a.startsWith("--")) || cfg?.timelapse?.importFolder || "";

const ok = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };

banner("importing old timelapses from a folder");

/**
 * Where the database lives, and the key allowed to write to it.
 *
 * The agent runs on the Pi, so agent/config.json is on the Pi — and this
 * script runs wherever the old folder is, which is the owner's PC. Requiring
 * that file here meant the import could not run on the one machine that
 * actually had the videos.
 *
 * So: config.json when it is there, otherwise the project URL out of
 * public/shop.json (the shop already knows its own database) and the key from
 * SUPABASE_KEY or agent/supabase-key.txt. Nothing is guessed — a missing key
 * stops the run and names the one place to get it.
 */
function settings() {
  if (cfg?.supabase?.url && cfg?.supabase?.serviceKey) {
    return { url: cfg.supabase.url, key: cfg.supabase.serviceKey, from: "agent/config.json" };
  }
  const shop = readJson(path.join(HERE, "..", "public", "shop.json"));
  const keyFile = path.join(HERE, "supabase-key.txt");
  const url = (process.env.SUPABASE_URL || cfg?.supabase?.url || shop?.supabaseUrl || "").trim();
  const key = (process.env.SUPABASE_KEY || "").trim()
    || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : "");
  if (!url || !key) return { url, key, from: "", keyFile };
  return { url, key, from: process.env.SUPABASE_KEY ? "SUPABASE_KEY" : "agent/supabase-key.txt" };
}

const conf = settings();
if (!conf.url || !conf.key) {
  bad("there is no database key on this machine",
      "agent/config.json lives on the Pi, not here. Put the key in a file instead:");
  console.log(`
    1. https://supabase.com/dashboard  →  the project  →  Settings  →  API Keys
    2. copy the service_role key (the secret one, not anon)
    3. save it as a single line in:  ${conf.keyFile}
    4. run this again

  That file is git-ignored and never leaves this machine.
`);
  process.exit(1);
}

const SB = String(conf.url).replace(/\/$/, "");
const KEY = conf.key;
const legacy = String(KEY).startsWith("ey");
const sbHeaders = { apikey: KEY, ...(legacy ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" };
ok(`key from ${conf.from}`);

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
  if (!res.ok) {
    // A refusal here used to be swallowed: the set stayed empty, the run said
    // "the site already has 0", uploaded everything, and every upload was
    // refused by the same key for the same reason. One clear stop instead.
    const why = (await res.text()).slice(0, 200);
    bad(`the site refused the request (${res.status})`,
        res.status === 401 || res.status === 403
          ? "the serviceKey in agent/config.json is wrong or expired — run settings.bat."
          : why);
    process.exit(1);
  }
  for (const row of await res.json()) have.add(row.file);
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
  ${minMb ? `${skipped.tiny} under ${minMb} MB (a print that stopped in its first minutes)` : "--all: the size rule is off, the short ones go up too"}
`);

if (!picked.length) {
  console.log("  Nothing left to do.\n");
  process.exit(0);
}

// Counted, because "it finished" and "it worked" are different sentences and
// this used to print the same closing line either way.
let saved = 0;
const failures = [];

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
    if (!up.ok) {
      // The body, not just the number: 400 alone could be the bucket, the key
      // or the file, and those are three different fixes.
      const why = (await up.text()).slice(0, 160);
      console.log(`upload refused (${up.status})`);
      failures.push(`${f.name} — upload ${up.status}: ${why}`);
      continue;
    }
    // The row is what puts it on the site. An upload with no row is a file
    // nobody will ever see, so a failure here is a failure of the whole item.
    const row = await fetch(`${SB}/rest/v1/printer_timelapses?on_conflict=file`, {
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
    if (!row.ok) {
      const why = (await row.text()).slice(0, 160);
      console.log(`uploaded, but the site did not record it (${row.status})`);
      failures.push(`${f.name} — row ${row.status}: ${why}`);
      continue;
    }
    saved++;
    console.log(`saved (${f.mb.toFixed(1)} MB)`);
  } catch (e) {
    console.log(`failed - ${e.message}`);
    failures.push(`${f.name} — ${e.message}`);
  }
}

if (DRY) {
  console.log(`
  Dry run — nothing was uploaded.${picked.length > 40 ? `\n  (showing the first 40 of ${picked.length})` : ""}

  To upload them, run the same command without --dry.
`);
} else if (saved === picked.length) {
  console.log(`
  ${saved} uploaded. They appear at the bottom of unit-3d.com/livestream
`);
} else {
  // Never "Done" over a pile of failures. This script used to close with the
  // same cheerful line whether it had uploaded everything or nothing, which is
  // how a run that saved zero files was read as a run that worked.
  console.log(`
  ${saved} of ${picked.length} uploaded. ${picked.length - saved} did not.
`);
  for (const why of failures.slice(0, 10)) console.log(`    ${why}`);
  if (failures.length > 10) console.log(`    ... and ${failures.length - 10} more`);
  console.log(`
  Send this window as a screenshot — the reason above says which of the
  bucket, the key or the file is the problem.
`);
}
// A run that saved nothing while having work to do is a failure, and the
// window should not close green on it.
process.exit(!DRY && picked.length && saved === 0 ? 1 : 0);
