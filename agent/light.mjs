// Turn the printer's chamber light on or off, by hand.
//
//   node light.mjs on
//   node light.mjs off
//   node light.mjs            (just reports what the printer says)
//
// This talks to the printer directly and prints what came back, so it answers
// the one question the agent's log cannot: does this printer accept the command
// at all, and does it tell anyone what its light is doing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mqtt from "mqtt";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const { host, serial, accessCode } = cfg.printer;
const want = (process.argv[2] || "").toLowerCase();

const client = mqtt.connect(`mqtts://${host}:8883`, {
  username: "bblp",
  password: accessCode,
  rejectUnauthorized: false,
  connectTimeout: 10_000,
  reconnectPeriod: 0,
});

const bye = (code) => { try { client.end(true); } catch {} process.exit(code); };

client.on("error", (e) => {
  console.log("\n  could not talk to the printer:", e.message);
  console.log("  check the IP and access code, and that Developer Mode is on.\n");
  bye(1);
});

client.on("connect", () => {
  console.log(`\n  connected to ${host}`);
  client.subscribe(`device/${serial}/report`);
  client.publish(`device/${serial}/request`, JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }));

  if (want === "on" || want === "off") {
    client.publish(
      `device/${serial}/request`,
      JSON.stringify({
        system: {
          sequence_id: String(Date.now() % 100000),
          command: "ledctrl",
          led_node: "chamber_light",
          led_mode: want,
          led_on_time: 500,
          led_off_time: 500,
          loop_times: 0,
          interval_time: 0,
        },
      }),
    );
    console.log(`  asked the printer to turn the chamber light ${want}.`);
    console.log("  look at the printer now - did it change?");
  }
});

let said = false;
client.on("message", (_t, buf) => {
  try {
    const m = JSON.parse(buf.toString());
    const report = m.print?.lights_report;
    if (Array.isArray(report) && !said) {
      said = true;
      console.log("  the printer reports its lights as:", JSON.stringify(report));
    }
  } catch {}
});

setTimeout(() => {
  if (!said) {
    console.log("  the printer never reported its lights.");
    console.log("  that is not a fault - some firmware simply does not say. the");
    console.log("  agent asks for the light anyway, so the camera still works.");
  }
  console.log("");
  bye(0);
}, 8000);
