/**
 * What is actually failing, layer by layer.
 *
 * "It doesn't run" can mean five different things, and the agent's own log only
 * shows the first one that breaks. This walks the whole path once — network,
 * printer, credentials, database, storage — and says which step said no, in a
 * sentence that names the switch or the field to change.
 *
 *   node check.mjs        (or double-click check.bat)
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "config.json");

const ok = (m, extra = "") => console.log(`  [ ok ]  ${m}${extra ? `  ${extra}` : ""}`);
const bad = (m, hint = "") => { console.log(`  [FAIL]  ${m}`); if (hint) console.log(`          ${hint}`); };

if (!fs.existsSync(FILE)) {
  bad("config.json is missing", "run settings.bat first");
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(FILE, "utf8"));
const { host, serial, accessCode } = cfg.printer ?? {};
const SB = (cfg.supabase?.url ?? "").replace(/\/$/, "");
const KEY = cfg.supabase?.serviceKey ?? "";

console.log("\n  Unit 3D · checking the setup\n");
console.log(`  printer ${host}   serial ${serial}   code ${String(accessCode).slice(0, 2)}******`);
console.log(`  database ${SB}\n`);

/** Can something answer on that port at all? */
function port(p, ms = 4000) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port: p });
    const end = (v) => { try { s.destroy(); } catch { /* gone */ } resolve(v); };
    s.setTimeout(ms);
    s.on("connect", () => end(true));
    s.on("timeout", () => end(false));
    s.on("error", () => end(false));
  });
}

const mqttOpen = await port(8883);
if (mqttOpen) ok("printer answers on the network", `(${host}:8883)`);
else bad("no answer from the printer", "wrong IP, printer asleep, or a different network. check the LAN screen.");

/** Does it accept our user and code, or hang up? */
function mqttCheck() {
  return new Promise((resolve) => {
    const c = mqtt.connect(`mqtts://${host}:8883`, {
      username: "bblp", password: accessCode,
      rejectUnauthorized: false, reconnectPeriod: 0, connectTimeout: 8000,
    });
    const end = (v) => { try { c.end(true); } catch { /* gone */ } resolve(v); };
    c.on("connect", () => end("ok"));
    c.on("error", (e) => end(e.message || "error"));
    c.on("close", () => end("closed"));
    setTimeout(() => end("timeout"), 10000);
  });
}

if (mqttOpen) {
  const r = await mqttCheck();
  if (r === "ok") ok("the printer accepted the access code");
  else if (/FIN|closed|ECONNRESET|EPROTO/i.test(r)) {
    bad("the printer closed the connection", "Settings > LAN Only: turn ON 'Developer Mode'. if it is already on, the access code on that screen may have changed - run settings.bat and retype it.");
  } else if (/auth|Not authorized|Connection refused/i.test(r)) {
    bad("the access code was refused", "read it again from the printer's LAN screen and run settings.bat.");
  } else {
    bad(`the printer did not accept the connection (${r})`, "try turning the printer off and on once.");
  }
}

/** The camera port is separate, and only opens in LAN Liveview. */
if (cfg.camera?.enabled !== false) {
  const camOpen = await port(6000, 3000);
  if (camOpen) ok("the camera port is open", "(6000)");
  else bad("the camera port is closed", "Settings > LAN Only: turn ON 'LAN Only Liveview'. data still works without it.");
}

// ─── The database side ───────────────────────────────────────────────────────
const legacy = KEY.startsWith("ey");
const headers = { apikey: KEY, ...(legacy ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" };

async function get(url) {
  try {
    const r = await fetch(url, { headers, cache: "no-store" });
    return { status: r.status, body: (await r.text()).slice(0, 160) };
  } catch (e) {
    return { status: 0, body: e instanceof Error ? e.message : "no connection" };
  }
}

const t = await get(`${SB}/rest/v1/printer_status?select=id&limit=1`);
if (t.status === 200) ok("the printer_status table is reachable");
else if (t.status === 0) bad("no connection to the database", "check the internet, and that the URL is right.");
else if (t.status === 401 || t.status === 403) bad("the database refused the key", "that must be the SECRET key (sb_secret_...), not the publishable one. run settings.bat.");
else if (t.status === 404) bad("the printer tables do not exist yet", "run the printer SQL in Supabase > SQL Editor.");
else bad(`the database answered ${t.status}`, t.body);

const b = await get(`${SB}/storage/v1/bucket/printer`);
if (b.status === 200) ok("the 'printer' storage bucket exists");
else if (b.status === 404) bad("there is no 'printer' bucket", "Supabase > Storage > New bucket named 'printer', marked Public.");
else if (b.status === 401 || b.status === 403) bad("storage refused the key", "same key problem as above.");
else bad(`storage answered ${b.status}`, b.body);

console.log("\n  done. fix whatever says FAIL, then run start.bat again.\n");
process.exit(0);
