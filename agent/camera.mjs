// Why is the picture on the site black?
//
// The existing check only proves the camera's port is open, which is not the
// same as a picture arriving — and not the same as that picture reaching the
// website. This walks the whole path and stops at the first thing that is
// actually wrong, in plain words:
//
//   light  →  frame off the printer  →  saved here so you can look at it
//          →  uploaded to storage    →  read back over the public web
//
// Run it by double-clicking camera.bat (Windows) or camera-mac.command (Mac).
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const { host, serial, accessCode } = cfg.printer;
const SB = String(cfg.supabase.url).replace(/\/$/, "");
const KEY = cfg.supabase.serviceKey;
const legacyKey = String(KEY).startsWith("ey");

const ok = (m, x = "") => console.log(`  \x1b[32mok\x1b[0m    ${m} ${x}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };
const step = (m) => console.log(`\n  ${m}`);

console.log("\n  Checking why the camera picture is black.\n  This takes about 20 seconds.");

// ─── 1. The chamber light ────────────────────────────────────────────────────
step("1. asking the printer to turn its chamber light on");
await new Promise((resolve) => {
  const c = mqtt.connect(`mqtts://${host}:8883`, {
    username: "bblp", password: accessCode,
    rejectUnauthorized: false, connectTimeout: 8000, reconnectPeriod: 0,
  });
  const done = (fn) => { try { c.end(true); } catch {} fn(); resolve(); };
  c.on("error", (e) => done(() => bad(`could not reach the printer: ${e.message}`,
    "check the IP and access code, and that Developer Mode is on in Settings > LAN Only.")));
  c.on("connect", () => {
    c.publish(`device/${serial}/request`, JSON.stringify({
      system: { sequence_id: "1", command: "ledctrl", led_node: "chamber_light",
        led_mode: "on", led_on_time: 500, led_off_time: 500, loop_times: 0, interval_time: 0 },
    }));
    setTimeout(() => done(() => ok("asked for the light", "(look at the printer - is it lit inside?)")), 1500);
  });
});

// ─── 2. A real frame off the printer ─────────────────────────────────────────
step("2. asking the printer for a picture");
const jpeg = await new Promise((resolve) => {
  const auth = Buffer.alloc(80);
  auth.writeUInt32LE(0x40, 0);
  auth.writeUInt32LE(0x3000, 4);
  auth.write("bblp", 16, 32, "ascii");
  auth.write(accessCode, 48, 32, "ascii");

  let chunks = Buffer.alloc(0);
  let expect = 0;
  const done = (v) => { try { sock.destroy(); } catch {} resolve(v); };
  const sock = tls.connect({ host, port: 6000, rejectUnauthorized: false, timeout: 10_000 }, () => sock.write(auth));
  sock.on("data", (d) => {
    chunks = Buffer.concat([chunks, d]);
    if (!expect && chunks.length >= 16) { expect = chunks.readUInt32LE(0); chunks = chunks.subarray(16); }
    if (expect && chunks.length >= expect) done(chunks.subarray(0, expect));
  });
  sock.on("error", () => done(null));
  sock.on("timeout", () => done(null));
});

if (!jpeg || jpeg.length < 1000) {
  bad("the printer did not send a picture",
      "on the printer screen: Settings > LAN Only > turn ON 'LAN Only Liveview', then run this again.");
  console.log("\n  Stopping here - nothing after this can work without a picture.\n");
  process.exit(1);
}
const local = path.join(HERE, "camera-test.jpg");
fs.writeFileSync(local, jpeg);
ok(`got a picture (${Math.round(jpeg.length / 1024)} KB)`);
console.log(`        saved here: ${local}`);
console.log("        OPEN THAT FILE. if it is black, the printer's own camera sees darkness -");
console.log("        the light is off or something is covering it. if you can see the plate, good.");

// ─── 3. Into storage ─────────────────────────────────────────────────────────
step("3. uploading it to the website's storage");
const up = await fetch(`${SB}/storage/v1/object/printer/live.jpg`, {
  method: "POST",
  headers: {
    apikey: KEY, ...(legacyKey ? { Authorization: `Bearer ${KEY}` } : {}),
    "Content-Type": "image/jpeg", "x-upsert": "true",
  },
  body: jpeg,
}).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));

if (!up.ok) {
  const body = (await up.text()).slice(0, 200);
  bad(`storage refused the upload (${up.status})`,
      up.status === 404
        ? "the bucket 'printer' does not exist. Supabase > Storage > New bucket > name it exactly 'printer' and tick Public."
        : up.status === 400 || up.status === 401 || up.status === 403
          ? "the secret key is wrong or has no rights. run settings.bat and paste the Secret key again."
          : `Supabase said: ${body}`);
  console.log("");
  process.exit(1);
}
ok("uploaded");

// ─── 4. Back out over the public web ─────────────────────────────────────────
step("4. reading it back the way a visitor's browser would");
const publicUrl = `${SB}/storage/v1/object/public/printer/live.jpg?t=${Date.now()}`;
const back = await fetch(publicUrl, { cache: "no-store" }).catch(() => null);

if (!back || !back.ok) {
  bad(`the picture is not readable from the web (${back ? back.status : "no answer"})`,
      "the bucket is private. Supabase > Storage > printer > ... > Edit bucket > turn ON 'Public bucket'.");
  console.log(`\n  the address the site uses:\n  ${publicUrl.split("?")[0]}\n`);
  process.exit(1);
}
const size = Number(back.headers.get("content-length") || 0);
ok(`readable from the web (${Math.round(size / 1024)} KB)`);

console.log(`
  Everything on the path works.

  If the site still shows black, it is the picture itself, not the plumbing:
  open camera-test.jpg above. A black picture there means the chamber is dark
  or the lens is blocked - not a website problem.

  The address the site reads:
  ${publicUrl.split("?")[0]}
`);
process.exit(0);
