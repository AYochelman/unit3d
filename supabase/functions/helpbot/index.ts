// Supabase Edge Function: the site's AI helper (the thinking orb).
//
// Deploy (owner, once):  supabase functions deploy helpbot
// Secret (owner, once):  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Both are in docs/helpbot-ai.md, with the dashboard route for doing it
// without the CLI.
//
// What it does: takes the visitor's last few messages, answers with Claude
// from /helpbot-knowledge.txt (built with the site from the same sources the
// pages show), and returns { text, links }. It never sees anything private:
// no orders, no customers, no admin data, and it does not write anywhere.
import Anthropic from "npm:@anthropic-ai/sdk";

const SITE = Deno.env.get("SITE_URL") ?? "https://unit-3d.com";
// The smallest current model: simple shop questions answered from a given
// text need nothing bigger, and it is the cheapest and fastest (owner's call).
const MODEL = "claude-haiku-4-5";
const ALLOWED_ORIGINS = [SITE, "https://www.unit-3d.com", "http://localhost:3000"];

const client = new Anthropic(); // ANTHROPIC_API_KEY from the function's secrets

const SYSTEM = `אתה העוזר של Unit 3D, סטודיו קטן להדפסת תלת מימד בגבעתיים שארז מנהל. אתה עונה למבקרים באתר.

איך לענות:
- עברית טבעית וחמה, בגוף ראשון כמו ארז ("אני מדפיס", "אני חוזר אליך"). קצר: 1-4 משפטים, בלי כותרות ובלי רשימות ארוכות.
- רק מה שכתוב במידע שלמטה. מחיר, זמן, חומר, משלוח או מוצר שלא מופיעים שם — אל תמציא. תגיד בכנות שאין לך את הפרט הזה והצע לדבר עם ארז בוואטסאפ.
- כשמבקשים מוצר: חפש ברשימת המוצרים, ציין שם ומחיר מדויקים כפי שהם ברשימה, והצע עד 3 מתאימים.
- הזמנה מיוחדת, כמויות לחברה או קובץ משלהם: הסבר בקצרה והפנה לעמוד המתאים או לוואטסאפ.
- אתה לא יכול לבצע הזמנה, לבדוק סטטוס של הזמנה ספציפית או לתת הנחה שלא כתובה. אל תבטיח דברים בשם ארז.
- שאלה שלא קשורה לחנות: ענה במשפט אחד ידידותי וחזור לעניין.

קישורים: אם יש עמוד שעוזר, הוסף בסוף התשובה עד 3 שורות בפורמט המדויק:
LINK: <כיתוב קצר> | <נתיב שמתחיל ב-/ מהמידע, או ${"https://wa.me/972509300990"}>
בלי קישורים אחרים ובלי markdown.`;

let knowledge: { text: string; at: number } | null = null;
async function loadKnowledge(): Promise<string> {
  if (knowledge && Date.now() - knowledge.at < 10 * 60_000) return knowledge.text;
  const res = await fetch(`${SITE}/helpbot-knowledge.txt`);
  if (!res.ok) throw new Error(`knowledge ${res.status}`);
  knowledge = { text: await res.text(), at: Date.now() };
  return knowledge.text;
}

// A crude per-instance limit: enough to stop one tab from looping, not a wall.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : SITE;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json" } });

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405, headers);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (limited(ip)) return json({ error: "rate" }, 429, headers);

  let history: { role: "user" | "assistant"; content: string }[];
  try {
    const body = await req.json();
    history = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: { role?: string; content?: unknown }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8)
      .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content.slice(0, 600) }));
  } catch {
    return json({ error: "body" }, 400, headers);
  }
  // The API wants the conversation to open with the visitor.
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") return json({ error: "empty" }, 400, headers);

  try {
    const info = await loadKnowledge();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // The instructions and the shop's facts are the same on every call:
      // cached, they cost a tenth after the first message.
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: info, cache_control: { type: "ephemeral" } },
      ],
      messages: history,
    });

    if (response.stop_reason === "refusal") return json({ text: null }, 200, headers);
    const raw = response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();

    // Split the LINK lines off, and keep only links into the site or WhatsApp.
    const links: { label: string; href: string }[] = [];
    const text = raw
      .split("\n")
      .filter((line) => {
        const m = line.match(/^LINK:\s*(.+?)\s*\|\s*(\S+)\s*$/);
        if (!m) return true;
        const href = m[2];
        if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("https://wa.me/")) {
          if (links.length < 3) links.push({ label: m[1].slice(0, 40), href });
        }
        return false;
      })
      .join("\n")
      .trim();

    return json({ text, links }, 200, headers);
  } catch (e) {
    console.error(e);
    return json({ text: null }, 200, headers); // the site falls back to its built-in answers
  }
});
