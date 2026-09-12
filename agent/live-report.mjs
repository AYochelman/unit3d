/**
 * One double-click that answers everything about the live video.
 *
 * Every round so far has cost a message each way to learn one fact. This asks
 * the running agent to broadcast, waits for it, and then reads the result back
 * from the public address the way a browser does — with the site's own address
 * attached — and prints what actually came back: the playlist itself, the
 * pieces it names, whether they are really there, what type they are served as,
 * and whether the permission comes home. It reads nothing private: no keys, no
 * access code, nothing but what any visitor's browser would receive.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const PUBLIC = (cfg.live?.publicUrl || "https://live.unit-3d.com").replace(/\/$/, "");
const SITE = cfg.live?.allowOrigins?.[0] || "https://unit-3d.com";
const nocache = (u) => `${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}`;
const get = (u) => fetch(nocache(u), { headers: { Origin: SITE }, cache: "no-store" }).catch((e) => ({ ok: false, status: 0, statusText: e.message, headers: new Headers() }));

console.log(`\n  Unit 3D · live video report\n  agent version ${VERSION}\n`);

// Ask the agent that is already running for a broadcast.
fs.writeFileSync(path.join(HERE, ".live-test"), String(Date.now()));
process.stdout.write("  asking the agent to broadcast");

let status = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  process.stdout.write(".");
  const res = await get(`${PUBLIC}/live/status.json`);
  if (!res.ok) continue;
  status = await res.json().catch(() => null);
  if (status?.live === true) break;
}
console.log("");

if (!status) {
  console.log("\n  FAIL  could not read live/status.json at all. Is the agent window open?\n");
  process.exit(1);
}
if (status.live !== true) {
  console.log(`\n  FAIL  the agent says there is no video. Its reason: ${status.why || "(none given)"}`);
  console.log("        Look at the agent window - the lines starting with 'live:' say more.\n");
  process.exit(1);
}
console.log(`  ok    the agent says video is on air (agent ${status.agent || "?"})\n`);

// The playlist, exactly as a browser receives it.
const pl = await get(`${PUBLIC}/live/stream.m3u8`);
console.log(`  playlist   HTTP ${pl.status}`);
console.log(`  type       ${pl.headers.get("content-type") || "(none)"}`);
console.log(`  allows     ${pl.headers.get("access-control-allow-origin") || "(NOTHING - a browser will refuse it)"}`);
if (!pl.ok) {
  console.log("\n  FAIL  the playlist is not being served. Nothing can play.\n");
  process.exit(1);
}
const body = await pl.text();
console.log("\n  ---- the playlist, as the browser sees it ----");
console.log(body.split("\n").map((l) => `  ${l}`).join("\n"));
console.log("  ----------------------------------------------\n");

const segs = body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
if (!segs.length) {
  console.log("  FAIL  the playlist names no video pieces at all.\n");
  process.exit(1);
}

// And the pieces it names.
let bad = 0;
for (const s of segs.slice(0, 3)) {
  const url = /^https?:/i.test(s) ? s : `${PUBLIC}/live/${s}`;
  const r = await get(url);
  const buf = r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
  // MPEG-TS starts every 188-byte packet with 0x47. Anything else is not video.
  const looksLikeVideo = buf.length > 1000 && buf[0] === 0x47;
  if (!r.ok || !looksLikeVideo) bad++;
  console.log(`  piece ${s.padEnd(16)} HTTP ${r.status}  ${buf.length} bytes  ${r.headers.get("content-type") || "(no type)"}  ${looksLikeVideo ? "looks like video" : "NOT VIDEO"}`);
}

console.log("");
console.log(bad === 0
  ? "  Everything the browser needs is there and correct.\n  If the page still shows stills, the fault is in the page, not here.\n"
  : `  FAIL  ${bad} of the pieces the playlist names are missing or are not video.\n`);
process.exit(bad === 0 ? 0 : 1);
