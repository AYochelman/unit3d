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
  stopStream();
  ffStartedFor = url;
  // The credentials go in the URL, which is how RTSP carries them. They are
  // never logged: the printer's access code is not something to leave in a file
  // anyone might paste into a chat.
  const authed = url.replace(/^rtsps?:\/\//i, (m) => `${m}bblp:${encodeURIComponent(accessCode)}@`);
  const seconds = Math.max(2, Math.round(CAM_EVERY / 1000));
  ff = spawn(bin, [
    "-nostdin", "-loglevel", "error",
    "-rtsp_transport", "tcp",
    "-i", authed,
    "-vf", `fps=1/${seconds}`,
    "-q:v", "5", "-update", "1", "-y", CAM_FILE,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let said = false;
  ff.stderr?.on("data", (d) => {
    if (said) return;
    said = true;
    // Strip the URL before printing: it carries the access code.
    log("camera stream:", String(d).replace(/rtsps?:\/\/[^\s]+/gi, "rtsps://<printer>").trim().slice(0, 180));
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

async function pushCamera() {
  if (cfg.camera?.enabled === false) return;
  keepChamberLit();

  let jpeg = null;
  if (rtspUrl()) {
    startStream();
    // ffmpeg overwrites one file in place; a newer timestamp means a new still.
    try {
      const st = fs.statSync(CAM_FILE);
      if (st.mtimeMs > lastShotAt && st.size > 1000) {
        lastShotAt = st.mtimeMs;
        jpeg = fs.readFileSync(CAM_FILE);
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
every(TL_EVERY, () => pushTimelapses().catch((e) => log("timelapse error:", e.message)));

log(`agent running - printer ${host} - updating every ${STATUS_EVERY / 1000}s`);
process.on("SIGINT", () => {
  stopStream();
  if (litByUs) setChamberLight(false);
  upsertStatus({ state: "offline" }).finally(() => process.exit(0));
});
