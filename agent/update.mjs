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
import crypto from "node:crypto";
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
  headers: { Accept: "application/vnd.github+json", "User-Agent": "unit3d-agent", "Cache-Control": "no-cache" },
}).catch((e) => ({ ok: false, statusText: e.message }));

if (!res.ok) {
  console.log(`  could not reach GitHub (${res.status ?? ""} ${res.statusText ?? ""})`);
  console.log("  check the internet connection and try again.\n");
  process.exit(1);
}

const files = (await res.json()).filter((f) => f.type === "file" && !KEEP.has(f.name));
let written = 0;
let failed = 0;

/**
 * Fetch by content hash, not by name.
 *
 * raw.githubusercontent.com sits behind a cache, and it does not expire every
 * file at the same moment. That produced the worst possible outcome: an update
 * that reported success while handing over a mix of new and old files — the
 * version number said 2026-09-10.8 while the code beside it was still .6, so a
 * fix appeared to have been tried and failed when it had never run.
 *
 * A blob is addressed by the hash of its own contents, so what comes back
 * cannot be a stale copy of something else. The hash is also checked against
 * what was asked for, because an updater that can lie is worse than none.
 */
/** Git's own object id: sha1 over "blob <bytes>\0" and then the content. */
const gitSha = (buf) =>
  crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

const blob = async (sha) => {
  const r = await fetch(`https://api.github.com/repos/AYochelman/unit3d/git/blobs/${sha}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "unit3d-agent", "Cache-Control": "no-cache" },
  });
  if (!r.ok) throw new Error(`http ${r.status}`);
  const j = await r.json();
  if (j.encoding !== "base64") throw new Error(`unexpected encoding ${j.encoding}`);
  const body = Buffer.from(j.content, "base64");
  // An updater that can hand over the wrong file is worse than none: that is
  // exactly how a fix came to look like it had been tried and failed.
  const got = gitSha(body);
  if (got !== sha) throw new Error(`content did not match (${got.slice(0, 7)} ≠ ${sha.slice(0, 7)})`);
  return body;
};

for (const f of files) {
  try {
    const body = await blob(f.sha);
    const target = path.join(HERE, f.name);
    // Skip a file that is already identical, so the list shows real changes.
    if (fs.existsSync(target) && fs.readFileSync(target).equals(body)) continue;
    fs.writeFileSync(target, body);
    console.log(`  updated  ${f.name.padEnd(24)} ${f.sha.slice(0, 7)}`);
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
