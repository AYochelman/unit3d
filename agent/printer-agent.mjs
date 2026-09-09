/**
 * The bridge between the printer and the shop.
 *
 * The site is static and lives on GitHub Pages; the printer sits on a home
 * network behind a router. Nothing on the internet can reach it, and it cannot
 * reach the site. So this runs on a computer beside the printer and carries the
 * data across: it listens to the printer over the LAN and writes what it hears
 * into the same Supabase project the orders use. The site only ever reads.
 *
 * Three things travel:
 *   · status  — what is printing, how far in, temperatures, minutes left
 *   · camera  — a still from the chamber, refreshed every few seconds
 *   · finished jobs and timelapses — the record that outlives the print
 *
 * It writes with the service key, which is why it must NEVER run in a browser:
 * that key can write anything. On the site the same rows are read with the
 * public key, which can only read.
 *
 *   node printer-agent.mjs            (config.json beside this file)
 */
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";
import { makeR2 } from "./r2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, "config.json");

if (!fs.existsSync(CONFIG_PATH)) {
  console.error("config.json is missing. Run settings.bat (or: node setup.mjs).");
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const { host, serial, accessCode, model = "Bambu Lab" } = cfg.printer ?? {};
const SB = (cfg.supabase?.url ?? "").replace(/\/$/, "");
const KEY = cfg.supabase?.serviceKey ?? "";
if (!host || !serial || !accessCode || !SB || !KEY) {
  console.error("config.json is incomplete: printer.host / serial / accessCode, or supabase.url / serviceKey.");
  process.exit(1);
}

// The wizard used to write 5s and 15s, back when the page only read every ten
// seconds. Those exact numbers are the old defaults rather than a choice anyone
// made, so an existing config is brought up to the live pace; any other value
// is left as the person set it.
const STATUS_EVERY = (cfg.statusEverySeconds == null || cfg.statusEverySeconds === 5 ? 2 : cfg.statusEverySeconds) * 1000;
const CAM_EVERY = (cfg.camera?.everySeconds == null || cfg.camera?.everySeconds === 15 ? 6 : cfg.camera.everySeconds) * 1000;
const TL_EVERY = (cfg.timelapse?.everyMinutes ?? 30) * 60 * 1000;

const log = (...a) => console.log(new Date().toLocaleTimeString("he-IL"), ...a);

// ─── Supabase, over plain HTTP so the agent needs no SDK ──────────────────────
// Supabase's newer keys (`sb_secret_…`) are not JWTs, so they belong in the
// apikey header alone; the older service_role key is a JWT and wants both.
const legacyKey = KEY.startsWith("ey");
const sbHeaders = {
  apikey: KEY,
  ...(legacyKey ? { Authorization: `Bearer ${KEY}` } : {}),
  "Content-Type": "application/json",
};

async function upsertStatus(row) {
  const res = await fetch(`${SB}/rest/v1/printer_status?on_conflict=id`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: "live", ...row, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) log("status write failed:", res.status, (await res.text()).slice(0, 200));
}

async function insertJob(row) {
  const res = await fetch(`${SB}/rest/v1/printer_jobs?on_conflict=key`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) log("job write failed:", res.status, (await res.text()).slice(0, 200));
}

async function upload(bucket, name, body, contentType) {
  const res = await fetch(`${SB}/storage/v1/object/${bucket}/${name}`, {
    method: "POST",
    headers: { apikey: KEY, ...(legacyKey ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": contentType, "x-upsert": "true" },
    body,
  });
  if (!res.ok) log("upload failed:", name, res.status, (await res.text()).slice(0, 200));
  return res.ok;
}

// ─── The printer's own state, over MQTT on the LAN ────────────────────────────
// Bambu speaks MQTT over TLS with a self-signed certificate: the user is `bblp`
// and the password is the LAN access code from the printer's screen.
let last = {};          // the merged report — Bambu sends partial updates
let lastSeen = 0;
let currentKey = "";    // the job we are watching, so a finish is filed once

const state = () => {
  const p = last.print ?? {};
  const g = String(p.gcode_state ?? "").toUpperCase();
  if (!lastSeen || Date.now() - lastSeen > 60_000) return "offline";
  if (g === "RUNNING") return "printing";
  if (g === "PAUSE") return "paused";
  if (g === "FAILED") return "failed";
  if (g === "FINISH") return "finished";
  return "idle";
};

const jobName = () => {
  const p = last.print ?? {};
  const raw = p.subtask_name || p.gcode_file || "";
  return String(raw).replace(/\.(gcode|3mf)(\.\d+)?$/i, "").replace(/^.*\//, "");
};

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function statusRow() {
  const p = last.print ?? {};
  return {
    state: state(),
    model,
    job_name: jobName() || null,
    progress: num(p.mc_percent),
    layer: num(p.layer_num),
    layers_total: num(p.total_layer_num),
    minutes_left: num(p.mc_remaining_time),
    nozzle_temp: num(p.nozzle_temper),
    nozzle_target: num(p.nozzle_target_temper),
    bed_temp: num(p.bed_temper),
    bed_target: num(p.bed_target_temper),
    speed_level: num(p.spd_lvl),
    fan: num(Number(p.cooling_fan_speed)) ,
    filament: filamentName(),
  };
}

/** The colour on the spool, when the printer reports one. */
function filamentName() {
  const trays = last.print?.ams?.ams?.flatMap((a) => a.tray ?? []) ?? [];
  const active = String(last.print?.ams?.tray_now ?? "");
  const tray = trays.find((t) => String(t.id) === active) ?? trays[0];
  if (!tray) return null;
  const type = tray.tray_type || tray.tray_sub_brands || "";
  return type ? String(type) : null;
}

const client = mqtt.connect(`mqtts://${host}:8883`, {
  username: "bblp",
  password: accessCode,
  rejectUnauthorized: false,
  reconnectPeriod: 5000,
  connectTimeout: 10_000,
});

client.on("connect", () => {
  log("connected to the printer at", host);
  client.subscribe(`device/${serial}/report`);
  // Bambu only sends deltas until asked for everything once.
  client.publish(`device/${serial}/request`, JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }));
  // The chamber is dark unless its LED is on; ask straight away so the first
  // frame is not a black rectangle.
  setTimeout(() => keepChamberLit(), 2500);
});

client.on("error", (e) => {
  log("MQTT error:", e.message);
  // The printer accepting the socket and closing it immediately is what its
  // authorisation gate looks like from here, not a network fault.
  if (/FIN|ECONNRESET|closed|EPROTO/i.test(e.message)) {
    log("  the printer closed the connection.");
    log("  on the printer screen: Settings > LAN Only > turn ON 'Developer Mode',");
    log("  then close this window and run start.bat again.");
  }
});
client.on("reconnect", () => log("reconnecting..."));

client.on("message", (_topic, buf) => {
  try {
    const msg = JSON.parse(buf.toString());
    if (!msg.print) return;
    last = { ...last, print: { ...(last.print ?? {}), ...msg.print } };
    lastSeen = Date.now();
  } catch {
    /* a malformed frame is not worth crashing over */
  }
});

// ─── The record of a finished print ───────────────────────────────────────────
// A job is filed once, when the printer says it is done and it was one we saw
// running — so a printer sitting on FINISH all night does not file it nightly.
let wasPrinting = false;
async function watchFinish() {
  const s = state();
  const name = jobName();
  if (s === "printing" && name) {
    wasPrinting = true;
    currentKey = currentKey || `${name}·${new Date().toISOString().slice(0, 16)}`;
    return;
  }
  if (wasPrinting && (s === "finished" || s === "failed")) {
    await insertJob({
      key: currentKey || `${name}·${Date.now()}`,
      name: name || "ללא שם",
      finished_at: new Date().toISOString(),
      ok: s === "finished",
      minutes: num(last.print?.mc_print_time) ?? null,
      layers: num(last.print?.total_layer_num),
    });
    log(s === "finished" ? "print finished - logged:" : "print stopped - logged:", name);
    wasPrinting = false;
    currentKey = "";
  }
}

// ─── The chamber light ───────────────────────────────────────────────────────
// The chamber is dark unless its LED is on, and the printer switches that LED
// off by itself when it is not printing — which is exactly when someone looking
// at the website wants to see inside. Not every firmware reports lights_report,
// so the light is asked for whenever it is not known to be on, on a slow beat,
// and put back the way it was found when the agent stops.
//
// config.json: camera.light — "auto" (default) or "never".
let litByUs = false;
let lastLightAsk = 0;

const lightIsOn = () => {
  const report = last.print?.lights_report;
  if (!Array.isArray(report)) return null;
  const chamber = report.find((l) => String(l.node) === "chamber_light");
  return chamber ? String(chamber.mode).toLowerCase() === "on" : null;
};

function setChamberLight(on) {
  if (!client.connected) return;
  client.publish(
    `device/${serial}/request`,
    JSON.stringify({
      system: {
        sequence_id: String(Date.now() % 100000),
        command: "ledctrl",
        led_node: "chamber_light",
        led_mode: on ? "on" : "off",
        led_on_time: 500,
        led_off_time: 500,
        loop_times: 0,
        interval_time: 0,
      },
    }),
  );
}

function keepChamberLit() {
  if ((cfg.camera?.light ?? "auto") === "never") return;
  const on = lightIsOn();
  if (on === true) return;
  if (Date.now() - lastLightAsk < 60_000) return;
  lastLightAsk = Date.now();
  setChamberLight(true);
  litByUs = true;
  log(on === false
    ? "chamber light was off - turned it on so the camera has something to show"
    : "printer does not report its light - asking for it on anyway");
}

// ─── The chamber camera ───────────────────────────────────────────────────────
// Two different printers live under one brand here.
//
// P1-series machines hand out single JPEG frames on port 6000 after an 80-byte
// login. Newer ones — the P2S among them — do not: port 6000 answers with
// something else entirely, and the real camera is an RTSPS video stream whose
// address the printer publishes in its own report (`ipcam.rtsp_url`). Video is
// not something this agent can decode by itself, so when a printer offers a
// stream, ffmpeg is asked to sit on it and write one still every few seconds.
//
// The order is: use the stream if the printer advertises one and ffmpeg is
// here, otherwise fall back to the port-6000 frames. A printer that offers
// neither is told so, once, rather than failing silently.
const CAM_FILE = path.join(HERE, ".cam.jpg");

// The printer's stream is served with its own self-signed certificate — the
// same one MQTT presents, and the same reason that connection passes
// rejectUnauthorized: false. Recent ffmpeg verifies TLS by default and refuses,
// which reads as "Peer certificate failed verification". There is no
// certificate authority to satisfy here: the printer is on the LAN, addressed
// by IP, and its identity is proved by the access code the stream carries.
// Older ffmpeg builds do not verify by default and do not know the option at
// all, so it is dropped the moment one of them says so.
let tlsFlag = true;
const RTSP_IN = (url) => [
  "-nostdin", "-loglevel", "error",
  "-rtsp_transport", "tcp",
  ...(tlsFlag ? ["-tls_verify", "0"] : []),
  "-i", url,
];

const rtspUrl = () => {
  const u = last.print?.ipcam?.rtsp_url;
  return typeof u === "string" && /^rtsps?:\/\//i.test(u) ? u : "";
};

/** ffmpeg, if this machine has one: beside the agent, or anywhere on PATH. */
function findFfmpeg() {
  const local = path.join(HERE, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (fs.existsSync(local)) return local;
  const probe = spawnSync(process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", ["-version"], { stdio: "ignore" });
  return probe.status === 0 ? "ffmpeg" : "";
}

let ff = null;          // the running ffmpeg, if any
let ffLastStart = 0;
let lastNewShot = Date.now();   // when a genuinely new still last appeared
let stallWarned = false;
let ffStartedFor = "";  // the URL it was started for
let ffWarned = false;

function startStream() {
  const url = rtspUrl();
  if (!url || ffStartedFor === url) return;
  const bin = findFfmpeg();
  if (!bin) {
    if (!ffWarned) {
      ffWarned = true;
      log("camera: this printer streams video, which needs ffmpeg - it is not installed.");
      log("  double-click ffmpeg-install.bat once, then restart the agent.");
      log("  (everything else keeps working without it.)");
    }
    return;
  }
  if (Date.now() - ffLastStart < 30_000) return; // do not spin on a stream that refuses
  stopStream();
  ffLastStart = Date.now();
  lastNewShot = Date.now();
  ffStartedFor = url;
  // The credentials go in the URL, which is how RTSP carries them. They are
  // never logged: the printer's access code is not something to leave in a file
  // anyone might paste into a chat.
  const authed = url.replace(/^rtsps?:\/\//i, (m) => `${m}bblp:${encodeURIComponent(accessCode)}@`);
  const seconds = Math.max(2, Math.round(CAM_EVERY / 1000));
  ff = spawn(bin, [...RTSP_IN(authed), "-vf", `fps=1/${seconds}`, "-q:v", "5", "-update", "1", "-y", CAM_FILE],
    { stdio: ["ignore", "ignore", "pipe"] });

  let said = false;
  ff.stderr?.on("data", (d) => {
    const text = String(d);
    if (tlsFlag && /tls_verify|Unrecognized option|Option not found/i.test(text)) {
      tlsFlag = false;
      ffLastStart = 0; // this one is worth retrying straight away
      stopStream();
      log("camera: this ffmpeg does not know -tls_verify; retrying without it");
      return;
    }
    if (said) return;
    said = true;
    // Strip the URL before printing: it carries the access code.
    log("camera stream:", text.replace(/rtsps?:\/\/[^\s]+/gi, "rtsps://<printer>").trim().slice(0, 180));
  });
  ff.on("exit", () => {
    ff = null;
    ffStartedFor = "";  // let the next tick start it again
  });
  log(`camera: reading the printer's video stream, one still every ${seconds}s`);
}

function stopStream() {
  if (ff) { try { ff.kill(); } catch {} ff = null; }
  ffStartedFor = "";
}

// ─── The older way: single JPEG frames on port 6000 ──────────────────────────
// Whether that port speaks TLS or plain TCP has differed between firmwares, so
// try both and remember whichever answered.
let camMode = cfg.camera?.mode || "";

function grabOnce(mode) {
  return new Promise((resolve) => {
    const auth = Buffer.alloc(80);
    auth.writeUInt32LE(0x40, 0);
    auth.writeUInt32LE(0x3000, 4);
    auth.write("bblp", 16, 32, "ascii");
    auth.write(accessCode, 48, 32, "ascii");

    let chunks = Buffer.alloc(0);
    let expect = 0;
    let sock;
    const done = (v) => { try { sock.destroy(); } catch {} resolve(v); };

    const onData = (d) => {
      chunks = Buffer.concat([chunks, d]);
      if (!expect && chunks.length >= 16) {
        expect = chunks.readUInt32LE(0);
        if (expect < 1000 || expect > 20_000_000) return done(null);
        chunks = chunks.subarray(16);
      }
      if (expect && chunks.length >= expect) done(chunks.subarray(0, expect));
    };

    if (mode === "plain") sock = net.connect({ host, port: 6000, timeout: 12_000 }, () => sock.write(auth));
    else sock = tls.connect({ host, port: 6000, rejectUnauthorized: false, timeout: 12_000 }, () => sock.write(auth));
    sock.on("data", onData);
    sock.on("error", () => done(null));
    sock.on("timeout", () => done(null));
    sock.on("close", () => done(null));
  });
}

async function grabFrame() {
  for (const mode of camMode ? [camMode] : ["tls", "plain"]) {
    const jpeg = await grabOnce(mode);
    if (jpeg && jpeg.length > 1000) {
      if (camMode !== mode) log(`camera: the ${mode === "tls" ? "encrypted" : "plain"} connection works - using it from now on`);
      camMode = mode;
      return jpeg;
    }
  }
  camMode = "";
  return null;
}

// A camera that never answers should be said out loud once, not swallowed on a
// six-second loop: silence here is what made a missing picture look like a dark
// room for days.
let camFailures = 0;
let camWarned = false;
let lastShotAt = 0;
/**
 * A stream can stop delivering without the process that reads it ever exiting —
 * the connection stalls, ffmpeg sits there, and the last still it wrote stays
 * on the website looking current. That is the worst kind of failure this page
 * can have: an old picture presented as live. So if no new still has appeared
 * for several intervals, the reader is killed and started again.
 */
function watchStream() {
  const stallAfter = Math.max(30_000, CAM_EVERY * 5);
  if (Date.now() - lastNewShot < stallAfter) return;
  if (!stallWarned) {
    stallWarned = true;
    log("camera: the stream stopped sending - reconnecting");
  }
  ffLastStart = 0; // a stall is worth reconnecting immediately
  stopStream();
  lastNewShot = Date.now(); // give the new reader its own grace period
}

/** A file still being written is not a picture yet. JPEG ends with FFD9. */
const wholeJpeg = (b) => b.length > 1000 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;

async function pushCamera() {
  if (cfg.camera?.enabled === false) return;
  keepChamberLit();

  let jpeg = null;
  if (rtspUrl()) {
    startStream();
    watchStream();
    // ffmpeg overwrites one file in place; a newer timestamp means a new still.
    try {
      const st = fs.statSync(CAM_FILE);
      if (st.mtimeMs > lastShotAt && st.size > 1000) {
        const body = fs.readFileSync(CAM_FILE);
        if (!wholeJpeg(body)) return; // caught mid-write; the next tick gets it
        lastShotAt = st.mtimeMs;
        lastNewShot = Date.now();
        if (stallWarned) { stallWarned = false; log("camera: the stream is sending again"); }
        jpeg = body;
      } else {
        return; // nothing new yet; not a failure
      }
    } catch {
      jpeg = null; // ffmpeg has not written one yet
    }
  } else {
    jpeg = await grabFrame();
  }

  if (!jpeg || jpeg.length < 1000) {
    if (++camFailures === 5 && !camWarned) {
      camWarned = true;
      log("camera: the printer is not sending pictures. everything else still works.");
      log("  double-click camera.bat to find out why.");
    }
    return;
  }
  if (camWarned) log("camera: pictures are coming through again");
  camFailures = 0;
  camWarned = false;
  await upload("printer", "live.jpg", jpeg, "image/jpeg");
}

// ─── The live stream ─────────────────────────────────────────────────────────
// A still every few seconds is a readout, not a view. While a print is running
// the interesting thing is the motion, so ffmpeg cuts the printer's stream into
// short video segments and those go to Cloudflare R2, where serving them costs
// nothing. The page stitches them back into continuous video.
//
// It runs only while the printer is printing. Nobody needs a live broadcast of
// an empty plate, and an idle stream would burn bandwidth and write operations
// for no one.
const HLS_DIR = path.join(HERE, ".hls");
const HLS_KEY = "live";                 // where it lands in the bucket
const SEG_SECONDS = cfg.live?.segmentSeconds ?? 4;

const r2cfg = cfg.live?.r2;
const R2 = r2cfg?.accountId && r2cfg?.accessKeyId && r2cfg?.secretAccessKey && r2cfg?.bucket
  ? makeR2(r2cfg)
  : null;

let hls = null;              // the running ffmpeg
let hlsStartedFor = "";
let hlsLastStart = 0;
let sentSegments = new Set();  // what R2 already has
let hlsWarned = false;

function startLive() {
  if (!R2 || cfg.live?.enabled === false) return;
  const url = rtspUrl();
  if (!url) return;
  if (hls && hlsStartedFor === url) return;
  if (Date.now() - hlsLastStart < 20_000) return;

  const bin = findFfmpeg();
  if (!bin) {
    if (!hlsWarned) { hlsWarned = true; log("live: ffmpeg is missing, so there is no video stream."); }
    return;
  }

  fs.mkdirSync(HLS_DIR, { recursive: true });
  for (const f of fs.readdirSync(HLS_DIR)) { try { fs.unlinkSync(path.join(HLS_DIR, f)); } catch {} }
  sentSegments = new Set();
  hlsLastStart = Date.now();
  hlsStartedFor = url;

  const authed = url.replace(/^rtsps?:\/\//i, (m) => `${m}bblp:${encodeURIComponent(accessCode)}@`);
  // Re-encoding rather than copying the printer's video: it forces a keyframe
  // at the top of every segment, which is what keeps the delay short and the
  // player from stalling. A printer's picture barely moves, so 480p at this
  // bitrate looks the same as the original and costs a fraction to send.
  const copy = cfg.live?.mode === "copy";
  const args = [
    ...RTSP_IN(authed),
    ...(copy
      ? ["-c:v", "copy"]
      : ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
         "-vf", "scale=-2:480", "-b:v", "900k", "-maxrate", "1000k", "-bufsize", "1600k",
         "-g", String(SEG_SECONDS * 25), "-keyint_min", String(SEG_SECONDS * 25), "-sc_threshold", "0"]),
    "-an",
    "-f", "hls",
    "-hls_time", String(SEG_SECONDS),
    "-hls_list_size", "6",
    "-hls_flags", "delete_segments+independent_segments+temp_file",
    "-hls_segment_filename", path.join(HLS_DIR, "seg_%05d.ts"),
    path.join(HLS_DIR, "stream.m3u8"),
  ];

  hls = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
  let said = false;
  hls.stderr?.on("data", (d) => {
    if (said) return;
    said = true;
    log("live:", String(d).replace(/rtsps?:\/\/[^\s]+/gi, "rtsps://<printer>").trim().slice(0, 180));
  });
  hls.on("exit", () => { hls = null; hlsStartedFor = ""; });
  log(`live: streaming to the site in ${SEG_SECONDS}s pieces`);
}

function stopLive() {
  if (hls) { try { hls.kill(); } catch {} hls = null; }
  hlsStartedFor = "";
}

/**
 * Move whatever ffmpeg has written since last time up to R2.
 *
 * Segments go first and the playlist last: a playlist that names a piece which
 * has not arrived yet is what makes a player stall, and the order is the whole
 * fix. Pieces ffmpeg has dropped locally are dropped from the bucket too, so
 * the stored stream stays a handful of files rather than an ever-growing pile.
 */
async function pushLive() {
  if (!R2 || !hls) return;
  let files;
  try { files = fs.readdirSync(HLS_DIR); } catch { return; }

  const playlistPath = path.join(HLS_DIR, "stream.m3u8");
  if (!fs.existsSync(playlistPath)) return;
  const playlist = fs.readFileSync(playlistPath, "utf8");

  // Only send segments the playlist actually references — ffmpeg writes a
  // segment before it lists it, and sending one early wastes an upload.
  const named = new Set(playlist.split("\n").map((l) => l.trim()).filter((l) => l.endsWith(".ts")));

  for (const name of files) {
    if (!name.endsWith(".ts") || sentSegments.has(name) || !named.has(name)) continue;
    let body;
    try { body = fs.readFileSync(path.join(HLS_DIR, name)); } catch { continue; }
    if (body.length < 1000) continue;
    const r = await R2.put(`${HLS_KEY}/${name}`, body, "video/mp2t", "public, max-age=31536000, immutable");
    if (!r.ok) { log(`live: upload refused (${r.status})`, r.text); return; }
    sentSegments.add(name);
  }

  // The playlist changes every few seconds, so it must never be cached.
  await R2.put(`${HLS_KEY}/stream.m3u8`, Buffer.from(playlist), "application/vnd.apple.mpegurl", "no-cache, max-age=0");

  // Anything ffmpeg has rolled off is no longer playable; take it out of the
  // bucket so a print does not leave a trail behind it.
  for (const name of [...sentSegments]) {
    if (named.has(name)) continue;
    sentSegments.delete(name);
    void R2.remove(`${HLS_KEY}/${name}`);
  }
}

/** Tell the page whether video is worth asking for, without a database column. */
async function pushLiveFlag(live) {
  if (!R2) return;
  const body = Buffer.from(JSON.stringify({
    live,
    segment_seconds: SEG_SECONDS,
    updated_at: new Date().toISOString(),
  }));
  await R2.put(`${HLS_KEY}/status.json`, body, "application/json", "no-cache, max-age=0");
}

let wasLive = false;
async function liveTick() {
  if (!R2 || cfg.live?.enabled === false) return;
  const shouldStream = state() === "printing" && !!rtspUrl();
  if (shouldStream) {
    startLive();
    await pushLive();
  } else if (hls) {
    stopLive();
  }
  const nowLive = shouldStream && !!hls;
  if (nowLive !== wasLive) {
    wasLive = nowLive;
    await pushLiveFlag(nowLive);
    log(nowLive ? "live: the stream is on the site" : "live: stream stopped - back to stills");
  }
}

// ─── Timelapses ───────────────────────────────────────────────────────────────
// The printer writes them to its own card, and FTPS over the LAN is how they
// would come off it — except that Bambu's file transfer expects the data
// connection to resume the control connection's TLS session, which this client
// cannot do. The printer answers by closing the socket. So this is best-effort:
// it tries once, and if the printer refuses that way it says so plainly and
// stops asking, rather than printing the same red line every half hour.
const seen = new Set();
let timelapseOff = false;
async function pushTimelapses() {
  if (cfg.timelapse?.enabled === false || timelapseOff) return;
  let ftp;
  try {
    ({ Client: ftp } = await import("basic-ftp"));
  } catch {
    return; // basic-ftp not installed — timelapses simply stay on the card
  }
  const c = new ftp();
  try {
    await c.access({ host, port: 990, user: "bblp", password: accessCode, secure: "implicit", secureOptions: { rejectUnauthorized: false } });
    const files = (await c.list("/timelapse")).filter((f) => f.isFile && /\.mp4$/i.test(f.name));
    for (const f of files.slice(-12)) {
      if (seen.has(f.name)) continue;
      const tmp = path.join(HERE, ".tmp.mp4");
      await c.downloadTo(tmp, `/timelapse/${f.name}`);
      const body = fs.readFileSync(tmp);
      const ok = await upload("printer", `timelapse/${f.name}`, body, "video/mp4");
      fs.unlinkSync(tmp);
      if (ok) {
        seen.add(f.name);
        await fetch(`${SB}/rest/v1/printer_timelapses?on_conflict=file`, {
          method: "POST",
          headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            file: f.name,
            url: `${SB}/storage/v1/object/public/printer/timelapse/${encodeURIComponent(f.name)}`,
            size_mb: Math.round((f.size / 1048576) * 10) / 10,
            recorded_at: (f.modifiedAt ?? new Date()).toISOString(),
          }),
        });
        log("timelapse uploaded:", f.name);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/FIN|ECONNRESET|EPROTO|closed/i.test(msg)) {
      timelapseOff = true;
      log("timelapse: this printer does not allow third-party file transfer - skipping.");
      log("  (everything else keeps working: status, camera, finished prints.)");
    } else {
      log("timelapse failed:", msg);
    }
  } finally {
    c.close();
  }
}

// ─── Loops ────────────────────────────────────────────────────────────────────
const every = (ms, fn) => { fn(); return setInterval(fn, ms); };

every(STATUS_EVERY, async () => {
  try {
    await upsertStatus(statusRow());
    await watchFinish();
  } catch (e) { log("status error:", e.message); }
});
every(CAM_EVERY, () => pushCamera().catch((e) => log("camera error:", e.message)));
every(1000, () => liveTick().catch((e) => log("live error:", e.message)));
every(TL_EVERY, () => pushTimelapses().catch((e) => log("timelapse error:", e.message)));

log(`agent running - printer ${host} - updating every ${STATUS_EVERY / 1000}s`);

// Live video only starts when a print does, which means an unconfigured setup
// looks exactly like a configured one until the next print - and then fails
// with nobody watching. So say where it stands now, while someone is reading.
if (cfg.live?.enabled === false) {
  log("live video: switched off in the settings.");
} else if (!R2) {
  log("live video: not set up - run settings.bat and answer the Cloudflare questions.");
  log("  (stills keep working either way.)");
} else if (!findFfmpeg()) {
  log("live video: ffmpeg is missing - double-click ffmpeg-install.bat.");
} else {
  log(`live video: ready (bucket ${r2cfg.bucket}) - it starts by itself when a print starts.`);
  log("  to check it now without printing: double-click live-check.bat");
}
process.on("SIGINT", () => {
  stopStream();
  stopLive();
  if (R2) void pushLiveFlag(false);
  if (litByUs) setChamberLight(false);
  upsertStatus({ state: "offline" }).finally(() => process.exit(0));
});
