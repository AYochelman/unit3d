// Fetch the printer's timelapses now, without waiting for the agent's slow loop.
//
//   double-click timelapse.bat
//
// It lists what is on the printer's card, downloads everything the site does
// not already have, and says what it did. Useful the first time — a card with
// months of prints on it should not trickle in four at a time — and useful for
// answering "are my old timelapses actually safe".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { banner } from "./version.mjs";
import { connectPrinterFtps } from "./ftps.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const { host, accessCode } = cfg.printer;
const SB = String(cfg.supabase.url).replace(/\/$/, "");
const KEY = cfg.supabase.serviceKey;
const legacy = String(KEY).startsWith("ey");
const sbHeaders = { apikey: KEY, ...(legacy ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" };

/** --debug prints every command and every reply, which is what turns a failure
    into evidence instead of a guess. */
const DEBUG = process.argv.includes("--debug");

const note = (m) => console.log(`      \x1b[90m${m}\x1b[0m`);

const ok = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };

banner("fetching the timelapses off the printer's card");

let ftp;
try {
  ftp = await connectPrinterFtps({ host, password: accessCode, debug: DEBUG, onNote: note });
  ok("connected to the printer's card");
} catch (e) {
  bad(`could not connect: ${e.message}`,
      "check the printer is on and awake, and that Developer Mode is on in Settings > LAN Only.");
  console.log("");
  process.exit(1);
}

// Where the videos live has moved between firmware versions, so look rather
// than assume — and when nothing is found, show what IS on the card instead of
// declaring it empty.
const CANDIDATES = cfg.timelapse?.folder
  ? [cfg.timelapse.folder]
  : ["/timelapse", "timelapse", "/video", "/"];

let files = [];
let dir = "";
for (const candidate of CANDIDATES) {
  console.log(`\n  looking in ${candidate}`);
  try {
    const found = (await ftp.list(candidate)).filter((f) => /\.(mp4|avi)$/i.test(f.name) && f.size > 100_000);
    if (found.length) { files = found; dir = candidate === "/" ? "" : candidate; break; }
    if (!dir) dir = candidate;
  } catch { /* try the next place */ }
}

if (files.length === 0) {
  // "Nothing found" has two very different causes, and telling them apart is
  // the whole job here. A folder that answered and was empty is a slicer
  // setting. A folder that never answered is a bug in this program, and saying
  // "no timelapses" about it is worse than saying nothing.
  let anyAnswered = false;
  console.log("\n  No videos matched. Asking the card what it does contain:\n");
  for (const candidate of ["/", "/timelapse", "/video", "/sdcard", "/model"]) {
    try {
      // A transfer that failed can leave the connection out of step, so each
      // probe gets a fresh one rather than inheriting the last one's mess.
      try { ftp.close(); } catch { /* already gone */ }
      ftp = await connectPrinterFtps({ host, password: accessCode, debug: DEBUG, onNote: note });
      const raw = await ftp.listRaw(candidate);
      anyAnswered = true;
      console.log(`  ${candidate}`);
      console.log(raw.trim().split(/\r?\n/).map((l) => `    ${l}`).join("\n") || "    (empty)");
      console.log("");
    } catch (e) {
      console.log(`  ${candidate} - could not read (${e.message})\n`);
    }
  }

  if (!anyAnswered) {
    bad("could not read the card at all",
        "the login worked, so this is not the printer refusing - the listing itself failed.");
    console.log(`
  Do NOT take this as "the card is empty" - nothing was read, so nothing is
  known. Send this window as a screenshot.
`);
    ftp.close();
    process.exit(1);
  }

  console.log(`
  The card answered, and has no timelapses on it.

  That is a slicer setting, not a fault: in Bambu Studio, before printing,
  turn on "Timelapse" in the print settings. The printer only records one when
  it is asked to.
`);
  ftp.close();
  process.exit(0);
}

ok(`the card holds ${files.length} timelapse${files.length === 1 ? "" : "s"}`);

// What the site already has, so a second run is quick.
const have = new Set();
try {
  const res = await fetch(`${SB}/rest/v1/printer_timelapses?select=file`, { headers: sbHeaders, cache: "no-store" });
  if (res.ok) for (const row of await res.json()) have.add(row.file);
} catch { /* an empty set just means everything is fetched */ }

const todo = files.filter((f) => !have.has(f.name)).sort((a, b) => a.modifiedAt - b.modifiedAt);
if (todo.length === 0) {
  console.log("\n  All of them are already on the site. Nothing to do.\n");
  ftp.close();
  process.exit(0);
}
console.log(`\n  ${todo.length} to fetch. This can take a while - each one is a few MB.\n`);

let done = 0;
for (const f of todo) {
  process.stdout.write(`  ${f.name} ... `);
  try {
    const body = await ftp.download(`${dir}/${f.name}`);
    if (!body || body.length < 100_000) { console.log("empty, skipped"); continue; }

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
        size_mb: Math.round((body.length / 1048576) * 10) / 10,
        recorded_at: f.modifiedAt.toISOString(),
      }),
    });
    done++;
    console.log(`saved (${Math.round(body.length / 1048576)} MB)`);
  } catch (e) {
    console.log(`failed - ${e.message}`);
  }
}

ftp.close();
console.log(`
  Done. ${done} saved to the site.
  They appear at the bottom of unit-3d.com/livestream
`);
process.exit(0);
