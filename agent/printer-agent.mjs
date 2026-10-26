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
import os from "node:os";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";
import { makeR2 } from "./r2.mjs";
import { VERSION } from "./version.mjs";
import { HINT } from "./hints.mjs";
import { makeOrderMail } from "./order-mail.mjs";
import { makeYoutube, rtmpOutput, cleanTitle } from "./youtube.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, "config.json");

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`config.json is missing. ${HINT.settings}`);
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

// "It is on the printer now" — once per order, when its job starts (order-mail.mjs).
const tellPrinting = makeOrderMail({ SB, headers: sbHeaders, cfg, log });

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

// The order number, wherever the printer happens to carry it. Bambu Studio's
// "Send print job" name renames the uploaded FILE (UNIT3D-91872.3mf), but the
// printer's subtask_name can still be the plate/model name from MakerWorld
// ("Chill_Cat_-_Phone_Holder"). So the ref is looked for in every name-like
// field first, and only then do we fall back to the subtask name.
const ORDER_REF = /UNIT3D-\d{3,}/i;
const orderRef = (p) => {
  for (const v of [p.subtask_name, p.gcode_file, p.file, p.url]) {
    const m = typeof v === "string" ? v.match(ORDER_REF) : null;
    if (m) return m[0].toUpperCase();
  }
  return "";
};

const jobName = () => {
  const p = last.print ?? {};
  const ref = orderRef(p);
  if (ref) return ref;
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
    log(`  then ${HINT.start}`);
  }
});
client.on("reconnect", () => log("reconnecting..."));

// ─── A new access code, pasted from the site ─────────────────────────────────
// The printer's LAN access code changes (a reset, a firmware update), and the
// agent then cannot connect at all — and fixing it meant sitting at the Pi.
// /admin → "מדפסת" writes the new code to shop_settings ("printer_access_code");
// the agent reads it every minute (the service key reads the private table),
// saves it to config.json, and restarts: systemd brings it back with the new
// code, and every connection — MQTT, camera, FTPS — uses it from there.
async function checkRemoteAccessCode() {
  try {
    const res = await fetch(`${SB}/rest/v1/shop_settings?key=eq.printer_access_code&select=value`, { headers: sbHeaders, cache: "no-store" });
    if (!res.ok) return;
    const v = (await res.json())[0]?.value;
    const code = String((v && typeof v === "object" ? v.code : v) ?? "").trim();
    if (!code || code === accessCode || !/^[A-Za-z0-9]{6,16}$/.test(code)) return;
    const next = { ...cfg, printer: { ...cfg.printer, accessCode: code } };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
    log("a new printer access code arrived from the site - saved, restarting with it");
    process.exit(1);
  } catch (e) {
    log("access code check failed:", e.message);
  }
}
setTimeout(checkRemoteAccessCode, 5_000);
setInterval(checkRemoteAccessCode, 60_000);

// ─── Where this agent runs ───────────────────────────────────────────────────
// On 22.10 nobody could find the Pi: it was writing to the site, but its
// address was written down nowhere. The agent now says it itself — device
// name, LAN address, platform and version — and /admin → "מדפסת" shows it.
// Kept in shop_settings (private), not in printer_status (public).
async function reportWhereIAm() {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  try {
    await fetch(`${SB}/rest/v1/shop_settings?on_conflict=key`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        key: "agent_info",
        value: { host: os.hostname(), ips, platform: `${os.platform()} ${os.arch()}`, user: os.userInfo().username, dir: HERE, version: VERSION, printer: host, at: new Date().toISOString() },
      }),
    });
  } catch { /* the next round tries again */ }
}
setTimeout(reportWhereIAm, 10_000);
setInterval(reportWhereIAm, 10 * 60_000);

// ─── YouTube Live ─────────────────────────────────────────────────────────────
// While printing, the live encoder also sends its picture to YouTube (stream
// key), and the broadcast is titled after the print (OAuth). See youtube.mjs.
//
// Set up from /admin → "מדפסת": the stream key and the OAuth client are written
// to shop_settings ("youtube_setup"), picked up here within a minute, moved into
// config.json, and wiped from the database — only "received at" stays there.
// What the agent has to say back (the sign-in code, "live as …") goes to
// "youtube_status".
function saveConfig(next) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  for (const k of Object.keys(cfg)) delete cfg[k];
  Object.assign(cfg, next);
}

async function setSetting(key, value) {
  await fetch(`${SB}/rest/v1/shop_settings?on_conflict=key`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, value: { ...value, at: new Date().toISOString() } }),
  }).catch(() => {});
}

const youtube = makeYoutube({ cfg, saveConfig, report: (v) => setSetting("youtube_status", v), log });
const ytKey = () => (cfg.youtube?.enabled === false ? "" : cfg.youtube?.streamKey || "");

