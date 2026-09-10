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
import { connectPrinterFtps } from "./ftps.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const { host, accessCode } = cfg.printer;
const SB = String(cfg.supabase.url).replace(/\/$/, "");
const KEY = cfg.supabase.serviceKey;
const legacy = String(KEY).startsWith("ey");
const sbHeaders = { apikey: KEY, ...(legacy ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" };

const ok = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };

console.log("\n  Fetching the timelapses off the printer's card.\n");

let ftp;
try {
  ftp = await connectPrinterFtps({ host, password: accessCode });
  ok("connected to the printer's card");
} catch (e) {
  bad(`could not connect: ${e.message}`,
      "check the printer is on and awake, and that Developer Mode is on in Settings > LAN Only.");
  console.log("");
  process.exit(1);
}

const dir = cfg.timelapse?.folder || "/timelapse";
let files;
try {
  files = (await ftp.list(dir)).filter((f) => /\.(mp4|avi)$/i.test(f.name) && f.size > 100_000);
} catch (e) {
  bad(`could not read ${dir}: ${e.message}`);
  ftp.close();
  process.exit(1);
}

if (files.length === 0) {
  console.log(`
  The card has no timelapses on it.

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
