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
import net from "node:net";
import { spawnSync } from "node:child_process";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";
import { banner } from "./version.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const { host, serial, accessCode } = cfg.printer;
const SB = String(cfg.supabase.url).replace(/\/$/, "");
const KEY = cfg.supabase.serviceKey;
const legacyKey = String(KEY).startsWith("ey");

const ok = (m, x = "") => console.log(`  \x1b[32mok\x1b[0m    ${m} ${x}`);
const bad = (m, fix) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };
const step = (m) => console.log(`\n  ${m}`);

banner("why is the camera picture black");
console.log("  This takes about 20 seconds.");

// ─── 1. The chamber light ────────────────────────────────────────────────────
let ipcam = null;
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
    c.subscribe(`device/${serial}/report`);
    c.publish(`device/${serial}/request`, JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }));
    c.publish(`device/${serial}/request`, JSON.stringify({
      system: { sequence_id: "1", command: "ledctrl", led_node: "chamber_light",
        led_mode: "on", led_on_time: 500, led_off_time: 500, loop_times: 0, interval_time: 0 },
    }));
    setTimeout(() => done(() => {
      ok("asked for the light", "(look at the printer - is it lit inside?)");
      // The printer describes its own camera in the report. When the frame grab
      // below fails, this is the line that says what it offers instead.
      if (ipcam) console.log(`        the printer describes its camera as: ${JSON.stringify(ipcam)}`);
      else console.log("        the printer said nothing about its camera.");
    }), 4000);
  });
  c.on("message", (_t, buf) => {
    try {
      const m = JSON.parse(buf.toString());
      if (m.print?.ipcam) ipcam = { ...(ipcam ?? {}), ...m.print.ipcam };
    } catch {}
  });
});

// ─── 2. A real frame off the printer ─────────────────────────────────────────
step("2. asking the printer for a picture");

// P-series printers hand out JPEG frames on port 6000 after an 80-byte login.
// Whether that port speaks TLS or plain TCP has differed between models and
// firmware, and a wrong guess looks exactly like "no camera" - so try both and
// say which one answered.
function grab(mode) {
  return new Promise((resolve) => {
    const auth = Buffer.alloc(80);
    auth.writeUInt32LE(0x40, 0);
    auth.writeUInt32LE(0x3000, 4);
    auth.write("bblp", 16, 32, "ascii");
    auth.write(accessCode, 48, 32, "ascii");

    let chunks = Buffer.alloc(0);
    let expect = 0;
    let sock;
    const done = (v, why) => { try { sock.destroy(); } catch {} resolve({ jpeg: v, why, seen: chunks.length }); };

    const onData = (d) => {
      chunks = Buffer.concat([chunks, d]);
      if (!expect && chunks.length >= 16) {
        expect = chunks.readUInt32LE(0);
        // A sane frame is a few KB to a few MB. Anything else means these bytes
        // are not the header this code expects.
        if (expect < 1000 || expect > 20_000_000) {
          return done(null, `answered, but not in the expected format (first bytes: ${chunks.subarray(0, 8).toString("hex")})`);
        }
        chunks = chunks.subarray(16);
      }
      if (expect && chunks.length >= expect) done(chunks.subarray(0, expect), "");
    };

    if (mode === "tls") {
      sock = tls.connect({ host, port: 6000, rejectUnauthorized: false, timeout: 15_000 }, () => sock.write(auth));
    } else {
      sock = net.connect({ host, port: 6000, timeout: 15_000 }, () => sock.write(auth));
    }
    sock.on("data", onData);
    sock.on("error", (e) => done(null, e.message));
    sock.on("timeout", () => done(null, chunks.length ? "sent some bytes then stopped" : "connected but sent nothing"));
    sock.on("close", () => done(null, chunks.length ? "closed early" : "closed without sending anything"));
  });
}

let jpeg = null;
let worked = "";
for (const mode of ["tls", "plain"]) {
  const r = await grab(mode);
  if (r.jpeg && r.jpeg.length > 1000) {
    jpeg = r.jpeg;
    worked = mode;
    ok(`the ${mode === "tls" ? "encrypted" : "plain"} connection worked`);
    break;
  }
  console.log(`        ${mode === "tls" ? "encrypted" : "plain"} connection: ${r.why || "no picture"}${r.seen ? ` (${r.seen} bytes seen)` : ""}`);
}

// ─── 2b. The video stream, when the printer advertises one ──────────────────
// Newer printers (P2S among them) do not hand out single frames at all: they
// publish an RTSPS address in their own report. Video needs ffmpeg to turn into
// a picture, so this checks for it and takes one still.
if (!jpeg && ipcam?.rtsp_url) {
  step("2b. this printer streams video instead - taking one still from the stream");
  const bin = (() => {
    const local = path.join(HERE, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
    if (fs.existsSync(local)) return local;
    return spawnSync(process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", ["-version"], { stdio: "ignore" }).status === 0
      ? "ffmpeg" : "";
  })();

  if (!bin) {
    bad("ffmpeg is not installed, and video cannot be read without it",
        "double-click ffmpeg-install.bat (Mac: ffmpeg-install-mac.command), then run this again.");
  } else {
    const out = path.join(HERE, "camera-test.jpg");
    const authed = String(ipcam.rtsp_url).replace(/^rtsps?:\/\//i, (m) => `${m}bblp:${encodeURIComponent(accessCode)}@`);
    // The printer serves the stream with a self-signed certificate; recent
    // ffmpeg verifies by default and refuses. Skipping that check is correct
    // here and nowhere else: this is a machine on the LAN, addressed by IP,
    // whose identity is proved by the access code in the address.
    const attempt = (withFlag) => spawnSync(bin, [
      "-nostdin", "-loglevel", "error", "-rtsp_transport", "tcp",
      ...(withFlag ? ["-tls_verify", "0"] : []),
      "-i", authed, "-frames:v", "1", "-q:v", "5", "-y", out,
    ], { encoding: "utf8", timeout: 30_000 });

    let r = attempt(true);
    // Older builds do not know the option and do not need it.
    if (r.status !== 0 && /tls_verify|Unrecognized option|Option not found/i.test(String(r.stderr))) r = attempt(false);

    if (r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 1000) {
      jpeg = fs.readFileSync(out);
      worked = "stream";
      ok(`took a still from the video stream (${Math.round(jpeg.length / 1024)} KB)`);
    } else {
      // Never print the command line - it carries the access code.
      const why = String(r.stderr || r.error?.message || "no reason given")
        .replace(/rtsps?:\/\/[^\s]+/gi, "rtsps://<printer>").trim().slice(0, 300);
      bad("ffmpeg could not read the stream", why);
    }
  }
}

if (!jpeg || jpeg.length < 1000) {
  bad("could not get a picture out of this printer",
      ipcam?.rtsp_url
        ? "the printer offers a video stream - the lines above say what stopped it."
        : "if 'LAN Only Liveview' is already ON, this printer speaks a camera protocol this agent does not know yet.");
  console.log(`
  Send this whole window as a screenshot - the lines above say exactly what the
  printer did answer, which is what is needed to support it.

  Everything else keeps working without the camera: state, progress, layers,
  temperatures and finished prints all come over a different connection.
`);
  process.exit(1);
}
const local = path.join(HERE, "camera-test.jpg");
fs.writeFileSync(local, jpeg);
if (worked !== "stream") ok(`got a picture (${Math.round(jpeg.length / 1024)} KB, over the ${worked === "tls" ? "encrypted" : "plain"} connection)`);
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