async function checkRemoteYoutube() {
  try {
    const res = await fetch(`${SB}/rest/v1/shop_settings?key=eq.youtube_setup&select=value`, { headers: sbHeaders, cache: "no-store" });
    if (!res.ok) return;
    const v = (await res.json())[0]?.value;
    if (!v || typeof v !== "object" || v.received) return;
    const before = cfg.youtube ?? {};
    let next;
    if (v.clear) {
      next = {};
      log("youtube: disconnected from the site");
    } else {
      next = { ...before };
      for (const k of ["streamKey", "clientId", "clientSecret", "titleTemplate", "descriptionTemplate"]) {
        if (typeof v[k] === "string" && v[k].trim()) next[k] = v[k].trim();
      }
      if (typeof v.enabled === "boolean") next.enabled = v.enabled;
      // A different OAuth client cannot use the old client's sign-in.
      if (next.clientId !== before.clientId) next.refreshToken = "";
      log("youtube: new settings arrived from the site - saved");
    }
    // Status first: the sign-in loop starts the moment the client is saved, and
    // its "type this code" must not be overwritten by this line.
    await setSetting("youtube_status", {
      state: !next.streamKey ? "off" : next.clientId && !next.refreshToken ? "signing-in" : next.clientId ? "connected" : "key-only",
    });
    saveConfig({ ...cfg, youtube: next });
    // The secrets now live on this machine only.
    await setSetting("youtube_setup", { received: true, hasKey: !!next.streamKey, hasClient: !!next.clientId });
    // A running encoder was started without (or with the old) key.
    if (hls && ytKey() !== hlsYtKey) stopLive();
  } catch (e) {
    log("youtube settings check failed:", e.message);
  }
}
setTimeout(checkRemoteYoutube, 8_000);
setInterval(checkRemoteYoutube, 60_000);
setInterval(() => { youtube.signInIfNeeded().catch((e) => log("youtube sign-in error:", e.message)); }, 5_000);

const pretty = (s) => String(s || "").replace(/UNIT3D-\d+/gi, "").replace(/[_]+/g, " ").replace(/\s+-\s+|\s{2,}/g, " · ").replace(/\s+/g, " ").trim();
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

const DEFAULT_TITLE = "🔴 מדפיסים עכשיו: {name} | Unit 3D";
const DEFAULT_DESCRIPTION = [
  "מה מודפס עכשיו: {name}",
  "מדפסת: {model} · חומר: {filament}",
  "{layers} שכבות · כ-{time} הדפסה",
  "",
  "הלייב משודר אוטומטית בכל פעם שהמדפסת שלנו מדפיסה.",
  "צפו גם באתר: https://unit-3d.com/livestream",
  "מזמינים הדפסה בהתאמה אישית: https://unit-3d.com",
  "",
  "#הדפסתתלתמימד #3DPrinting #Unit3D",
].join("\n");

/** Written once per print, so a countdown does not rename the video every minute. */
let ytText = null;
let ytTextFor = "";
function liveText() {
  const p = last.print ?? {};
  const job = currentKey || jobName();
  if (ytText && ytTextFor === job) return ytText;
  const ref = orderRef(p);
  const name = pretty(p.subtask_name || p.gcode_file?.replace(/\.(gcode|3mf)(\.\d+)?$/i, "").replace(/^.*\//, "")) || (ref ? `הזמנה ${ref}` : "הדפסה");
  const mins = num(p.mc_remaining_time);
  const time = mins == null ? "" : mins >= 60 ? `${Math.floor(mins / 60)} שעות ו-${mins % 60} דקות` : `${mins} דקות`;
  const vars = { name, model, filament: filamentName() || "PLA", layers: String(num(p.total_layer_num) ?? ""), time, ref };
  ytText = {
    title: cleanTitle(fill(cfg.youtube?.titleTemplate || DEFAULT_TITLE, vars)),
    description: fill(cfg.youtube?.descriptionTemplate || DEFAULT_DESCRIPTION, vars).replace(/[<>]/g, "").slice(0, 4900),
  };
  ytTextFor = job;
  return ytText;
}

// ─── Watchdog: a connection that went quiet is a dead one ─────────────────────
// Seen on 22.10: the agent kept writing its status every few seconds for days
// while the printer printed, saying "offline" — the MQTT link had died and the
// client never got a report again. Ask for a full report every minute, and if
// five minutes pass with nothing from the printer, exit: systemd restarts the
// agent (Restart=always) with a fresh connection, which is what fixed it by
// hand. A printer that is really switched off just costs a restart every five
// minutes, which is harmless.
const STARTED = Date.now();
setInterval(() => {
  if (client.connected) {
    client.publish(`device/${serial}/request`, JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }));
  }
  const quiet = Date.now() - (lastSeen || STARTED);
  if (quiet > 5 * 60_000) {
    log(`watchdog: nothing from the printer for ${Math.round(quiet / 60_000)} min (connected: ${client.connected}) - restarting the agent`);
    upsertStatus({ state: "offline" }).finally(() => process.exit(1));
  }
}, 60_000);

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
    void tellPrinting(orderRef(last.print ?? {}));
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
    // The timelapse belongs to the print that just ended, and whether it is
    // worth keeping is decided HERE, where the printer's own verdict is known.
    // A finished print's video goes to the site; a failed or cancelled one is
    // marked dealt-with and never uploaded.
    pullTimelapseAfterPrint(s === "finished");
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
      log(`  ${HINT.ffmpeg} once, then restart the agent.`);
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
    // While the live encoder is running it is already reading the printer and
    // writing this same still, so a second reader here would be competing with
    // it for the one connection the printer gives out — which is exactly the
    // fault that kept video off the air. One of them owns the printer at a
    // time, and while video is up, that is the encoder.
    if (hls) stopStream();
    else {
      startStream();
      watchStream();
    }
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
      log(`  ${HINT.camera} to find out why.`);
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
/** Stamped into this run's segment names so no two runs can share one. */
let runId = "0";
/**
 * Whether there is really something to play.
 *
 * This used to be inferred from "the encoder process exists", which is not the
 * same thing at all: an encoder that connects to nothing runs happily and
 * uploads nothing, and the site was told video was on air. It is set only once
 * a playlist and at least one piece of video have actually reached the bucket.
 */
let liveOnAir = false;
/** Set while the previous broadcast is being cleared out of the bucket. */
let clearing = null;

