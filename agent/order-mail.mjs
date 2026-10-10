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

// The shop's letterhead — a copy of shell / lineRow / refChip in
// lib/order-email.ts (the agent runs plain node and cannot import TS), so this
// letter looks exactly like the confirmation and the "ready" mail. Change one,
// change both.
const INK = "#0A0A0B", GREEN = "#089a47", GREEN_LIGHT = "#3FB872", PAPER = "#F2F2F4", LINE = "#E5E5EA", MUTED = "#8E8E93";
const FONT = "'Segoe UI', Arial, 'Arial Hebrew', sans-serif";
const WHATSAPP = "https://wa.me/972509300990", PHONE = "050-930-0990", INSTAGRAM = "@unit3design";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ils = (n) => "₪" + Number(n).toLocaleString("en-US");
const pick = (summary, label) => {
  const hit = (summary ?? []).find((x) => String(x).trim().startsWith(label + ":"));
  return hit ? hit.slice(hit.indexOf(":") + 1).trim() : null;
};

function lineRow(l, i) {
  const material = [pick(l.summary, "חומר"), pick(l.summary, "צבע")].filter(Boolean).join(" · ");
  const hours = pick(l.summary, "זמן הדפסה");
  return `
    <tr><td style="padding:16px 20px;border-bottom:1px solid ${LINE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font:700 15px/1.5 ${FONT};color:${INK};"><span style="display:inline-block;min-width:20px;color:${MUTED};font-weight:400;">${i + 1}.</span> ${esc(l.title)}</td>
        <td align="left" style="font:700 15px/1.5 ${FONT};color:${INK};white-space:nowrap;padding-right:10px;" dir="ltr">${l.price == null ? "לפי הזמנה" : esc(ils(l.price))}</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
        ${material ? `<tr><td style="font:400 13px/1.7 ${FONT};color:${MUTED};width:86px;">חומר וצבע</td><td style="font:600 13px/1.7 ${FONT};color:${INK};">${esc(material)}</td></tr>` : ""}
        <tr><td style="font:400 13px/1.7 ${FONT};color:${MUTED};width:86px;">כמות</td><td style="font:600 13px/1.7 ${FONT};color:${INK};">${esc(l.qty ?? 1)}</td></tr>
        ${hours ? `<tr><td style="font:400 13px/1.7 ${FONT};color:${MUTED};">זמן הדפסה</td><td style="font:600 13px/1.7 ${FONT};color:${INK};">${esc(hours)}</td></tr>` : ""}
      </table>
    </td></tr>`;
}

const shell = (inner, site) => `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div dir="rtl" style="background:${PAPER};padding:24px 12px;">
<table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;">
  <tr><td style="background:${INK};padding:26px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:700 20px/1 ${FONT};letter-spacing:3px;color:#FAFAFA;" dir="ltr">UNIT<span style="color:${GREEN_LIGHT};"> 3D</span></td>
      <td align="left" style="font:400 13px/1 ${FONT};color:${MUTED};">הדפסת תלת מימד</td>
    </tr></table>
  </td></tr>
${inner}
  <tr><td style="background:${PAPER};padding:20px 24px;border-top:1px solid ${LINE};">
    <div style="font:400 13px/1.9 ${FONT};color:${MUTED};">
      שאלה? אפשר להשיב למייל הזה, או בוואטסאפ:
      <a href="${WHATSAPP}" style="color:${GREEN};text-decoration:none;font-weight:700;">${PHONE}</a>
    </div>
    <div style="font:400 12px/1.9 ${FONT};color:${MUTED};padding-top:4px;" dir="ltr">${esc(site)} · ${INSTAGRAM}</div>
  </td></tr>
</table>
</div></body></html>`;

const refChip = (ref) =>
  `<div style="margin-top:16px;display:inline-block;background:${INK};border-radius:999px;padding:9px 18px;font:700 15px/1 ${FONT};color:${GREEN_LIGHT};" dir="ltr">${esc(ref)}</div>`;

export function letter({ ref, name, lines, site }) {
  const total = (lines ?? []).every((l) => l.price != null) && (lines ?? []).length
    ? lines.reduce((s, l) => s + Number(l.price), 0) : null;
  return shell(`
  <tr><td style="padding:28px 24px 4px;">
    <div style="font:700 22px/1.4 ${FONT};color:${INK};">ההזמנה שלך עלתה עכשיו למדפסת 🟢</div>
    <div style="font:400 15px/1.7 ${FONT};color:${MUTED};margin-top:6px;">
      ${name ? esc(name) + ", " : ""}ההדפסה התחילה ממש עכשיו. אפשר לראות את המדפסת עובדת בשידור חי.
    </div>
    ${refChip(ref)}
  </td></tr>
  ${(lines ?? []).length ? `
  <tr><td style="padding:24px 24px 8px;">
    <div style="font:700 12px/1 ${FONT};letter-spacing:2px;color:${MUTED};padding-bottom:10px;">מה מודפס</div>
  </td></tr>
  <tr><td style="padding:0 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};">
      ${lines.map(lineRow).join("")}
    </table>
  </td></tr>` : ""}
  ${total == null ? "" : `
  <tr><td style="padding:20px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:400 14px/1.9 ${FONT};color:${MUTED};width:110px;">סה"כ</td>
      <td style="font:700 14px/1.9 ${FONT};color:${INK};">${esc(ils(total))}</td>
    </tr></table>
  </td></tr>`}
  <tr><td style="padding:20px 24px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};border-radius:12px;">
      <tr><td style="padding:16px 20px;font:400 14px/1.7 ${FONT};color:#FAFAFA;">
        המדפסת משודרת בזמן אמת: מצב ההדפסה, אחוזים, וכמה זמן נשאר. כשהכל ירד מהמדפסת ייצא מייל נוסף.
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 24px 28px;">
    <a href="${esc(site)}/livestream" style="display:inline-block;background:${GREEN};color:#FFFFFF;text-decoration:none;border-radius:10px;padding:13px 26px;font:700 15px/1 ${FONT};">לצפות בשידור החי</a>
  </td></tr>
`, site);
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
