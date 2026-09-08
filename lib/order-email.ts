import { DELIVERY_BY_ID, SITE_URL, orderTotal, type OrderLine, type PlacedOrder } from "./orders";
import { CONTACT } from "./contact";
import { fmtILS } from "./format";

/**
 * The confirmation the customer gets.
 *
 * A WhatsApp message goes to Ariel; the customer, until now, got a thank-you
 * screen that vanished on the next click and nothing they could keep. This is
 * the record they keep: their order number, exactly what they configured, in
 * which filament, what it costs and how it reaches them.
 *
 * It is built as an email, not as a web page: tables and inline styles only,
 * system fonts (webfonts do not load in most clients), and `border-right`
 * rather than the logical property, which several clients still ignore. The
 * palette is the shop's own — ink, the brand green, the same wordmark.
 */
const INK = "#0A0A0B";
const GREEN = "#089a47";
const GREEN_LIGHT = "#3FB872";
const PAPER = "#F2F2F4";
const LINE = "#E5E5EA";
const MUTED = "#8E8E93";
const FONT = "'Segoe UI', Arial, 'Arial Hebrew', sans-serif";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The summary line that opens with this label, without the label. */
const pick = (summary: string[], label: string): string | null => {
  const hit = summary.find((s) => s.trim().startsWith(label + ":"));
  return hit ? hit.slice(hit.indexOf(":") + 1).trim() : null;
};

const lineRow = (l: OrderLine, i: number): string => {
  const material = [pick(l.summary, "חומר"), pick(l.summary, "צבע")].filter(Boolean).join(" · ");
  const hours = pick(l.summary, "זמן הדפסה");
  // Everything the customer chose that is not already a column of its own.
  const rest = l.summary.filter(
    (s) => !/^(חומר|צבע|זמן הדפסה|כמות|מוצר|גודל)\s*:/.test(s.trim()),
  );
  return `
    <tr>
      <td style="padding:16px 20px;border-bottom:1px solid ${LINE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font:700 15px/1.5 ${FONT};color:${INK};">
              <span style="display:inline-block;min-width:20px;color:${MUTED};font-weight:400;">${i + 1}.</span>
              ${esc(l.title)}
            </td>
            <td align="left" style="font:700 15px/1.5 ${FONT};color:${INK};white-space:nowrap;padding-right:10px;" dir="ltr">
              ${l.price == null ? "לפי הזמנה" : esc(fmtILS(l.price))}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
          ${material ? `<tr><td style="font:400 13px/1.7 ${FONT};color:${MUTED};width:86px;">חומר וצבע</td><td style="font:600 13px/1.7 ${FONT};color:${INK};">${esc(material)}</td></tr>` : ""}
          <tr><td style="font:400 13px/1.7 ${FONT};color:${MUTED};">כמות</td><td style="font:600 13px/1.7 ${FONT};color:${INK};">${l.qty}</td></tr>
          ${hours ? `<tr><td style="font:400 13px/1.7 ${FONT};color:${MUTED};">זמן הדפסה</td><td style="font:600 13px/1.7 ${FONT};color:${INK};">${esc(hours)}</td></tr>` : ""}
          ${rest.map((r) => `<tr><td colspan="2" style="font:400 13px/1.7 ${FONT};color:${MUTED};">${esc(r)}</td></tr>`).join("")}
        </table>
      </td>
    </tr>`;
};

const infoRow = (label: string, value: string, strong = false): string => `
  <tr>
    <td style="font:400 14px/1.9 ${FONT};color:${MUTED};width:110px;">${esc(label)}</td>
    <td style="font:${strong ? 700 : 400} 14px/1.9 ${FONT};color:${INK};">${value}</td>
  </tr>`;

const STEPS: [string, string][] = [
  ["1", "אני עובר על ההזמנה ומאשר אותה מולך בוואטסאפ."],
  ["2", "ההדפסה יוצאת לדרך — כל פריט מודפס בנפרד, לפי החומר והצבע שבחרת."],
  ["3", "מעדכן אותך כשהכל מוכן, ומתאמים מסירה."],
];

