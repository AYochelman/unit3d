import { BOT_ANSWERS } from "@/lib/helpbot";
import { FAQS } from "@/lib/faqs";
import { CONTACT } from "@/lib/contact";
import { BUSINESS } from "@/lib/business";
import { SHELF_LABEL, SHELVES } from "@/lib/candidates";
import { SHELF_ROUTE, allProducts, shelfCount } from "@/lib/helpbot-catalog";
import { BF, GIFT } from "@/lib/promos";

const ilDay = (d: Date) => d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric" });

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
  lines.push(`סטודיו להדפסת תלת מימד בסירקין 20, גבעתיים (אין חנות עם שעות פתיחה; איסוף עצמי בחינם בתיאום בוואטסאפ). אתר: ${BUSINESS.site}`);
  lines.push(`וואטסאפ: ${CONTACT.whatsapp} · טלפון: ${CONTACT.phoneDisplay} · מייל: ${CONTACT.email} · אינסטגרם: ${CONTACT.instagram}`);
  lines.push("");
  lines.push("## עמודים באתר");
  lines.push("/ דף הבית · /trendy טרנדי · /catalog סמלי יחידות לחיילים · /configurator מעצב אישי (טקסט, צורה, צבע) · /upload העלאת קובץ להדפסה · /contact צור קשר והזמנה · /tracking מעקב הזמנה · /livestream המדפסת בלייב · /shipping משלוחים · /faq שאלות נפוצות · /b2b לעסקים וכמויות · /reviews ביקורות · /gallery גלריה");
  lines.push("");
  lines.push("## מבצעים");
  lines.push(`- בלאק פריידי ${ilDay(BF.start)}-${ilDay(new Date(BF.end.getTime() - 1))}: קונים ${BF.need} פידג'טים, השלישי מתנה (בשווי עד ₪${BF.freeMax}). קופסת המסתורין: ${BF.mysteryItems + 1} פריטים במקום ${BF.mysteryItems}. לפני ואחרי התאריכים האלה המבצע לא בתוקף.`);
  lines.push(`- כל השנה: ${GIFT.line}.`);
  lines.push("- מ-5 יחידות של אותו פריט: 10% הנחה אוטומטית בסל.");
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
  lines.push("## כל המוצרים בחנות (שם · מדף · מחיר · עמוד · תיאור קצר)");
  lines.push("מוצרי \"מעצב אישי\" נבנים עם טקסט/שם/לוגו של הלקוח; המחיר הוא מחיר הבסיס.");
  const short = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 110);
  // A description shared by many imported models is boilerplate, not a fact
  // about this product — it would only cost tokens.
  const seen = new Map<string, number>();
  for (const p of allProducts()) seen.set(short(p.desc), (seen.get(short(p.desc)) ?? 0) + 1);
  for (const p of allProducts()) {
    if (!(p.price > 0)) continue;
    const d = (seen.get(short(p.desc)) ?? 0) > 3 ? "" : short(p.desc);
    lines.push(`${p.name} · ${p.shelfLabel} · ₪${p.price} · ${p.href}${d ? ` · ${d}` : ""}`);
  }
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