/**
 * Leave nothing behind from the previous broadcast.
 *
 * The encoder numbers its pieces from zero every time it starts. A new run
 * therefore overwrites some of the old pieces and leaves the rest — and the
 * playlist from the old run is still sitting there too, naming exactly those
 * leftovers. A player that arrives in that moment reads yesterday's playlist,
 * finds yesterday's pieces, and plays them as if they were live.
 *
 * So the bucket is emptied of video before a run starts and after it ends.
 * Only the pieces and the playlist go; the status file must survive, since it
 * is what tells the page there is nothing to watch.
 */
async function clearBroadcast() {
  if (!R2) return;
  try {
    const keys = await R2.list(`${HLS_KEY}/`);
    const doomed = keys.filter((k) => k.endsWith(".ts") || k.endsWith("stream.m3u8"));
    if (!doomed.length) return;
    await Promise.all(doomed.map((k) => R2.remove(k)));
    log(`live: cleared ${doomed.length} leftover file${doomed.length === 1 ? "" : "s"} from the last broadcast`);
  } catch (e) {
    log("live: could not clear the last broadcast -", e.message);
  }
}

/**
 * A broadcast on demand, without waiting for a print.
 *
 * Live video only runs while something is printing, which is right — nobody
 * needs a broadcast of an empty plate. But it also means the only way to find
 * out whether the video WORKS is to start a real print and watch, and every
 * round of that costs filament and an hour. live-test.bat drops a file here
 * and the stream runs for a minute and a half through exactly the same code
 * path a print uses, so what it proves is worth something.
 */
const TEST_FLAG = path.join(HERE, ".live-test");
// Long enough to open the page, wait out the encoder coming up, and actually
// watch: ninety seconds sounds ample and is not, once fifteen of them go on
// starting up and the rest on finding the tab.
const TEST_SECONDS = 180;
let testAnnounced = false;

function testBroadcastWanted() {
  let asked;
  try { asked = Number(fs.readFileSync(TEST_FLAG, "utf8").trim()); } catch { testAnnounced = false; return false; }
  if (Number.isFinite(asked) && Date.now() - asked < TEST_SECONDS * 1000) {
    if (!testAnnounced) { testAnnounced = true; log(`live: test broadcast requested - streaming for ${TEST_SECONDS}s`); }
    return true;
  }
  try { fs.unlinkSync(TEST_FLAG); } catch {}
  if (testAnnounced) { testAnnounced = false; log("live: test broadcast finished"); }
  return false;
}

let hlsYtKey = "";   // the YouTube key the running encoder was started with

function startLive() {
  if ((!R2 && !ytKey() && !social.length) || cfg.live?.enabled === false) return;
  const url = rtspUrl();
  if (!url) return;
  if (hls && hlsStartedFor === url) return;
  if (Date.now() - hlsLastStart < 20_000) return;

  const bin = findFfmpeg();
  if (!bin) {
    if (!hlsWarned) { hlsWarned = true; log("live: ffmpeg is missing, so there is no video stream."); }
    return;
  }

  // Hand the printer over before asking it for a second connection it will not
  // give: the still grabber is reading it right now, and from here the encoder
  // writes that still itself.
  stopStream();

  // Nothing from the previous run may still be reachable when this one starts.
  clearing = clearBroadcast().finally(() => { clearing = null; });

  fs.mkdirSync(HLS_DIR, { recursive: true });
  for (const f of fs.readdirSync(HLS_DIR)) { try { fs.unlinkSync(path.join(HLS_DIR, f)); } catch {} }
  sentSegments = new Set();
  liveOnAir = false;
  hlsLastStart = Date.now();
  runId = Date.now().toString(36);
  hlsStartedFor = url;
  hlsYtKey = ytKey();

  const authed = url.replace(/^rtsps?:\/\//i, (m) => `${m}bblp:${encodeURIComponent(accessCode)}@`);
  // Re-encoding rather than copying the printer's video: it forces a keyframe
  // at the top of every segment, which is what keeps the delay short and the
  // player from stalling. A printer's picture barely moves, so 480p at this
  // bitrate looks the same as the original and costs a fraction to send.
  const copy = cfg.live?.mode === "copy";
  const stillEvery = Math.max(2, Math.round(CAM_EVERY / 1000));
  const args = [
    ...RTSP_IN(authed),
    // The still comes out of THIS connection too.
    //
    // The printer serves one video connection at a time, and until now two
    // were asked for: this encoder, and the separate one that grabs the still
    // picture. The still grabber gets there first and holds it, so the encoder
    // connected to nothing and produced nothing — while the agent, which only
    // checked that the encoder process existed, told the site video was on
    // air. Stills worked, video never did, and nothing said why.
    //
    // One connection, two outputs: the same frames become the still and the
    // video, so they cannot compete for the printer.
    "-vf", `fps=1/${stillEvery}`, "-q:v", "5", "-update", "1", "-y", CAM_FILE,
    ...(copy
      ? ["-c:v", "copy"]
      : ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
         "-vf", "scale=-2:480", "-b:v", "900k", "-maxrate", "1000k", "-bufsize", "1600k",
         "-g", String(SEG_SECONDS * 25), "-keyint_min", String(SEG_SECONDS * 25), "-sc_threshold", "0"]),
    "-an",
    "-f", "hls",
    "-hls_time", String(SEG_SECONDS),
    // A little more slack than the player needs, so a viewer who falls a
    // second behind still finds the piece he is asking for.
    "-hls_list_size", "10",
    "-hls_flags", "delete_segments+independent_segments+temp_file",
    // Every run gets its own name for its pieces.
    //
    // They used to be seg_00000, seg_00001 … starting again from zero on every
    // single run — while being uploaded with "this file never changes, keep it
    // for a year". Both halves are defensible alone and together they are a
    // trap: the next print writes DIFFERENT video to the same names, and the
    // network that serves the bucket keeps handing out the copy it cached from
    // the print before. The playlist was current and the video inside it was
    // from another day. That is the "random old footage".
    //
    // With a run id in the name, a name means one piece of video for ever, and
    // the year-long cache is simply true.
    "-hls_segment_filename", path.join(HLS_DIR, `seg_${runId}_%05d.ts`),
    path.join(HLS_DIR, "stream.m3u8"),
  ];
  // YouTube rides on the same encode: one picture, two destinations, through
  // ffmpeg's tee. YouTube wants an audio track, so a silent one is made up for
  // it (the site's pieces stay video-only), and onfail=ignore means a refused
  // or dropped YouTube connection never takes the site's video down with it.
  // Relative names because the tee spec splits on ':' — a Windows path has one.
  if (hlsYtKey) {
    const at = args.indexOf("-an");
    const hlsOpts = [
      `hls_time=${SEG_SECONDS}`, "hls_list_size=10",
      "hls_flags=delete_segments+independent_segments+temp_file",
      `hls_segment_filename=seg_${runId}_%05d.ts`,
    ].join(":");
    args.splice(at, args.length - at,
      "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "64k", "-flags", "+global_header",
      "-f", "tee", `[select=v:f=hls:${hlsOpts}]stream.m3u8|[f=flv:onfail=ignore]${rtmpOutput(hlsYtKey)}`);
    // The silent track is a second input; it has to come right after the printer.
    const firstOut = args.indexOf("-vf");
    args.splice(firstOut, 0, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo");
  }

  hls = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"], cwd: HLS_DIR });
  // Only the FIRST chunk of output used to be printed, and the first thing
  // ffmpeg says is never the problem — so the line that mattered was the one
  // line that never appeared. A handful is enough to diagnose and few enough
  // not to bury the window.
  let saidTimes = 0;
  hls.stderr?.on("data", (d) => {
    if (saidTimes >= 5) return;
    const text = String(d).replace(/rtsps?:\/\/[^\s]+/gi, "rtsps://<printer>").replace(/rtmps?:\/\/[^\s\]|]+/gi, "rtmp://<youtube>").trim();
    if (!text) return;
    saidTimes++;
    log("live:", text.slice(0, 200));
  });
  hls.on("exit", () => { hls = null; hlsStartedFor = ""; liveOnAir = false; });
  log(`live: streaming to the site in ${SEG_SECONDS}s pieces${hlsYtKey ? " and to YouTube" : ""}`);
}

