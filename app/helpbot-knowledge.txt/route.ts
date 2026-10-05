import { BOT_ANSWERS } from "@/lib/helpbot";
import { FAQS } from "@/lib/faqs";
import { CONTACT } from "@/lib/contact";
import { BUSINESS } from "@/lib/business";
import { SHELF_LABEL, SHELVES } from "@/lib/candidates";
import { SHELF_ROUTE, allProducts, shelfCount } from "@/lib/helpbot-catalog";

/**
 * /helpbot-knowledge.txt — everything the AI helper may say, as plain text.
 *
 * Built with the site from the same sources the pages render (the prepared
 * answers, the published FAQ, the business details, every sellable model with
 * the price the shop charges), so the helper cannot quote a price or a promise
 * the site does not make. The Supabase function (supabase/functions/helpbot)
 * fetches it and caches it; a deploy refreshes it.
 */
export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [];
  lines.push("# Unit 3D — מידע לעוזר האתר");
  lines.push(`סטודיו להדפסת תלת מימד ב${BUSINESS.city}. בעלים: ${BUSINESS.contactPerson}. אתר: ${BUSINESS.site}`);
  lines.push(`וואטסאפ: ${CONTACT.whatsapp} · טלפון: ${CONTACT.phoneDisplay} · מייל: ${CONTACT.email} · אינסטגרם: ${CONTACT.instagram}`);
  lines.push("");
  lines.push("## עמודים באתר");
  lines.push("/ דף הבית · /trendy טרנדי · /catalog סמלי יחידות לחיילים · /configurator מעצב אישי (טקסט, צורה, צבע) · /upload העלאת קובץ להדפסה · /contact צור קשר והזמנה · /tracking מעקב הזמנה · /livestream המדפסת בלייב · /shipping משלוחים · /faq שאלות נפוצות · /b2b לעסקים וכמויות · /reviews ביקורות · /gallery גלריה");
  lines.push("");
  lines.push("## מדפים");
  for (const s of SHELVES) {
    const n = shelfCount(s);
    if (n) lines.push(`${SHELF_LABEL[s]}: ${n} דגמים · ${SHELF_ROUTE[s]}`);
  }
  lines.push("");
  lines.push("## תשובות מוכנות (עובדות מאושרות)");
  for (const a of BOT_ANSWERS) {
    lines.push(`- ${a.chip ?? a.keys[0]}: ${a.text}${a.links?.length ? ` [קישורים: ${a.links.map((l) => `${l.label} ${l.href}`).join(", ")}]` : ""}`);
  }
  lines.push("");
  lines.push("## שאלות נפוצות (כפי שמופיעות באתר)");
  for (const f of FAQS) lines.push(`- ${f.q} ${f.a}`);
  lines.push("");
  lines.push("## כל המוצרים בחנות (שם · מדף · מחיר · עמוד)");
  for (const p of allProducts()) lines.push(`${p.name} · ${p.shelfLabel} · ₪${p.price} · ${p.href}`);
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
