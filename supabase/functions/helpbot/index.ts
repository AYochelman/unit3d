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
// The smallest current model: shop questions answered from a given text need
// nothing bigger, and it is the cheapest and fastest (owner's call). Effort is
// set low below so a visitor waits about a second, not five.
const MODEL = "claude-haiku-5-5";
const ALLOWED_ORIGINS = [SITE, "https://www.unit-3d.com", "http://localhost:3000"];

const client = new Anthropic(); // ANTHROPIC_API_KEY from the function's secrets

const SYSTEM = `אתה העוזר של Unit 3D באתר — סטודיו קטן להדפסת תלת מימד בגבעתיים. אתה עונה למבקרים כמו מוכר טוב שמכיר כל מוצר בחנות.

קול:
- עברית טבעית, חמה וישירה. החנות מדברת ב"אנחנו" ("אנחנו מדפיסים", "נחזור אליך"); על עצמך אתה "אני העוזר". אף פעם לא בשם של אדם.
- קצר: 1-4 משפטים. בלי כותרות, בלי markdown, בלי כוכביות. רשימה קצרה של עד 3 מוצרים מותרת, כל אחד עם שם ומחיר.

מה מותר לך לדעת:
- על החנות (מחירים, מוצרים, משלוח, זמנים, מבצעים, תשלום, כתובת): רק מה שכתוב במידע שלמטה. מחיר תמיד מדויק כפי שמופיע ברשימת המוצרים. פרט שלא מופיע — אל תמציא; תגיד שאין לך אותו ושנבדוק בוואטסאפ.
- ידע כללי על הדפסת תלת מימד (חומרים, חוזק, עמידות לחום ולמים, איך מטפלים בחפץ מודפס, מה אפשר ומה לא) — מותר לך מהידע שלך, בקצרה, וכשזה נוגע להזמנה חבר את זה למה שיש אצלנו.

איך עוזרים באמת:
- מבקשים מוצר או רעיון: חפש ברשימה לפי שם, תיאור ומדף, והצע עד 3 מתאימים עם מחיר. אם אין בדיוק — הצע את הקרוב ביותר, או את המעצב האישי (/configurator) כשהלקוח רוצה טקסט, שם או לוגו.
- תקציב ("עד 50 שקל"): רק מוצרים שהמחיר שלהם ברשימה בתוך התקציב.
- מתנה: שאל בקצרה למי אם לא ברור, והעדף מוצרים עם שם או עיצוב אישי.
- כמויות לעסק, קובץ משלהם, משהו שלא בחנות: הסבר במשפט והפנה ל-/b2b, ל-/upload או לוואטסאפ.
- אתה לא יכול לבצע הזמנה, לבדוק סטטוס של הזמנה מסוימת או לתת הנחה שלא כתובה במידע.
- שאלה שלא קשורה לחנות: משפט אחד ידידותי וחזרה לעניין.

קישורים: אם יש עמוד שעוזר, הוסף בסוף התשובה עד 3 שורות בפורמט המדויק:
LINK: <כיתוב קצר> | <נתיב שמתחיל ב-/ מהמידע, או ${"https://wa.me/972509300990"}>
בלי קישורים אחרים.`;

class KnowledgeError extends Error {
  constructor(readonly status: number) { super(`knowledge ${status}`); }
}

let knowledge: { text: string; at: number } | null = null;
async function loadKnowledge(): Promise<string> {
  if (knowledge && Date.now() - knowledge.at < 10 * 60_000) return knowledge.text;
  const res = await fetch(`${SITE}/helpbot-knowledge.txt`);
  if (!res.ok) throw new KnowledgeError(res.status);
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
      output_config: { effort: "low" },
      // The instructions and the shop's facts are the same on every call:
      // cached, they cost a tenth after the first message.
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: info, cache_control: { type: "ephemeral" } },
      ],
      messages: history,
    });

    if (response.stop_reason === "refusal") return json({ text: null, reason: "refusal" }, 200, headers);
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
    // Only the kind of failure, never a message: enough to tell a missing key
    // (anthropic_401), no credit (anthropic_400/402/403) or an unreachable
    // site (knowledge_404) apart from the outside. The site then falls back
    // to its built-in answers.
    const reason =
      e instanceof KnowledgeError ? `knowledge_${e.status}`
      : e instanceof Anthropic.APIError ? `anthropic_${e.status ?? "network"}`
      : !Deno.env.get("ANTHROPIC_API_KEY") ? "no_key"
      : "error";
    return json({ text: null, reason }, 200, headers);
  }
});
