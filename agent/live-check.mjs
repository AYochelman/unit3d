// Does the live stream have everything it needs?
//
// Four things have to be true before a print shows up as video: ffmpeg is here,
// the printer offers a stream, R2 accepts what we send it, and the public
// address serves it back. This checks all four and names the one that is wrong.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeR2 } from "./r2.mjs";
import { banner } from "./version.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));

const ok = (m, x = "") => console.log(`  \x1b[32mok\x1b[0m    ${m} ${x}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };

banner("checking the live video setup");

// 1. ffmpeg
const bin = (() => {
  const local = path.join(HERE, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (fs.existsSync(local)) return local;
  return spawnSync(process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", ["-version"], { stdio: "ignore" }).status === 0 ? "ffmpeg" : "";
})();
if (bin) ok("ffmpeg is here");
else bad("ffmpeg is missing", "double-click ffmpeg-install.bat, then run this again.");

// 2. The settings
const r2 = cfg.live?.r2;
if (!r2?.accountId || !r2?.accessKeyId || !r2?.secretAccessKey || !r2?.bucket) {
  bad("the Cloudflare settings are not filled in", "run settings.bat and answer the live-video questions.");
  console.log("");
  process.exit(1);
}
ok("the Cloudflare settings are filled in", `(bucket ${r2.bucket})`);

// 3. Can we write to the bucket?
const store = makeR2(r2);
const wrote = await store.check();
if (wrote.ok) {
  ok("Cloudflare accepted a test upload");
  await store.remove(".unit3d-check");
} else {
  bad(`Cloudflare refused the upload (${wrote.status})`,
      wrote.status === 403 || wrote.status === 401
        ? "the keys are wrong, or the token does not cover this bucket. make a new API token with Object Read & Write."
        : wrote.status === 404
          ? `no bucket named "${r2.bucket}". check the spelling in Cloudflare.`
          : wrote.text || "no reason given");
  console.log("");
  process.exit(1);
}

// 4. Is it readable from the web, the way a visitor's browser will read it?
const publicUrl = (cfg.live?.publicUrl || "https://live.unit-3d.com").replace(/\/$/, "");
await store.put("live/.probe.txt", Buffer.from("ok"), "text/plain", "no-cache, max-age=0");
await new Promise((r) => setTimeout(r, 1500));
const back = await fetch(`${publicUrl}/live/.probe.txt?t=${Date.now()}`, { cache: "no-store" }).catch(() => null);
if (back?.ok) {
  ok("the public address serves it back", `(${publicUrl})`);
} else {
  bad(`the public address did not serve it (${back ? back.status : "no answer"})`,
      `in Cloudflare > R2 > ${r2.bucket} > Settings > Public access, connect the domain ${publicUrl.replace(/^https?:\/\//, "")}. DNS can take a few minutes.`);
}
await store.remove("live/.probe.txt");

console.log(`
  When a print starts, the video appears at:
  ${publicUrl}/live/stream.m3u8
`);
process.exit(0);
