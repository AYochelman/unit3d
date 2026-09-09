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

const STATUS_EVERY = (cfg.statusEverySeconds ?? 5) * 1000;
const CAM_EVERY = (cfg.camera?.everySeconds ?? 15) * 1000;
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

// ─── The chamber camera ───────────────────────────────────────────────────────
// P-series printers hand out single JPEG frames over a TLS socket on port 6000
// after an 80-byte login. One frame every few seconds is all a web page needs,
// and it costs the printer nothing to give.
function grabFrame() {
  return new Promise((resolve) => {
    const auth = Buffer.alloc(80);
    auth.writeUInt32LE(0x40, 0);
    auth.writeUInt32LE(0x3000, 4);
    auth.write("bblp", 16, 32, "ascii");
    auth.write(accessCode, 48, 32, "ascii");

    let chunks = Buffer.alloc(0);
    let expect = 0;
    const done = (v) => { try { sock.destroy(); } catch {} resolve(v); };

    const sock = tls.connect({ host, port: 6000, rejectUnauthorized: false, timeout: 8000 }, () => sock.write(auth));
    sock.on("data", (d) => {
      chunks = Buffer.concat([chunks, d]);
      if (!expect && chunks.length >= 16) {
        expect = chunks.readUInt32LE(0);
        chunks = chunks.subarray(16);
      }
      if (expect && chunks.length >= expect) done(chunks.subarray(0, expect));
    });
    sock.on("error", () => done(null));
    sock.on("timeout", () => done(null));
  });
}

async function pushCamera() {
  if (cfg.camera?.enabled === false) return;
  const jpeg = await grabFrame();
  if (!jpeg || jpeg.length < 1000) return;
  await upload("printer", "live.jpg", jpeg, "image/jpeg");
}

// ─── Timelapses ───────────────────────────────────────────────────────────────
// The printer writes them to its own card; FTPS over the LAN is how they come
// off it. Only new files are uploaded, and only when they have stopped growing.
const seen = new Set();
async function pushTimelapses() {
  if (cfg.timelapse?.enabled === false) return;
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
    log("timelapse failed:", e.message);
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
process.on("SIGINT", () => { upsertStatus({ state: "offline" }).finally(() => process.exit(0)); });