function stopLive() {
  if (hls) { try { hls.kill(); } catch {} hls = null; }
  hlsStartedFor = "";
  liveOnAir = false;
  // A finished broadcast must not stay playable. The page is told there is no
  // video, but a page already open would happily keep reading the playlist.
  void clearBroadcast();
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
  // Never upload into a bucket that is still being emptied — the delete would
  // take the new piece with it.
  if (clearing) await clearing;
  if (!hls) return;
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
  // A playlist naming pieces that are in the bucket is the whole definition of
  // "there is video to watch".
  liveOnAir = named.size > 0 && sentSegments.size > 0;

  // Anything ffmpeg has rolled off is no longer playable; take it out of the
  // bucket so a print does not leave a trail behind it.
  for (const name of [...sentSegments]) {
    if (named.has(name)) continue;
    sentSegments.delete(name);
    void R2.remove(`${HLS_KEY}/${name}`);
  }
}

/**
 * Tell the page whether video is worth asking for, without a database column.
 *
 * It now also carries WHY, when the answer is no. Every reason the stream does
 * not run is knowable here and nowhere else — the browser can only observe that
 * no video arrived — and three of them used to return from `startLive` without
 * a single line of output, so a printer that was mid-print with the camera on
 * simply showed stills forever and said nothing about it.
 */
async function pushLiveFlag(live, why) {
  if (!R2) return;
  const body = Buffer.from(JSON.stringify({
    live,
    ...(live ? {} : { why: why || "unknown" }),
    agent: VERSION,
    segment_seconds: SEG_SECONDS,
    updated_at: new Date().toISOString(),
  }));
  await R2.put(`${HLS_KEY}/status.json`, body, "application/json", "no-cache, max-age=0");
}

/** null = not checked yet or unanswerable; false = the browser will be refused. */
let corsOk = null;

/** In one word, what is stopping the video. */
function liveBlocker() {
  if (!R2) return "r2-not-configured";
  if (cfg.live?.enabled === false) return "disabled-in-config";
  // Before anything about the printer: a stream the site is not allowed to
  // read cannot play no matter how well everything else works, and it is the
  // one fault that looks like success from every other angle.
  if (corsOk === false) return "cors-blocked";
  if (state() !== "printing") return "not-printing";
  if (!rtspUrl()) return "printer-offers-no-stream";
  if (!findFfmpeg()) return "ffmpeg-missing";
  if (!hls) return "encoder-not-started";
  if (!liveOnAir) return "no-video-from-printer";
  return "";
}