/** The whole confirmation, as one HTML document. */
export function orderEmailHtml(o: PlacedOrder): string {
  const d = DELIVERY_BY_ID[o.delivery];
  const total = orderTotal(o);
  const items = o.itemsTotal;

  return `<!DOCTYPE html>
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

  <tr><td style="padding:28px 24px 4px;">
    <div style="font:700 22px/1.4 ${FONT};color:${INK};">קיבלתי את ההזמנה שלך 🎉</div>
    <div style="font:400 15px/1.7 ${FONT};color:${MUTED};margin-top:6px;">
      ${o.customer.name ? esc(o.customer.name) + ", " : ""}תודה. זה הפירוט המלא — שמור אותו, מספר ההזמנה הוא מה שמזהה אותה מולי.
    </div>
    <div style="margin-top:16px;display:inline-block;background:${INK};border-radius:999px;padding:9px 18px;font:700 15px/1 ${FONT};color:${GREEN_LIGHT};" dir="ltr">${esc(o.ref)}</div>
  </td></tr>

  <tr><td style="padding:24px 24px 8px;">
    <div style="font:700 12px/1 ${FONT};letter-spacing:2px;color:${MUTED};padding-bottom:10px;">מה הוזמן</div>
  </td></tr>
  <tr><td style="padding:0 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};">
      ${o.lines.map(lineRow).join("")}
    </table>
  </td></tr>

  <tr><td style="padding:20px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${items != null ? infoRow("פריטים", esc(fmtILS(items))) : ""}
      ${infoRow("מסירה", `${esc(d.label)} · ${d.price ? esc(fmtILS(d.price)) : "חינם"}<div style="font:400 12px/1.6 ${FONT};color:${MUTED};">${esc(d.note)}</div>`)}
      ${o.note ? infoRow("הערות שלך", esc(o.note)) : ""}
    </table>
  </td></tr>

  <tr><td style="padding:16px 24px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};border-radius:12px;">
      <tr>
        <td style="padding:16px 20px;font:700 15px/1 ${FONT};color:#FAFAFA;">סה"כ לתשלום</td>
        <td align="left" style="padding:16px 20px;font:700 20px/1 ${FONT};color:${GREEN_LIGHT};" dir="ltr">${total == null ? "לפי הזמנה" : esc(fmtILS(total))}</td>
      </tr>
    </table>
    <div style="font:400 12px/1.7 ${FONT};color:${MUTED};padding-top:8px;">התשלום מתבצע מול אישור ההזמנה. אין חיוב עד שנסגור פרטים.</div>
  </td></tr>

  <tr><td style="padding:24px 24px 8px;">
    <div style="font:700 12px/1 ${FONT};letter-spacing:2px;color:${MUTED};padding-bottom:12px;">מה עכשיו</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${STEPS.map(([n, t]) => `<tr>
        <td width="30" valign="top" style="padding-bottom:10px;">
          <div style="width:22px;height:22px;border-radius:11px;background:${GREEN};color:#FFFFFF;font:700 12px/22px ${FONT};text-align:center;">${n}</div>
        </td>
        <td valign="top" style="font:400 14px/1.6 ${FONT};color:${INK};padding-bottom:10px;">${esc(t)}</td>
      </tr>`).join("")}
    </table>
  </td></tr>

  <tr><td style="padding:8px 24px 28px;">
    <a href="${SITE_URL}" style="display:inline-block;background:${GREEN};color:#FFFFFF;text-decoration:none;border-radius:10px;padding:13px 26px;font:700 15px/1 ${FONT};">חזרה לחנות</a>
  </td></tr>

  <tr><td style="background:${PAPER};padding:20px 24px;border-top:1px solid ${LINE};">
    <div style="font:400 13px/1.9 ${FONT};color:${MUTED};">
      שאלה? אפשר להשיב למייל הזה, או בוואטסאפ:
      <a href="${CONTACT.whatsapp}" style="color:${GREEN};text-decoration:none;font-weight:700;">${esc(CONTACT.phoneDisplay)}</a>
    </div>
    <div style="font:400 12px/1.9 ${FONT};color:${MUTED};padding-top:4px;" dir="ltr">${SITE_URL} · ${esc(CONTACT.instagramHandle)}</div>
  </td></tr>

</table>
</div></body></html>`;
}

export const orderEmailSubject = (o: PlacedOrder): string =>
  `אישור הזמנה ${o.ref} · Unit 3D`;
