/**
 * The five questions, instead of a JSON file to edit by hand.
 *
 * Everything this agent needs is a string someone reads off a screen: the
 * printer's address, its code, its serial, and the shop's database. Asking for
 * them one at a time — and writing the file itself — removes the one step in
 * the whole setup that assumes you know what a JSON comma is.
 *
 *   node setup.mjs        (start.bat runs it by itself when config.json is missing)
 */
import dgram from "node:dgram";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "config.json");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : null;

/**
 * The shop already knows its own database, so the wizard should not ask twice.
 * public/shop.json sits two folders up in the same download; if it is there,
 * its URL becomes the suggested answer and Enter accepts it.
 */
function shopUrl() {
  try {
    const f = path.join(HERE, "..", "public", "shop.json");
    const v = JSON.parse(fs.readFileSync(f, "utf8"));
    return (v.supabaseUrl || "").replace(/\/$/, "");
  } catch {
    return "";
  }
}

/**
 * Ask, keeping the previous answer when the line is left empty.
 *
 * `fix` gets a chance to repair a reasonable-but-wrong answer (the dashboard
 * URL instead of the project URL, say) before it is judged, and `why` explains
 * the refusal — "looks wrong" on its own tells nobody what to type instead.
 */
async function ask(label, current, check, why = "", fix = (v) => v) {
  for (;;) {
    const shown = current ? ` [${current.length > 22 ? current.slice(0, 19) + "..." : current}]` : "";
    const typed = (await rl.question(`${label}${shown}: `)).trim();
    const v = fix(typed || current || "");
    if (!check || check(v)) return v;
    console.log(`  ^ ${why || "looks wrong, try again"}`);
    if (current) console.log(`    (press Enter alone to keep ${current.slice(0, 40)})`);
  }
}

/**
 * The serial, without hunting for it.
 *
 * A Bambu printer announces itself on the local network every few seconds, and
 * the announcement carries its serial. Reading it off the wire is kinder than
 * sending someone to crawl behind the machine with a torch — the regulatory
 * sticker does not carry the serial at all, and the menu that does is three
 * pages deep.
 */
function discover(seconds = 9) {
  return new Promise((resolve) => {
    const found = new Map();
    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    let closed = false;
    const done = () => {
      if (closed) return;
      closed = true;
      try { sock.close(); } catch { /* already gone */ }
      resolve([...found.values()]);
    };
    sock.on("error", done);
    sock.on("message", (buf) => {
      const t = buf.toString("utf8");
      const usn = /USN:\s*([^\r\n]+)/i.exec(t)?.[1]?.trim();
      if (!usn) return;
      const name = /DevName\.bambu\.com:\s*([^\r\n]+)/i.exec(t)?.[1]?.trim() ?? "";
      const ip = /Location:\s*([^\r\n]+)/i.exec(t)?.[1]?.trim() ?? "";
      found.set(usn, { serial: usn, name, ip });
    });
    sock.bind(2021, () => {
      try {
        sock.setBroadcast(true);
        // A nudge, in case the next scheduled announcement is seconds away.
        const probe = Buffer.from(
          "M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:2021\r\nMAN: \"ssdp:discover\"\r\nMX: 1\r\nST: urn:bambulab-com:device:3dprinter:1\r\n\r\n",
        );
        sock.send(probe, 0, probe.length, 2021, "239.255.255.255");
      } catch { /* a nudge is optional */ }
    });
    setTimeout(done, seconds * 1000);
  });
}

console.log("\n  Unit 3D · printer agent setup");
console.log("  press Enter to keep a value in [brackets]\n");

