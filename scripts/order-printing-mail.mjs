#!/usr/bin/env node
/**
 * "Your order is on the printer now", sent from GitHub instead of from the Pi.
 *
 * The Pi runs whatever code it was installed with and does not update itself,
 * so a letter that depends on new agent code waits for someone to log into
 * it. But the agent already reports the job name to Supabase every two
 * seconds (printer_status), and since the admin stamps the 3MF the job name
 * IS the order number. So this reads that row on a schedule and, when a
 * UNIT3D-<n> job is printing, sends the same letter the agent would —
 * agent/order-mail.mjs, imported, so there is one letter and one rule:
 * once per order, recorded in orders.live_email_at.
 *
 * Secrets (GitHub → Settings → Secrets and variables → Actions):
 *   SUPABASE_SERVICE_KEY   — the same secret key the agent uses
 *   EMAILJS_PRIVATE_KEY    — EmailJS → Account → Security (non-browser on)
 * The Supabase URL, EmailJS ids and site come from public/shop.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { letter, makeOrderMail } from "../agent/order-mail.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shop = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "shop.json"), "utf8"));
const SB = String(shop.supabaseUrl || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY || "";
const PRIVATE = process.env.EMAILJS_PRIVATE_KEY || "";

if (!SB || !KEY || !PRIVATE) {
  console.log(`::notice::order mail is off — missing ${[!KEY && "SUPABASE_SERVICE_KEY", !PRIVATE && "EMAILJS_PRIVATE_KEY"].filter(Boolean).join(", ")} secret`);
  process.exit(0);
}

// A manual run with TEST_TO sends one sample letter there and stops — proof
// the EmailJS key works, without touching any order.
if (process.env.TEST_TO) {
  const e = shop.emailjs ?? {};
  const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: e.serviceId, template_id: e.templateId, user_id: e.publicKey, accessToken: PRIVATE,
      template_params: {
        to_email: process.env.TEST_TO, to_name: "בדיקה", subject: "בדיקה · ההזמנה UNIT3D-TEST עלתה עכשיו למדפסת",
        order_ref: "UNIT3D-TEST", reply_to: "orders@unit-3d.com",
        message_html: letter({ ref: "UNIT3D-TEST", name: "בדיקה", lines: [{ title: "מוצר לדוגמה", qty: 1 }], site: "https://unit-3d.com" }),
      },
    }),
  });
  console.log(`::notice::test mail to ${process.env.TEST_TO}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  process.exit(0);
}

const headers = { apikey: KEY, ...(KEY.startsWith("ey") ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" };
const log = (...a) => console.log(...a);

const res = await fetch(`${SB}/rest/v1/printer_status?id=eq.live&select=state,job_name,updated_at`, { headers });
if (!res.ok) { console.log(`::warning::printer_status ${res.status}`); process.exit(0); }
const [row] = await res.json();
const ref = String(row?.job_name ?? "").match(/UNIT3D-\d{3,}/i)?.[0]?.toUpperCase();
const fresh = row?.updated_at && Date.now() - Date.parse(row.updated_at) < 10 * 60_000;
console.log(`::notice::printer ${row?.state ?? "?"} · job ${row?.job_name ?? "-"} · ${fresh ? "fresh" : "stale"}`);
if (row?.state !== "printing" || !ref || !fresh) process.exit(0);

const tell = makeOrderMail({ SB, headers, cfg: { emailjs: { privateKey: PRIVATE }, site: "https://unit-3d.com" }, log });
await tell(ref);
