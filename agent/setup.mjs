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
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "config.json");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : null;

/** Ask, keeping the previous answer when the line is left empty. */
async function ask(label, current, check) {
  for (;;) {
    const shown = current ? ` [${current.length > 22 ? current.slice(0, 19) + "..." : current}]` : "";
    const v = (await rl.question(`${label}${shown}: `)).trim() || current || "";
    if (!check || check(v)) return v;
    console.log("  ^ looks wrong, try again");
  }
}

console.log("\n  Unit 3D · printer agent setup");
console.log("  press Enter to keep a value in [brackets]\n");

const host = await ask("Printer IP (e.g. 192.168.1.42)", old?.printer?.host, (v) => /^\d{1,3}(\.\d{1,3}){3}$/.test(v));
const serial = await ask("Printer serial", old?.printer?.serial, (v) => v.length >= 8);
const accessCode = await ask("Access code (8 digits)", old?.printer?.accessCode, (v) => v.length >= 6);
const model = await ask("Printer model", old?.printer?.model || "Bambu Lab P2S", (v) => v.length > 1);
const url = await ask("Supabase URL", old?.supabase?.url, (v) => /^https:\/\/.+\.supabase\.co$/.test(v.replace(/\/$/, "")));
const serviceKey = await ask("Supabase SECRET key (sb_secret_… or eyJ…)", old?.supabase?.serviceKey, (v) => v.length > 20);

const config = {
  printer: { host, serial, accessCode, model },
  supabase: { url: url.replace(/\/$/, ""), serviceKey },
  camera: { enabled: old?.camera?.enabled !== false, everySeconds: old?.camera?.everySeconds ?? 15 },
  timelapse: { enabled: old?.timelapse?.enabled !== false, everyMinutes: old?.timelapse?.everyMinutes ?? 30 },
  statusEverySeconds: old?.statusEverySeconds ?? 5,
};

fs.writeFileSync(FILE, JSON.stringify(config, null, 2) + "\n", "utf8");
console.log(`\n  saved: ${FILE}`);
console.log("  this file stays on this computer. it is not uploaded anywhere.\n");
rl.close();
