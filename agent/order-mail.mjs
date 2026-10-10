/**
 * "Your order is on the printer now" — sent by the agent, at the moment it is.
 *
 * It used to go out from the admin at the click that approves an order, which
 * is not when anything is printing: the customer got "it is on the printer"
 * and the printer started an evening later. The agent is the one thing that
 * knows when a job actually starts, and the job carries the order number
 * (the 3MF is stamped UNIT3D-<n> from the admin), so the letter goes from here.
 *
 * Once per order: the `live_email_at` stamp on the order row says it went, and
 * a re-print, a pause or an agent restart never sends it twice. The admin's
 * "שלח עכשיו" stays for an order printed under another name.
 *
 * config.json:
 *   "emailjs": { "privateKey": "…" }      — EmailJS → Account → Security:
 *       turn on "Allow EmailJS API for non-browser applications" and copy the
 *       Private Key. Service, template and public key come from the site's
 *       own shop.json, so they are never typed twice.
 *   "site": "https://unit-3d.com"         — optional.
 */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function letter({ ref, name, lines, site }) {
  const FONT = "Arial,'Segoe UI',sans-serif";
  const items = (lines ?? [])
    .map((l) => `<tr><td style="padding:8px 0;border-top:1px solid #e4e4e7;font:400 14px/1.6 ${FONT};color:#18181b;">${esc(l.title)}${l.qty > 1 ? ` × ${esc(l.qty)}` : ""}</td></tr>`)
    .join("");
  return `<div dir="rtl" style="background:#f4f4f5;padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;">
  <tr><td style="padding:28px 24px 4px;">
    <div style="font:700 22px/1.4 ${FONT};color:#18181b;">ההזמנה שלך עלתה עכשיו למדפסת 🟢</div>
    <div style="font:400 15px/1.7 ${FONT};color:#52525b;margin-top:6px;">${name ? esc(name) + ", " : ""}ההדפסה התחילה ממש עכשיו. אפשר לראות אותה בשידור חי: אחוזים, שכבות, וכמה זמן נשאר.</div>
    <div style="display:inline-block;margin-top:14px;padding:6px 12px;border-radius:8px;background:#f4f4f5;font:700 13px/1 monospace;color:#18181b;" dir="ltr">${esc(ref)}</div>
  </td></tr>
  ${items ? `<tr><td style="padding:20px 24px 0;"><div style="font:700 12px/1 ${FONT};letter-spacing:2px;color:#71717a;padding-bottom:8px;">מה מודפס</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table></td></tr>` : ""}
  <tr><td style="padding:24px 24px 28px;">
    <a href="${esc(site)}/livestream" style="display:inline-block;background:#089a47;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 26px;font:700 15px/1 ${FONT};">לצפות בשידור החי</a>
    <div style="font:400 13px/1.7 ${FONT};color:#71717a;margin-top:14px;">כשהכל ירד מהמדפסת ייצא מייל נוסף.</div>
  </td></tr>
</table></div>`;
}

export function makeOrderMail({ SB, headers, cfg, log }) {
  const site = String(cfg.site || "https://unit-3d.com").replace(/\/$/, "");
  const privateKey = cfg.emailjs?.privateKey || "";
  const done = new Set();       // refs settled this run (sent, already sent, or nothing to send)
  const lastTry = new Map();    // ref → time of the last failed attempt
  let ids = null;

  async function emailIds() {
    if (ids) return ids;
    const res = await fetch(`${site}/shop.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`shop.json ${res.status}`);
    const e = (await res.json()).emailjs ?? {};
    if (!e.serviceId || !e.templateId || !e.publicKey) throw new Error("shop.json has no emailjs ids");
    ids = e;
    return ids;
  }

  /** Called on every status tick while printing; does real work once per ref. */
  return async function onPrinting(ref) {
    if (!ref || done.has(ref)) return;
    if (!privateKey) { done.add(ref); log("order mail: no emailjs.privateKey in config.json — the customer is not told", ref); return; }
    if (Date.now() - (lastTry.get(ref) ?? 0) < 5 * 60_000) return;
    lastTry.set(ref, Date.now());
    try {
      const q = `${SB}/rest/v1/orders?ref=eq.${encodeURIComponent(ref)}&select=ref,customer,lines,live_email_at`;
      const res = await fetch(q, { headers });
      if (!res.ok) throw new Error(`orders ${res.status}`);
      const [row] = await res.json();
      if (!row) { done.add(ref); log("order mail: no order", ref); return; }
      if (row.live_email_at) { done.add(ref); return; }
      const to = String(row.customer?.email ?? "").trim();
      if (!to) { done.add(ref); log("order mail: order has no email", ref); return; }

      const e = await emailIds();
      const send = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: e.serviceId,
          template_id: e.templateId,
          user_id: e.publicKey,
          accessToken: privateKey,
          template_params: {
            to_email: to,
            to_name: row.customer?.name || to,
            subject: `ההזמנה ${ref} עלתה עכשיו למדפסת · Unit 3D`,
            order_ref: ref,
            message_html: letter({ ref, name: row.customer?.name, lines: row.lines, site }),
            reply_to: "orders@unit-3d.com",
          },
        }),
      });
      if (!send.ok) throw new Error(`emailjs ${send.status} ${(await send.text()).slice(0, 120)}`);

      const stamp = await fetch(`${SB}/rest/v1/orders?ref=eq.${encodeURIComponent(ref)}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ live_email_at: new Date().toISOString() }),
      });
      if (!stamp.ok) log("order mail: sent, but the stamp failed", ref, stamp.status);
      done.add(ref);
      log("order mail: the customer was told it is printing", ref);
    } catch (err) {
      log("order mail failed (will retry in 5 min):", ref, err.message);
    }
  };
}