// English on purpose. These go to a Windows console window, which draws Hebrew
// as a row of empty boxes even with the code page set — so the one line that
// explains what is wrong was the one line nobody could read. The Hebrew lives
// on the site, where it renders.
const BLOCKER_TEXT = {
  "r2-not-configured": "no Cloudflare settings in config.json - the video has nowhere to go",
  "cors-blocked": "the bucket does not let the site read it - set its CORS policy (start.bat prints what to paste)",
  "disabled-in-config": "live.enabled is false in config.json",
  "not-printing": "the printer is not printing right now",
  "printer-offers-no-stream": "the printer is not offering a stream - it needs LAN Only + Liveview + Developer Mode",
  "ffmpeg-missing": "ffmpeg is not installed - run ffmpeg-install.bat once",
  "encoder-not-started": "ffmpeg has not come up yet",
  "no-video-from-printer": "ffmpeg is running but the printer is sending it no video - nothing has reached the bucket",
};

/**
 * Let the site's browser read the stream.
 *
 * A bucket serves its files to anyone who types the address, and refuses every
 * one of them to a page's JavaScript unless it says which sites may read it.
 * The video player IS JavaScript, so without this the stream uploads perfectly,
 * serves perfectly, and never plays: the browser discards the response before
 * the player ever sees it, without an error anyone can catch.
 *
 * It is a bucket setting, not a file setting, so it is set once and checked on
 * every start — cheap, and it survives someone recreating the bucket.
 */
const LIVE_ORIGINS = cfg.live?.allowOrigins ?? [
  "https://unit-3d.com",
  "https://www.unit-3d.com",
  "http://localhost:3000",
];

const PUBLIC_URL = (cfg.live?.publicUrl || "https://live.unit-3d.com").replace(/\/$/, "");

/**
 * Ask the way the page asks.
 *
 * Setting the policy and believing it worked is how this went wrong once
 * already. The only answer worth having is the one a browser would get, so
 * this uploads a tiny file, fetches it back with the site's address attached,
 * and looks for the permission coming home. `null` means the question could
 * not be put — not that the answer was no.
 */
async function corsAllowsSite() {
  if (!R2) return null;
  const key = "live/.cors-probe.txt";
  const up = await R2.put(key, Buffer.from("ok"), "text/plain", "no-cache, max-age=0").catch(() => null);
  if (!up?.ok) return null;
  const res = await fetch(`${PUBLIC_URL}/${key}?t=${Date.now()}`, {
    headers: { Origin: LIVE_ORIGINS[0] },
    cache: "no-store",
  }).catch(() => null);
  void R2.remove(key);
  if (!res?.ok) return null;
  const allow = res.headers.get("access-control-allow-origin") || "";
  return allow === "*" || allow === LIVE_ORIGINS[0];
}

async function ensureLiveCors() {
  if (!R2 || cfg.live?.enabled === false) return;

  const before = await corsAllowsSite();
  if (before === true) {
    corsOk = true;
    log("live video: the site is allowed to read the stream (CORS ok)");
    return;
  }

  const set = await R2.setCors(LIVE_ORIGINS).catch((e) => ({ ok: false, status: 0, text: e.message }));
  if (set.ok) {
    // Cloudflare takes a moment to apply it, and a policy that was written but
    // does not work is exactly the case worth catching.
    await new Promise((r) => setTimeout(r, 4000));
    corsOk = await corsAllowsSite();
    if (corsOk === true) {
      log("live video: opened the bucket to the site - the browser can play it now (CORS set)");
      return;
    }
    log("live video: the CORS policy was written but the browser is still refused - give it a minute and restart, or set it by hand:");
  } else {
    // The upload token may not be allowed to change bucket settings.
    corsOk = before === false ? false : null;
    log(`live video: could not set CORS on the bucket (${set.status || "no answer"}) - the video will NOT play in a browser until this is set.`);
    log("  fix it once by hand: Cloudflare > R2 > your bucket > Settings > CORS Policy > Edit, and paste:");
  }
  log(`  ${JSON.stringify([{ AllowedOrigins: LIVE_ORIGINS, AllowedMethods: ["GET", "HEAD"], AllowedHeaders: ["*"], MaxAgeSeconds: 3600 }])}`);
}

// ─── Instagram and TikTok: one key per broadcast ─────────────────────────────
// Neither gives a stream key that stays the same, or a way to start a live from
// software: the key is made when the owner presses "Live" and is good for that
// broadcast only. So this half cannot be automatic, only quick:
//
//   1. a print starts → a phone notification (ntfy) says so;
//   2. the owner opens a live on instagram.com, pastes URL + key in /admin;
//   3. within seconds this streams to it — vertical, 9:16 — and the owner
//      presses "Go live" there;
//   4. the print ends → this stops, and the key is forgotten.
//
// It reads the encoder's own local pieces rather than the printer: the printer
// gives one video connection, and the encoder (site + YouTube) already has it.
// A few seconds of extra delay, and nothing that already works is touched.
const TARGETS_KEY = "live_targets";
let social = [];                 // [{ platform, url }] — in memory only, never in config.json
const socialProcs = new Map();   // platform → { proc, started }
const socialWhy = {};            // platform → what happened last, for /admin

const joinKey = (url, key) => {
  const u = String(url || "").trim();
  const k = String(key || "").trim();
  if (!k) return u;
  return u.endsWith("/") ? u + k : `${u}/${k}`;
};

