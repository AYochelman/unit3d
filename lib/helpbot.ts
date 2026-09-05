import { FAQS } from "./data";

// A small, honest help bot: it matches what you typed against a list of
// intents and answers from the same facts the site states elsewhere. There is
// no model and no server call — so it never invents a price or a delivery
// date. Anything it does not recognise is handed to a human (WhatsApp / the
// contact form) rather than guessed at.

export type BotLink = { label: string; href: string };

export type BotAnswer = {
  id: string;
  /** Words that route a question here. Matching is substring, case-folded. */
  keys: string[];
  /**
   * Question wrappers ("כמה עולה", "כמה זמן") that only route here when the
   * sentence names no other topic — otherwise "כמה עולה משלוח" would answer
   * about prices instead of about shipping.
   */
  frames?: string[];
  /** Chip shown in the suggestion row (omit to keep the intent hidden). */
  chip?: string;
  text: string;
  links?: BotLink[];
  /** Follow-up chips offered after this answer. */
  next?: string[];
};

export const BOT_GREETING =
  "היי! אני העוזר של Unit 3D. אני יכול לענות על שאלות לגבי מחירים, זמני הדפסה, חומרים, משלוחים והמוצרים באתר. במה אפשר לעזור?";

export const BOT_ANSWERS: BotAnswer[] = [
  {
    id: "price",
    chip: "כמה זה עולה?",
    keys: ["מחיר", "עלות", "תקציב", "יקר", "זול", "מחירון", "price"],
    frames: ["כמה עולה", "כמה זה", "כמה יעלה"],
    text:
      "המחיר מורכב מחומר + זמן הדפסה + עיבוד אחרי ההדפסה. למוצרי הקטלוג יש מחיר קבוע שמופיע על הכרטיס: תגים לחיות מ-₪30, מחזיקי מפתחות מ-₪45, פידג'טים מ-₪55, פסלים מ-₪110. להזמנה מיוחדת אני שולח הצעת מחיר תוך 24 שעות.",
    links: [
      { label: "טרנדי כרגע", href: "/trendy" },
      { label: "בקשת הצעת מחיר", href: "/contact" },
    ],
    next: ["shipping", "discount", "materials"],
  },
  {
    id: "time",
    chip: "כמה זמן זה לוקח?",
    keys: ["מתי יגיע", "זמן הדפסה", "מהר", "כמה ימים"],
    frames: ["כמה זמן", "תוך כמה", "מתי"],
    text:
      "רוב ההזמנות יוצאות תוך 3-5 ימי עסקים מרגע שאישרנו את העיצוב. מחזיק מפתחות פשוט לרוב תוך 48 שעות. פסלים גדולים והזמנות בכמות יכולים לקחת 7-10 ימים. אם יש לך תאריך יעד — תגיד לי אותו מראש ואני אומר לך כן או לא.",
    links: [{ label: "מעקב הזמנה", href: "/tracking" }],
    next: ["shipping", "rush"],
  },
  {
    id: "shipping",
    chip: "משלוחים",
    keys: ["משלוח", "שילוח", "דואר", "שליח", "איסוף", "לאסוף", "כתובת"],
    text:
      "דואר רשום ₪25 (3-5 ימים), שליח עד הבית ₪45 (יום-יומיים), ואיסוף עצמי מפתח תקווה בחינם. מעל ₪200 המשלוח חינם.",
    next: ["time", "payment"],
  },
  {
    id: "materials",
    chip: "באיזה חומרים?",
    keys: ["חומר", "פילמנט", "pla", "petg", "tpu", "abs", "רזין", "resin", "משי", "silk", "מאט"],
    text:
      "PLA ו-PLA+ לחפצים יומיומיים, PLA מאט לגימור נקי בלי שכבות, PLA משי לברק מתכתי, PETG לכל מה שיושב בשמש או במים (תגים לחיות, חלקי רכב), TPU גמיש לקייסים, ו-ABS לחלקים הנדסיים. אם תגיד לי איפה החפץ הולך לחיות — אני אבחר במקומך.",
    next: ["colors", "price"],
  },
  {
    id: "colors",
    chip: "צבעים ו-AMS",
    keys: ["צבע", "צבעים", "ams", "רב צבעי", "דו צבעי", "שני צבעים"],
    text:
      "אני מדפיס עם AMS, כלומר עד 4 צבעים באותה הדפסה בלי להדביק כלום. תוספת של ₪15 לשני צבעים, ₪25 לשלושה, ₪35 לארבעה. בכל עמוד מוצר אפשר לבחור צבע ולראות איך זה נראה.",
    links: [{ label: "מעצב אישי", href: "/configurator" }],
    next: ["materials", "designer"],
  },
  {
    id: "file",
    chip: "יש לי קובץ משלי",
    keys: ["קובץ", "stl", "obj", "3mf", "מודל שלי", "להעלות", "העלאה", "שרטוט"],
    text:
      "אפשר להעלות STL / OBJ / 3MF עד 50MB בעמוד ההעלאה, או פשוט לשלוח בוואטסאפ. אני בודק את הקובץ, אומר לך אם צריך תיקון, ומחזיר מחיר וזמן הדפסה.",
    links: [{ label: "העלאת קובץ", href: "/upload" }],
    next: ["price", "time"],
  },
  {
    id: "designer",
    chip: "לעצב משהו בעצמי",
    keys: ["לעצב", "מעצב", "עיצוב אישי", "טקסט", "פונט", "לחרוט", "חריטה", "שם על"],
    text:
      "במעצב האישי בוחרים מוצר (מחזיק מפתחות, קייס לטלפון, קייס למצית, תג למזוודה, שלט שם, תחתית, סימנייה ועוד), ואז מוסיפים טקסט בעברית או באנגלית, צורות וצבעים — כמו בפאוור פוינט. מה שאתה מצייר זה מה שיודפס.",
    links: [{ label: "פתח את המעצב", href: "/configurator" }],
    next: ["colors", "price"],
  },
  {
    id: "units",
    chip: "סמלי יחידות",
    keys: ["סמל", "יחידה", "צהל", "צה\"ל", "גולני", "צנחנים", "חטיבה", "טקס", "השבעה", "חייל"],
    text:
      "יש קטלוג סמלי יחידות למחזיקי מפתחות, פסלי שולחן ומתנות לטקסים. אם היחידה שלך לא ברשימה — שלח לי תמונה של הסמל ואני בונה אותו.",
    links: [{ label: "קטלוג הסמלים", href: "/catalog" }],
    next: ["price", "time"],
  },
  {
    id: "pets",
    chip: "תגים לחיות",
    keys: ["כלב", "חתול", "חיה", "תג", "קולר", "לוקה"],
    text:
      "תגי שם ב-PETG שעמיד במים ובשמש: עצם, עגול, לב, דג לחתול, כף רגל ותג QR. שם מלפנים, טלפון מאחור, טבעת נירוסטה כלולה. תג לחתול שוקל 4 גרם בלבד.",
    links: [{ label: "לתגים", href: "/pets" }],
    next: ["materials", "time"],
  },
  {
    id: "fidgets",
    chip: "פידג'טים ופלקסי",
    keys: ["פידגט", "פידג'ט", "פלקסי", "flexi", "דרקון", "ספינר", "קוביה", "מפרקי"],
    text:
      "שתי מדפים: פלקסי — יצורים מפרקיים (דרקונים, נחשים, תמנונים) שיוצאים מהמדפסת כשהם כבר זזים, בלי דבק והרכבה. ופידג'טים — ספינרים, קוביות אינסוף, סליידרים וכפתורים. אפשר לסנן ביניהם בראש העמוד.",
    links: [{ label: "לפידג'טים", href: "/fidgets" }],
    next: ["price", "colors"],
  },
  {
    id: "statues",
    chip: "פסלים",
    keys: ["פסל", "פסלים", "בוסט", "אגרטל", "גביע", "מנורה", "ירח", "שחמט", "לואו פולי"],
    text:
      "עמודת הפסלים היא פריטי תצוגה בהדפסה איטית ובשכבה של 0.12mm: בוסט דיוקן, דרקון, חיות לואו-פולי, סט שחמט, גביע מותאם, אגרטל ספירלה ומנורת ירח. אלה הדפסות של 5 עד 22 שעות, ולכן הן בתור ולא נשלחות למחרת.",
    links: [{ label: "לפסלים", href: "/statues" }],
    next: ["time", "price"],
  },
  {
    id: "b2b",
    chip: "הזמנה לעסק",
    keys: ["עסק", "חברה", "לוגו", "עובדים", "כמות", "חשבונית", "b2b", "מוסד", "כנס"],
    text:
      "לעסקים אני עושה מ-10 יחידות ומעלה, עם הלוגו שלכם, אריזה אישית וחשבונית מס. מעל 5 יחידות יש 10% הנחת כמות אוטומטית.",
    links: [{ label: "עמוד עסקים", href: "/b2b" }],
    next: ["price", "shipping"],
  },
  {
    id: "discount",
    keys: ["הנחה", "כמות", "זול יותר", "מבצע", "קופון"],
    text:
      "מ-5 יחידות של אותו פריט יש 10% הנחה אוטומטית בסל. להזמנות עסקיות גדולות אפשר לדבר על מחיר נפרד.",
    next: ["b2b", "price"],
  },
  {
    id: "warranty",
    chip: "אחריות",
    keys: ["אחריות", "נשבר", "פגם", "החזר", "תקול"],
    text:
      "אם משהו נשבר תוך 30 יום משימוש סביר — אני מדפיס מחדש ושולח בחינם. אם זו הייתה תאונה, אני מדפיס שוב במחיר עלות.",
    next: ["cancel", "contact"],
  },
  {
    id: "cancel",
    keys: ["לבטל", "ביטול", "התחרטתי"],
    text:
      "אפשר לבטל עד שההדפסה מתחילה (בדרך כלל 24-48 שעות אחרי אישור העיצוב). אחרי שהמדפסת רצה — ביטול עם החזר חלקי.",
    next: ["warranty", "contact"],
  },
  {
    id: "payment",
    keys: ["תשלום", "לשלם", "אשראי", "ביט", "פייבוקס", "העברה"],
    text:
      "התשלום נסגר מול אריאל אחרי שמאשרים את ההזמנה — ביט, פייבוקס, העברה או אשראי. באתר עצמו לא נשמרים פרטי תשלום.",
    next: ["shipping", "contact"],
  },
  {
    id: "rush",
    keys: ["דחוף", "מחר", "היום", "אקספרס"],
    text:
      "יש דברים שאפשר לדחוף. תכתוב לי בוואטסאפ מה ומתי, ואני אומר לך ישר אם זה מציאותי — בלי להבטיח תאריך שלא אעמוד בו.",
    links: [{ label: "וואטסאפ", href: "https://wa.me/972500000000" }],
    next: ["time", "contact"],
  },
  {
    id: "order",
    chip: "איך מזמינים?",
    keys: ["להזמין", "הזמנה", "סל", "עגלה", "לקנות", "רכישה"],
    text:
      "בוחרים מוצר, מגדירים צבע/חומר/טקסט, ומוסיפים לסל. בסל אפשר לשנות כמות ולמחוק. בסוף שולחים את הסל דרך טופס יצירת הקשר, ואני חוזר אליך לאישור סופי ותשלום.",
    links: [{ label: "לסל / יצירת קשר", href: "/contact" }],
    next: ["payment", "shipping"],
  },
  {
    id: "track",
    keys: ["מעקב", "איפה ההזמנה", "סטטוס", "מספר הזמנה"],
    text: "בעמוד מעקב ההזמנה אפשר לראות באיזה שלב אתה. אם אין שם עדכון — תכתוב לי בוואטסאפ ואני אבדוק ידנית.",
    links: [{ label: "מעקב הזמנה", href: "/tracking" }],
    next: ["time", "contact"],
  },
  {
    id: "contact",
    chip: "לדבר עם בן אדם",
    keys: ["בן אדם", "לדבר", "טלפון", "וואטסאפ", "whatsapp", "נציג", "אריאל"],
    text: "בשמחה. הכי מהר זה וואטסאפ, ואפשר גם דרך טופס יצירת הקשר.",
    links: [
      { label: "וואטסאפ", href: "https://wa.me/972500000000" },
      { label: "טופס יצירת קשר", href: "/contact" },
    ],
  },
];

