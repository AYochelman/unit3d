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
import { Readable } from "node:stream";
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
 * Read the archive as it arrives, and keep only the agent's own files.
 *
 * It used to be read whole: the download into one buffer, then gunzip into a
 * second. The repository carries the shop's catalogue photographs and its
 * fonts, so that second buffer is several hundred megabytes -- and on 27.9
 * the Pi, with about 700 MB free, answered with one word: "Killed". The
 * kernel had ended the updater for asking for more memory than there was,
 * and the agent stayed on the old version.
 *
 * Streamed, it holds one tar header and, at most, one agent file at a time.
 * Everything else in the archive -- nearly all of it -- is counted past and
 * dropped the moment it arrives. Still nothing installed: gunzip and a
 * 512-byte header format are all it takes.
 */
async function agentFiles(body) {
  const files = [];
  let root = "";
  let buf = Buffer.alloc(0);
  let want = null;       // { name, size, parts, left } while inside a file
  let skip = 0;          // bytes still to drop (unwanted body + padding)
  let longName = "";
  let done = false;

  const onHeader = (head) => {
    if (head.every((b) => b === 0)) { done = true; return; }
    const str = (from, len) => {
      const x = head.subarray(from, from + len);
      const z = x.indexOf(0);
      return x.subarray(0, z === -1 ? x.length : z).toString("utf8");
    };
    const size = parseInt(str(124, 12).trim() || "0", 8) || 0;
    const type = String.fromCharCode(head[156] || 0x30);
    const prefix = str(345, 155);
    const name = longName || (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    const padded = Math.ceil(size / 512) * 512;
    // The first entry is a pax header ("pax_global_header", type g) in both
    // GitHub's archives and git's own, so the root folder is taken from the
    // first real directory or file, not from whatever comes first.
    if (!root && (type === "5" || type === "0") && name.includes("/")) root = name.split("/")[0];
    if (type === "L") { want = { long: true, parts: [], left: size, pad: padded - size }; return; }
    longName = "";
    const rel = name.startsWith(`${root}/agent/`) ? name.slice(root.length + 7) : "";
    if ((type === "0" || type === "\0") && rel && !rel.includes("/") && !KEEP.has(rel)) {
      want = { rel, parts: [], left: size, pad: padded - size };
      if (size === 0) { files.push({ rel, body: Buffer.alloc(0) }); want = null; skip = padded; }
    } else {
      skip = padded;
    }
  };

  const gunzip = zlib.createGunzip();
  Readable.fromWeb(body).pipe(gunzip);
  for await (const chunk of gunzip) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (!done) {
      if (skip) {
        const n = Math.min(skip, buf.length);
        buf = buf.subarray(n); skip -= n;
        if (skip) break;
        continue;
      }
      if (want) {
        const n = Math.min(want.left, buf.length);
        want.parts.push(buf.subarray(0, n)); buf = buf.subarray(n); want.left -= n;
        if (want.left) break;
        const data = Buffer.concat(want.parts);
        if (want.long) longName = data.toString("utf8").replace(/\0+$/, "");
        else files.push({ rel: want.rel, body: data });
        skip = want.pad; want = null;
        continue;
      }
      if (buf.length < 512) break;
      onHeader(buf.subarray(0, 512));
      buf = buf.subarray(512);
    }
    if (done) { gunzip.destroy(); break; }
  }
  return files;
}

// GitHub fingerprints the archive in its ETag. It is not the commit id, but it
// does answer "did this run get the same archive as the last one?" — which is
// the question worth asking when an update seems not to have taken. An archive
// asked for within a minute or so of a push can still be the previous one.
const stamp = (res.headers?.get("etag") || "").replace(/^W\//, "").replace(/"/g, "").slice(0, 7);

const wanted = await agentFiles(res.body);

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
  console.log(`  already up to date. nothing changed.${stamp ? `  (archive ${stamp})` : ""}\n`);
  process.exit(0);
}

// The version is read from the file that was just replaced, so it is the new
// one rather than the one this process started with.
const now = /VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(HERE, "version.mjs"), "utf8"))?.[1] ?? "?";
console.log(`
  ${written} file${written === 1 ? "" : "s"} updated.
  now on version ${now}${stamp ? `  (archive ${stamp})` : ""}

  config.json, ffmpeg and the installed packages were left alone.
  Close the agent window if it is open, then run start.bat again.
`);
process.exit(0);