async function checkSocialTargets() {
  try {
    const res = await fetch(`${SB}/rest/v1/shop_settings?key=eq.${TARGETS_KEY}&select=value`, { headers: sbHeaders, cache: "no-store" });
    if (!res.ok) return;
    const v = (await res.json())[0]?.value;
    if (!v || typeof v !== "object" || v.received) return;
    const next = (Array.isArray(v.targets) ? v.targets : [])
      .filter((t) => t && /^rtmps?:\/\//i.test(String(t.url || "").trim()))
      .map((t) => ({ platform: String(t.platform || "other").replace(/[^a-z]/gi, "").slice(0, 16) || "other", url: joinKey(t.url, t.key) }));
    stopSocial();
    social = next;
    for (const t of social) socialWhy[t.platform] = "waiting";
    // The key is good for one broadcast and lives only in this process now.
    await setSetting(TARGETS_KEY, { received: true, platforms: social.map((t) => t.platform) });
    log(social.length ? `social live: got a key for ${social.map((t) => t.platform).join(", ")}` : "social live: cleared from the site");
    void reportLiveNow();
  } catch (e) {
    log("social live check failed:", e.message);
  }
}
setInterval(checkSocialTargets, 8_000);

function stopSocial() {
  for (const [, p] of socialProcs) { try { p.proc.kill(); } catch {} }
  socialProcs.clear();
}

/** 9:16 with the whole picture in the middle and a blurred copy behind it. */
const VERTICAL = "[0:v]split=2[a][b];[a]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:2[bg];[b]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]";

function socialTick(on) {
  const playlist = path.join(HLS_DIR, "stream.m3u8");
  if (!on || !social.length || !hls || !fs.existsSync(playlist)) {
    if (socialProcs.size) stopSocial();
    return;
  }
  const bin = findFfmpeg();
  if (!bin) return;
  for (const t of social) {
    const running = socialProcs.get(t.platform);
    if (running?.proc) continue;
    if (running && Date.now() - running.started < 15_000) continue;
    const args = [
      "-nostdin", "-loglevel", "error",
      "-re", "-i", playlist,
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-filter_complex", VERTICAL,
      "-map", "[v]", "-map", "1:a:0",
      "-c:v", "libx264", "-preset", "veryfast", "-b:v", "2000k", "-maxrate", "2500k", "-bufsize", "4000k",
      "-g", "50", "-keyint_min", "50", "-r", "25",
      "-c:a", "aac", "-b:a", "96k", "-ar", "44100",
      "-f", "flv", t.url,
    ];
    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    const entry = { proc, started: Date.now() };
    socialProcs.set(t.platform, entry);
    socialWhy[t.platform] = "streaming";
    let said = 0;
    proc.stderr?.on("data", (d) => {
      if (said++ >= 3) return;
      const text = String(d).replace(/rtmps?:\/\/[^\s]+/gi, "rtmp://<target>").trim();
      if (text) { log(`${t.platform}:`, text.slice(0, 200)); socialWhy[t.platform] = text.slice(0, 120); }
    });
    proc.on("exit", (code) => {
      entry.proc = null;
      if (code && socialWhy[t.platform] === "streaming") socialWhy[t.platform] = `stopped (${code})`;
      void reportLiveNow();
    });
    log(`${t.platform}: streaming (vertical 720x1280)`);
    void reportLiveNow();
  }
}

// ─── "A print started" ───────────────────────────────────────────────────────
// A phone notification through ntfy (free app, no account): the topic is made
// up once and kept in config.json, and /admin shows which one to subscribe to.
if (!cfg.notify?.ntfyTopic) {
  saveConfig({ ...cfg, notify: { ...(cfg.notify ?? {}), ntfyTopic: `unit3d-${Math.random().toString(36).slice(2, 12)}` } });
}

async function notifyPrintStarted(title) {
  const topic = cfg.notify?.ntfyTopic;
  if (!topic || cfg.notify?.enabled === false) return;
  try {
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: "התחילה הדפסה",
        message: `${title}\nאפשר לעלות לייב באינסטגרם — מדביקים את המפתח באדמין.`,
        click: `${(cfg.site || "https://unit-3d.com").replace(/\/$/, "")}/admin`,
        tags: ["printer"],
      }),
    });
  } catch { /* a missed notification is not worth a crash */ }
}

/** What /admin needs to help with a manual live: the ready title, the topic, and what is streaming. */
async function reportLiveNow() {
  const printing = state() === "printing";
  const text = printing ? liveText() : null;
  await setSetting("live_now", {
    printing,
    title: text?.title ?? null,
    description: text?.description ?? null,
    topic: cfg.notify?.ntfyTopic ?? null,
    social: Object.fromEntries(social.map((t) => [t.platform, socialProcs.get(t.platform)?.proc ? "streaming" : socialWhy[t.platform] || "waiting"])),
  });
}

let printingBefore = false;
async function printStartWatch() {
  const now = state() === "printing";
  if (now && !printingBefore) {
    printingBefore = true;
    // The name settles a moment after RUNNING; give it a breath.
    setTimeout(() => {
      void notifyPrintStarted(liveText().title);
      void reportLiveNow();
    }, 15_000);
  } else if (!now && printingBefore && state() !== "paused") {
    printingBefore = false;
    if (social.length) {
      log("social live: the print ended - stopping, and forgetting the key");
      stopSocial();
      social = [];
      await setSetting(TARGETS_KEY, { received: true, ended: true, platforms: [] });
    }
    void reportLiveNow();
  }
}
setInterval(() => { printStartWatch().catch(() => {}); }, 3_000);
setTimeout(() => { reportLiveNow().catch(() => {}); }, 12_000);

