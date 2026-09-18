/**
 * What /livestream actually shows a visitor, answered from the Pi.
 *
 * `check.mjs` proves the agent can reach the printer and the database. That is
 * not the same question as "does the page work": the agent writes with the
 * SECRET key, which bypasses row-level security, while the page reads with the
 * PUBLIC one, which does not. A read policy that was never created leaves the
 * agent reporting success into a table the site is not allowed to open, and the
 * page saying the printer is off while the data sits right there.
 *
 * So this deliberately uses no key of its own. It fetches the site's own
 * /shop.json, takes the public key from it, and asks the same questions a
 * stranger's browser asks — which makes a pass here mean the page works, not
 * that it ought to.
 *
 *   node page-check.mjs                    (checks https://unit-3d.com)
 *   node page-check.mjs http://localhost:3000
 */
import { VERSION } from "./version.mjs";

const SITE = (process.argv[2] || "https://unit-3d.com").replace(/\/$/, "");

const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", x: "\x1b[0m" };
const ok = (m, extra = "") => console.log(`  ${C.g}[ ok ]${C.x} ${m}${extra ? `  ${C.d}${extra}${C.x}` : ""}`);
const bad = (m, fix = "") => { fails++; console.log(`  ${C.r}[FAIL]${C.x} ${m}${fix ? `\n         ${C.d}${fix}${C.x}` : ""}`); };
const warn = (m, note = "") => console.log(`  ${C.y}[ hm ]${C.x} ${m}${note ? `\n         ${C.d}${note}${C.x}` : ""}`);
let fails = 0;

/** How long ago, in words — the number that decides whether the page looks alive. */
function ago(iso) {
  if (!iso) return "never";
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(s)) return "never";
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const grab = (u, init) =>
  fetch(`${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store", ...init })
    .catch((e) => ({ ok: false, status: 0, statusText: e.message, json: async () => null, headers: new Headers() }));

console.log(`\n  Unit 3D · what the page sees\n  agent version ${VERSION}\n  site ${SITE}\n`);

// ─── The public config, exactly as the browser loads it ──────────────────────
const cfgRes = await grab(`${SITE}/shop.json`);
if (!cfgRes.ok) {
  bad(`the site did not serve /shop.json  (${cfgRes.status || cfgRes.statusText})`,
      "without it the page has no database to read, so it would show the printer as off no matter what the agent does.");
  console.log("\n  stopping here — nothing below can be judged without it.\n");
  process.exit(1);
}
const cfg = await cfgRes.json();
const url = String(cfg.supabaseUrl || "").replace(/\/$/, "");
const anon = String(cfg.supabaseAnonKey || "");
if (!url || !anon) {
  bad("/shop.json is missing supabaseUrl or supabaseAnonKey");
  process.exit(1);
}
ok("the site serves its public config", url.replace(/^https:\/\//, ""));

const rest = (path) => grab(`${url}/rest/v1/${path}`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });

// ─── The row the page is built on ────────────────────────────────────────────
const stRes = await rest("printer_status?select=*&limit=1");
if (stRes.status === 401 || stRes.status === 403) {
  bad("the public key may not read printer_status",
      "the agent is writing, but visitors cannot see it. add the read policy from docs/printer-live.md.");
} else if (!stRes.ok) {
  bad(`printer_status could not be read  (${stRes.status || stRes.statusText})`);
} else {
  const rows = (await stRes.json()) || [];
  if (rows.length === 0) {
    bad("printer_status is readable but empty",
        "the agent has never written a row. run: bash pi-logs.sh");
  } else {
    const r = rows[0];
    const age = ago(r.updated_at);
    // The agent writes every few seconds, so the row's age is the real health
    // check: a stale row means the page is showing a visitor something that
    // stopped being true, which is worse than showing nothing at all.
    const stale = r.updated_at && Date.now() - Date.parse(r.updated_at) > 120_000;
    if (stale) {
      bad(`the page reads the printer as "${r.state}", but that is ${age}`,
          "the agent stopped writing. check: bash pi-logs.sh");
    } else {
      ok(`the page reads the printer as "${r.state}"`, `updated ${age}`);
    }
    if (r.state === "printing") {
      console.log(`         ${C.d}${r.job_name ?? "(no name)"} · ${r.progress ?? "?"}% · layer ${r.layer ?? "?"}/${r.layers_total ?? "?"} · ${r.minutes_left ?? "?"} min left${C.x}`);
    }
    console.log(`         ${C.d}nozzle ${r.nozzle_temp ?? "?"}/${r.nozzle_target ?? "?"}°  bed ${r.bed_temp ?? "?"}/${r.bed_target ?? "?"}°${C.x}`);
  }
}

// ─── The picture ─────────────────────────────────────────────────────────────
const shot = await grab(`${url}/storage/v1/object/public/printer/live.jpg`, { method: "GET" });
if (shot.ok) {
  const len = Number(shot.headers.get("content-length") || 0);
  // A camera frame is tens of kilobytes; a few hundred bytes is an error page
  // that happens to have come back with a 200.
  if (len > 2000) ok("the camera picture is there", `${Math.round(len / 1024)} KB`);
  else warn("live.jpg is there but suspiciously small", `${len} bytes — probably not a real frame`);
} else if (shot.status === 400 || shot.status === 404) {
  warn("no camera picture yet", "the rest of the page works without it. check: node camera.mjs");
} else {
  bad(`the camera picture could not be read  (${shot.status || shot.statusText})`,
      "the 'printer' bucket must be public.");
}

// ─── The two lists under the fold ────────────────────────────────────────────
for (const [table, label] of [["printer_jobs", "finished prints"], ["printer_timelapses", "timelapses"]]) {
  const res = await rest(`${table}?select=*&limit=200`);
  if (!res.ok) { bad(`${table} could not be read  (${res.status || res.statusText})`); continue; }
  const rows = (await res.json()) || [];
  if (rows.length) ok(`${label}: ${rows.length}`);
  else warn(`${label}: none yet`, table === "printer_jobs"
    ? "a row is written when a print finishes."
    : "the printer only records one when Timelapse was switched on in the slicer.");
}

console.log(
  fails === 0
    ? `\n  ${C.g}the page is live.${C.x} open ${SITE}/livestream\n`
    : `\n  ${C.r}${fails} thing${fails > 1 ? "s" : ""} the page cannot show.${C.x} fix what says FAIL above.\n`,
);
process.exit(fails === 0 ? 0 : 1);
