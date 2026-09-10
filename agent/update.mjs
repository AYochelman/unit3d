/**
 * Update the agent in place.
 *
 * Downloading a ZIP, finding the right folder inside it, and copying over the
 * old one while keeping config.json is four chances to get it wrong — and a
 * folder half-replaced is indistinguishable from a fix that did not work.
 *
 * This fetches the current agent files straight from the repository into this
 * folder. It never touches config.json, ffmpeg.exe or node_modules, so
 * settings, the video tool and the installed packages all survive.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = "https://api.github.com/repos/AYochelman/unit3d/contents/agent?ref=main";

// Anything the owner's machine owns rather than the repository.
const KEEP = new Set(["config.json", "ffmpeg.exe", "ffmpeg", "camera-test.jpg", ".cam.jpg"]);

console.log(`\n  Unit 3D · updating the agent\n  currently version ${VERSION}\n`);

const res = await fetch(API, {
  headers: { Accept: "application/vnd.github+json", "User-Agent": "unit3d-agent" },
}).catch((e) => ({ ok: false, statusText: e.message }));

if (!res.ok) {
  console.log(`  could not reach GitHub (${res.status ?? ""} ${res.statusText ?? ""})`);
  console.log("  check the internet connection and try again.\n");
  process.exit(1);
}

const files = (await res.json()).filter((f) => f.type === "file" && !KEEP.has(f.name));
let written = 0;
let failed = 0;

for (const f of files) {
  try {
    const r = await fetch(f.download_url, { headers: { "User-Agent": "unit3d-agent" } });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const body = Buffer.from(await r.arrayBuffer());
    const target = path.join(HERE, f.name);
    // Skip a file that is already identical, so the list shows real changes.
    if (fs.existsSync(target) && fs.readFileSync(target).equals(body)) continue;
    fs.writeFileSync(target, body);
    console.log(`  updated  ${f.name}`);
    written++;
  } catch (e) {
    console.log(`  FAILED   ${f.name} — ${e.message}`);
    failed++;
  }
}

if (!written && !failed) {
  console.log("  already up to date. nothing changed.\n");
  process.exit(0);
}

// The version is read from the file that was just replaced, so it is the new
// one rather than the one this process started with.
const now = /VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(HERE, "version.mjs"), "utf8"))?.[1] ?? "?";
console.log(`
  ${written} file${written === 1 ? "" : "s"} updated${failed ? `, ${failed} failed` : ""}.
  now on version ${now}

  config.json, ffmpeg and the installed packages were left alone.
  Close the agent window if it is open, then run start.bat again.
`);
process.exit(failed ? 1 : 0);