let wasLive = false;
let lastWhy = null;
async function liveTick() {
  // The two outermost gates used to return here in silence, which is how a
  // machine with no R2 keys looked identical to one that was working.
  if ((!R2 && !ytKey() && !social.length) || cfg.live?.enabled === false) {
    const why = liveBlocker();
    if (why !== lastWhy) { lastWhy = why; log(`live: no video - ${BLOCKER_TEXT[why] || why}`); }
    return;
  }
  const shouldStream = (state() === "printing" || testBroadcastWanted()) && !!rtspUrl();
  if (shouldStream) {
    startLive();
    await pushLive();
    if (hls && hlsYtKey && state() === "printing") void youtube.setLiveText(liveText()).catch((e) => log("youtube error:", e.message));
  } else if (hls) {
    stopLive();
    youtube.forget();
  }
  socialTick(shouldStream);
  // A stream the site is not allowed to read is not a stream from the site's
  // point of view, so it is reported as no video WITH the reason, rather than
  // as working video the page then fails to play for reasons of its own.
  const nowLive = shouldStream && !!hls && liveOnAir && corsOk !== false;
  const why = nowLive ? "" : liveBlocker();
  if (nowLive !== wasLive || why !== lastWhy) {
    wasLive = nowLive;
    lastWhy = why;
    await pushLiveFlag(nowLive, why);
    if (nowLive) {
      log("live: the stream is on the site");
      // During a test the whole point is to be looking at the right moment, so
      // say the moment out loud rather than leaving it to be worked out.
      if (testAnnounced) log("live: >>> VIDEO IS ON AIR NOW - open https://unit-3d.com/livestream <<<");
    } else {
      log(`live: no video - ${BLOCKER_TEXT[why] || why}`);
    }
  }
}

// ─── Timelapses ───────────────────────────────────────────────────────────────
// Every timelapse the printer records stays on the microSD card inside it, and
// that card is served over FTPS. This used to fail: the printer would close the
// data connection immediately, and the conclusion drawn was that it refuses
// third-party transfer at all. It does not — it requires the data connection to
// resume the control connection's TLS session, which the library in use could
// not do. ftps.mjs does, so the card is readable after all.
//
// In LAN Only mode this is the ONLY way to reach them: the phone app and the
// cloud cannot see the printer any more, so if the agent does not fetch them,
// nothing does, and the card eventually overwrites the oldest.
/**
 * Which videos have been dealt with, and where "new" starts.
 *
 * Two facts, kept on disk next to the agent, because both were in memory and
 * both were lost on every restart:
 *
 *   done    the file names already on the site. This used to be a Set that
 *           started empty, so a restart re-downloaded and re-uploaded the whole
 *           card. The database row was deduplicated by `on_conflict=file` and
 *           looked fine — the waste was invisible, and it was several MB per
 *           file per restart.
 *
 *   cutoff  the newest file this agent has decided about. It used to be a
 *           gate as well -- "anything older is settled" -- and that gate is
 *           what lost prints. It compared the card's listing times, which
 *           are minute-precision, in the printer's zone, with a year guessed
 *           from THIS machine's clock (see parseList in ftps.mjs): a clip the
 *           printer stamped later than the agent's own clock is dated a year
 *           back, lands under the cutoff, and is never offered again. Nothing
 *           in the log says so, because it was "settled". The set of names is
 *           the record now; the cutoff is only written, for older state files.
 */
const STATE_FILE = path.join(HERE, "timelapse-state.json");

function readState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return { done: new Set(j.done ?? []), cutoff: Number(j.cutoff) || 0 };
  } catch {
    return { done: new Set(), cutoff: 0 };
  }
}

function writeState(st) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ done: [...st.done], cutoff: st.cutoff }, null, 2));
  } catch (e) {
    log("timelapse: could not save its own notes -", e instanceof Error ? e.message : String(e));
  }
}

const tlState = readState();
let timelapseFails = 0;

/**
 * What the site already holds, asked once at startup.
 *
 * The local file is the fast path; this is what makes a fresh install, or a
 * machine whose notes were deleted, not re-upload everything the site has had
 * for months.
 */
async function seedFromSite() {
  try {
    const res = await fetch(`${SB}/rest/v1/printer_timelapses?select=file`, { headers: sbHeaders, cache: "no-store" });
    if (!res.ok) return;
    for (const row of await res.json()) tlState.done.add(row.file);
    writeState(tlState);
  } catch { /* the local notes are enough to work with */ }
}

/**
 * Fetch the timelapses for a print that JUST SUCCEEDED.
 *
 * `keep` false means the opposite: the print failed or was cancelled, so its
 * video is marked as dealt with and never uploaded. That is the whole of "only
 * successful prints" — the file name is a timestamp and says nothing about how
 * the print went, so the only thing that knows is the printer's own state at
 * the moment it stopped, which is what calls this.
 *
 * Runs on the finish, not on a clock. The slow loop is still there as a safety
 * net for a finish the agent was not awake to see.
 */