const host = await ask(
  "Printer IP (e.g. 192.168.1.42)", old?.printer?.host,
  (v) => /^\d{1,3}(\.\d{1,3}){3}$/.test(v),
  "that is not an IP address. it looks like 192.168.1.55, from the printer's LAN screen.",
);
let serial = old?.printer?.serial ?? "";
if (!serial) {
  console.log("  looking for the printer on this network... (about 9 seconds)");
  const seen = await discover();
  if (seen.length === 1) {
    serial = seen[0].serial;
    console.log(`  found: ${serial}${seen[0].name ? `  (${seen[0].name})` : ""}`);
  } else if (seen.length > 1) {
    console.log("  found more than one printer:");
    seen.forEach((d, i) => console.log(`    ${i + 1}) ${d.serial}  ${d.name}`));
    const pick = Number(await rl.question("  which one? (number): "));
    serial = seen[pick - 1]?.serial ?? "";
  } else {
    console.log("  no printer answered. type the serial by hand (printer screen: Settings > Device).");
  }
}
serial = await ask(
  "Printer serial", serial,
  (v) => v.length >= 8,
  "a serial is about 15 characters, e.g. 01P00A3B0500123. printer screen: Settings > Device.",
);
const accessCode = await ask(
  "Access code", old?.printer?.accessCode,
  (v) => v.length >= 6,
  "the 8-character code on the printer's LAN screen, next to the IP.",
);
const model = await ask("Printer model", old?.printer?.model || "Bambu Lab P2S", (v) => v.length > 1);
const url = await ask(
  "Supabase URL", old?.supabase?.url || shopUrl(),
  (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(v),
  "expected https://<project>.supabase.co — the value in [brackets] is already correct, so Enter is enough.",
  // A dashboard link carries the project id, so take it rather than refuse it.
  (v) => {
    const ref = /supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i.exec(v)?.[1];
    if (ref) return `https://${ref}.supabase.co`;
    if (/^sb_(secret|publishable)_/.test(v)) return "";   // that is a key, not a URL
    return v.replace(/\/+$/, "");
  },
);
const serviceKey = await ask(
  "Supabase SECRET key (sb_secret_… or eyJ…)", old?.supabase?.serviceKey,
  (v) => v.length > 20 && !/^sb_publishable_/.test(v),
  "Supabase > Settings > API Keys > Secret keys > the eye icon. not the publishable one.",
);

// ─── The live stream (optional) ──────────────────────────────────────────────
// Cloudflare R2 is where the video pieces go while a print is running. It is
// asked for last and every question may be skipped, because the agent is fully
// useful without it — a shop that never turns this on still gets state, stills
// and finished prints.
console.log("\n  Live video (optional). Press Enter on the first question to skip it all.");
console.log("  These come from Cloudflare > R2. Nothing here is sent anywhere except Cloudflare.\n");

const oldR2 = old?.live?.r2 ?? {};
const r2Account = await ask(
  "Cloudflare Account ID (Enter to skip live video)", oldR2.accountId || "",
  (v) => v === "" || /^[a-f0-9]{20,40}$/i.test(v),
  "the long hex id on the R2 page. Enter alone skips live video.",
);

let live = old?.live;
if (r2Account) {
  const r2Key = await ask(
    "R2 Access Key ID", oldR2.accessKeyId,
    (v) => v.length > 10, "from the API token you created for the bucket.",
  );
  const r2Secret = await ask(
    "R2 Secret Access Key", oldR2.secretAccessKey,
    (v) => v.length > 20, "the long one, shown only once when the token was made.",
  );
  const r2Bucket = await ask(
    "R2 bucket name", oldR2.bucket || "unit3d-live",
    (v) => /^[a-z0-9][a-z0-9.-]{1,62}$/.test(v), "lowercase letters, digits and dashes.",
  );
  live = {
    enabled: true,
    // Re-encoding needs a desktop's worth of CPU. On a small ARM board — a
    // Raspberry Pi — the only setting that keeps up is passing the printer's
    // own video through untouched, so that is what it starts as there.
    mode: old?.live?.mode || (process.arch.startsWith("arm") ? "copy" : "encode"),
    segmentSeconds: old?.live?.segmentSeconds ?? 4,
    r2: { accountId: r2Account, accessKeyId: r2Key, secretAccessKey: r2Secret, bucket: r2Bucket },
  };
} else if (live) {
  live = { ...live, enabled: false };
}

const config = {
  printer: { host, serial, accessCode, model },
  ...(live ? { live } : {}),
  supabase: { url: url.replace(/\/$/, ""), serviceKey },
  camera: {
    enabled: old?.camera?.enabled !== false,
    everySeconds: old?.camera?.everySeconds ?? 6,
    // "auto" turns the chamber LED on when the camera needs it — without it the
    // picture is black whenever the printer is not printing. "never" leaves the
    // printer's light alone.
    light: old?.camera?.light ?? "auto",
  },
  // On: the printer's card is readable once the data connection resumes the
  // control connection's TLS session (see ftps.mjs).
  timelapse: { enabled: old?.timelapse?.enabled !== false, everyMinutes: old?.timelapse?.everyMinutes ?? 30 },
  statusEverySeconds: old?.statusEverySeconds ?? 2,
};

fs.writeFileSync(FILE, JSON.stringify(config, null, 2) + "\n", "utf8");
console.log(`\n  saved: ${FILE}`);
console.log("  this file stays on this computer. it is not uploaded anywhere.\n");
rl.close();