const BOT_BY_ID: Record<string, BotAnswer> = Object.fromEntries(BOT_ANSWERS.map((a) => [a.id, a]));

export const getAnswer = (id: string): BotAnswer | undefined => BOT_BY_ID[id];

/** Chips shown when the conversation starts. */
export const BOT_STARTERS = ["price", "time", "materials", "designer", "fidgets", "statues", "contact"];

const fold = (s: string) => s.toLowerCase().replace(/["'׳״.,!?]/g, "").trim();

/**
 * Route free text to an intent: the answer whose keywords match the most
 * characters wins, so "כמה זמן לוקח משלוח" prefers the shipping answer over a
 * bare "כמה" match. Returns null when nothing is close enough — the caller
 * then falls back to a human.
 */
export function matchAnswer(input: string): BotAnswer | null {
  const q = fold(input);
  if (!q) return null;

  const best = (pick: (a: BotAnswer) => string[]) => {
    let winner: BotAnswer | null = null;
    let score = 0;
    for (const a of BOT_ANSWERS) {
      let s = 0;
      for (const k of pick(a)) {
        const key = fold(k);
        if (key && q.includes(key)) s = Math.max(s, key.length);
      }
      if (s > score) {
        score = s;
        winner = a;
      }
    }
    return winner;
  };

  // A topic word always beats a bare question wrapper.
  const topic = best((a) => a.keys);
  if (topic) return topic;
  const frame = best((a) => a.frames ?? []);
  if (frame) return frame;

  // Nothing matched an intent — try the published FAQ as a second pass.
  const faq = FAQS.find((f) => {
    const words = fold(f.q).split(/\s+/).filter((w) => w.length >= 4);
    return words.some((w) => q.includes(w));
  });
  if (faq) {
    return { id: `faq-${faq.q}`, keys: [], text: faq.a, links: [{ label: "עוד שאלות נפוצות", href: "/faq" }] };
  }
  return null;
}

export const BOT_FALLBACK: BotAnswer = {
  id: "fallback",
  keys: [],
  text:
    "על זה אני לא יודע לענות בוודאות, ואני מעדיף לא לנחש. אריאל יענה לך על זה בדיוק — הכי מהר בוואטסאפ.",
  links: [
    { label: "וואטסאפ", href: "https://wa.me/972500000000" },
    { label: "טופס יצירת קשר", href: "/contact" },
    { label: "שאלות נפוצות", href: "/faq" },
  ],
};