async function pushTimelapses(keep = true) {
  if (cfg.timelapse?.enabled === false) return;
  const { connectPrinterFtps, recordedAt } = await import("./ftps.mjs");
  let ftp;
  try {
    ftp = await connectPrinterFtps({ host, password: accessCode });
    const dir = cfg.timelapse?.folder || "/timelapse";
    // Ordered by the time in each clip's own name, which is the printer's
    // clock at second precision -- not the listing time, which is neither.
    const files = (await ftp.list(dir))
      .filter((f) => /\.(mp4|avi)$/i.test(f.name) && f.size > 100_000)
      .map((f) => ({ ...f, at: recordedAt(f.name, f.modifiedAt) }))
      .sort((a, b) => a.at - b.at);

    // New means "not on the site and not already ruled out", by name. No
    // time-based gate: a name is either in the set or it is not.
    const fresh = files.filter((f) => !tlState.done.has(f.name));
    if (!fresh.length) return;
    log(`timelapse: card holds ${files.length}, ${fresh.length} not on the site yet`);

    if (!keep) {
      // The print that just failed made the NEWEST clip on the card. That one
      // is settled without being fetched, so the safety-net loop does not put
      // a failure on the website. Only that one: anything older that is still
      // waiting belonged to a print this agent never ruled on, and the loop
      // will fetch it as a success -- which is what an unknown outcome gets.
      const failed = fresh[fresh.length - 1];
      tlState.done.add(failed.name);
      tlState.cutoff = Math.max(tlState.cutoff, +failed.at);
      writeState(tlState);
      log(`timelapse: ${failed.name} is from a print that did not finish - not uploaded`);
      return;
    }

    // Oldest first, a few at a time: a card with a year of prints on it should
    // not turn the first run into an hour-long upload.
    for (const f of fresh.slice(0, cfg.timelapse?.perRun ?? 4)) {
      const body = await ftp.download(`${dir}/${f.name}`);
      if (!body || body.length < 100_000) { log("timelapse: came back empty -", f.name); continue; }
      const ok = await upload("printer", `timelapse/${f.name}`, body, "video/mp4");
      if (!ok) continue;
      tlState.done.add(f.name);
      tlState.cutoff = Math.max(tlState.cutoff, +f.at);
      writeState(tlState);
      await fetch(`${SB}/rest/v1/printer_timelapses?on_conflict=file`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          file: f.name,
          url: `${SB}/storage/v1/object/public/printer/timelapse/${encodeURIComponent(f.name)}`,
          size_mb: Math.round((body.length / 1048576) * 10) / 10,
          recorded_at: f.at.toISOString(),
        }),
      });
      log(`timelapse saved: ${f.name} (${Math.round(body.length / 1048576)} MB)`);
    }
    timelapseFails = 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Say it the first time and then rarely: this runs on a slow loop, and a
    // printer that is simply asleep should not fill the window with red.
    if (++timelapseFails === 1 || timelapseFails % 12 === 0) {
      log("timelapse: could not read the printer's card -", msg);
      if (timelapseFails === 1) log("  (everything else keeps working. it will try again.)");
    }
  } finally {
    ftp?.close();
  }
}

/**
 * The printer needs a moment after FINISH to close the file it was writing.
 *
 * Asking immediately gets a half-written video or no file at all, so the pull
 * waits. Two minutes is comfortably past the write and still soon enough that
 * the video is on the site while the print is on the bed.
 */
function pullTimelapseAfterPrint(keep) {
  setTimeout(() => {
    pushTimelapses(keep).catch((e) => log("timelapse error:", e.message));
  }, (cfg.timelapse?.afterPrintSeconds ?? 120) * 1000);
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
// A safety net, not the trigger. The print's own finish is what fetches its
// timelapse (see watchFinish); this catches a finish the agent was asleep for —
// a restart mid-print, a network drop — and it only ever KEEPS, because by the
// time it runs the printer's verdict for that job is long gone. The cutoff in
// timelapse-state.json is what stops it re-offering a failure it already
// decided about.
setInterval(() => pushTimelapses(true).catch((e) => log("timelapse error:", e.message)), TL_EVERY);
void seedFromSite();
// Cheap, and it means a policy fixed in the dashboard is noticed on its own
// rather than needing the agent restarted to be believed.
// setInterval, not every(): every() fires straight away, which ran this a
// second time on top of the startup check and said the same thing twice.
setInterval(() => {
  if (corsOk !== true) void ensureLiveCors().catch(() => {});
}, 10 * 60 * 1000);

// ─── Keeping itself current (Pi) ────────────────────────────────────────────
// The Pi installs from a git clone and then ran that code forever: every agent
// fix waited for someone to log into it. Under systemd (which restarts it),
// and only while idle — never mid-print — it pulls main twice a day and exits
// when its own files changed, so the service comes back up on the new code.
// On Windows nothing restarts a stopped agent, so there it never does this.
function selfUpdate() {
  if (!process.env.INVOCATION_ID) return;                 // not under systemd
  const repo = path.resolve(HERE, "..");
  if (!fs.existsSync(path.join(repo, ".git"))) return;
  if (state() === "printing" || state() === "paused") return;
  const before = spawnSync("git", ["-C", repo, "rev-parse", "HEAD:agent"], { encoding: "utf8" }).stdout.trim();
  const pull = spawnSync("git", ["-C", repo, "pull", "--ff-only", "--quiet"], { encoding: "utf8", timeout: 120_000 });
  if (pull.status !== 0) { log("self-update: git pull failed:", (pull.stderr || "").trim().slice(0, 200)); return; }
  const after = spawnSync("git", ["-C", repo, "rev-parse", "HEAD:agent"], { encoding: "utf8" }).stdout.trim();
  if (before && after && before !== after) {
    log("self-update: new agent code pulled - restarting on it");
    setTimeout(() => process.exit(0), 1500);
  }
}
setTimeout(selfUpdate, 60_000);
setInterval(selfUpdate, 12 * 60 * 60 * 1000);

log(`agent ${VERSION} running - printer ${host} - updating every ${STATUS_EVERY / 1000}s`);

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
  log("  to check the setup:        double-click live-check.bat");
  log("  to SEE it without a print: double-click live-test.bat (3 minutes)");
  void ensureLiveCors().catch((e) => log("live video: CORS check failed -", e.message));
}
process.on("SIGINT", () => {
  stopStream();
  stopLive();
  if (R2) void pushLiveFlag(false);
  if (litByUs) setChamberLight(false);
  upsertStatus({ state: "offline" }).finally(() => process.exit(0));
});
