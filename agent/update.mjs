/**
 * Update the agent in place.
 *
 * Downloading a ZIP, finding the right folder inside it, and copying over the
 * old one while keeping config.json is four chances to get it wrong — and a
 * folder half-replaced is indistinguishable from a fix that did not work.
 *
 * This takes the repository's own archive of the current commit, one request,
 * and writes the agent files out of it into this folder. It never touches
 * config.json, ffmpeg.exe or node_modules, so settings, the video tool and the
 * installed packages all survive.
 *
 * WHY AN ARCHIVE AND NOT THE API
 *
 * It used to ask GitHub's API for the file list and then for each file's
 * contents — about thirty requests per update, against a limit of sixty an
 * hour for a machine that is not signed in. Two updates in an hour locked the
 * agent out of updating at all, which is the one moment it must not fail.
 * The archive is a single request, and it is not rationed that way.
 *
 * It is also SAFER than what it replaced. Fetching file by file meant the
 * files could come from different moments — that is how an update once
 * reported success while handing over a mix of new and old code, so a fix
 * looked like it had been tried and failed when it had never run. Everything
 * here comes out of one archive of one commit, so a mix is not possible.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = "AYochelman/unit3d";
const BRANCH = "main";
const ARCHIVE = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/${BRANCH}`;

// Anything the owner's machine owns rather than the repository.
const KEEP = new Set(["config.json", "ffmpeg.exe", "ffmpeg", "camera-test.jpg", ".cam.jpg"]);

console.log(`\n  Unit 3D · updating the agent\n  currently version ${VERSION}\n`);

const res = await fetch(ARCHIVE, {
  headers: { "User-Agent": "unit3d-agent", "Cache-Control": "no-cache" },
  redirect: "follow",
}).catch((e) => ({ ok: false, status: 0, statusText: e.message }));

if (!res.ok) {
  console.log(`  could not download the update (${res.status || ""} ${res.statusText || ""})`.trimEnd());
  console.log("  check the internet connection and try again.\n");
  process.exit(1);
}

/**
 * Read a tar archive.
 *
 * Half a page of code, and it means the updater needs nothing installed: a
 * machine whose npm packages are broken is exactly the machine that has to be
 * able to update itself.
 */
function readTar(buf) {
  const out = [];
  let longName = "";
  for (let at = 0; at + 512 <= buf.length; ) {
    const head = buf.subarray(at, at + 512);
    if (head.every((b) => b === 0)) break;              // the end is two empty blocks
    const str = (from, len) => {
      const s = head.subarray(from, from + len);
      const end = s.indexOf(0);
      return s.subarray(0, end === -1 ? s.length : end).toString("utf8");
    };
    const size = parseInt(str(124, 12).trim() || "0", 8) || 0;
    const type = String.fromCharCode(head[156] || 0x30);
    const prefix = str(345, 155);
    const name = longName || (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    const body = buf.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;

    if (type === "L") { longName = body.toString("utf8").replace(/\0+$/, ""); continue; }
    longName = "";
    if (type === "0" || type === "\0") out.push({ name, body });
  }
  return out;
}

const entries = readTar(zlib.gunzipSync(Buffer.from(await res.arrayBuffer())));
// GitHub names the archive's one top folder after the commit it was cut from,
// which answers "is this really the new code?" before anything is written.
const root = entries[0]?.name.split("/")[0] ?? "";
const commit = /-([0-9a-f]{7,40})$/.exec(root)?.[1] ?? "";

const wanted = entries
  .map((e) => ({ ...e, rel: e.name.startsWith(`${root}/agent/`) ? e.name.slice(root.length + 7) : "" }))
  // Files directly in agent/, not in a folder under it, and not the owner's own.
  .filter((e) => e.rel && !e.rel.includes("/") && !KEEP.has(e.rel));

if (!wanted.length) {
  console.log("  the archive did not contain the agent files. try again in a minute.\n");
  process.exit(1);
}

let written = 0;
for (const f of wanted) {
  const target = path.join(HERE, f.rel);
  // Skip a file that is already identical, so the list shows real changes.
  if (fs.existsSync(target) && fs.readFileSync(target).equals(f.body)) continue;
  fs.writeFileSync(target, f.body);
  console.log(`  updated  ${f.rel}`);
  written++;
}

if (!written) {
  console.log(`  already up to date. nothing changed.${commit ? `  (${commit.slice(0, 7)})` : ""}\n`);
  process.exit(0);
}

// The version is read from the file that was just replaced, so it is the new
// one rather than the one this process started with.
const now = /VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(HERE, "version.mjs"), "utf8"))?.[1] ?? "?";
console.log(`
  ${written} file${written === 1 ? "" : "s"} updated.
  now on version ${now}${commit ? `  (commit ${commit.slice(0, 7)})` : ""}

  config.json, ffmpeg and the installed packages were left alone.
  Close the agent window if it is open, then run start.bat again.
`);
process.exit(0);
