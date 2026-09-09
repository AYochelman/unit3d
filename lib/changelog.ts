/**
 * What was added, and when.
 *
 * A shop that is still being built is hard to hold in your head: features
 * arrive in the middle of conversations and get forgotten a week later. This is
 * the record — one line per thing that changed what the shop can do, dated,
 * newest first.
 *
 * It is written by hand rather than generated from the commit log, because a
 * commit log is a list of edits and this is a list of capabilities. Twenty
 * commits fixing one camera are one line here, and the line is what the owner
 * would say, not what the code did.
 *
 * When something ships, add it at the top of the matching day.
 */
export type ChangeKind = "feature" | "fix" | "content" | "admin";

export type ChangeItem = {
  kind: ChangeKind;
  text: string;
};

export type ChangeDay = {
  date: string;      // YYYY-MM-DD
  items: ChangeItem[];
};

export const KIND_HE: Record<ChangeKind, string> = {
  feature: "חדש",
  fix: "תיקון",
  content: "תוכן",
  admin: "ניהול",
};

export const CHANGELOG: ChangeDay[] = [
  {
    date: "2026-09-09",
    items: [
      { kind: "feature", text: "וידאו חי מהמדפסת בזמן הדפסה, דרך Cloudflare — כשלא מדפיסים חוזרים לתמונה כל 6 שניות." },
      { kind: "feature", text: "המצלמה של המדפסת עלתה לאוויר: הדף מציג את תא ההדפסה עצמו, והנורה נדלקת לבד כדי שתהיה תמונה." },
      { kind: "fix", text: "הפאנל בדף הבית הציג נתונים מומצאים — עכשיו הוא קורא את המדפסת האמיתית ומתעדכן כל שתי שניות בלי לרענן." },
      { kind: "fix", text: "כשהשידור נתקע, האתר היה מציג תמונה ישנה כאילו היא עכשיו. עכשיו הוא מזהה ומתחבר מחדש לבד." },
      { kind: "content", text: "כשאין הדפסה פעילה, דף הלייב אומר שהפלטה פנויה ומזמין להזמין." },
      { kind: "content", text: "כתובת הסטודיו תוקנה מפתח תקווה לגבעתיים בכל מקום באתר." },
      { kind: "admin", text: "לשונית הוצאות עברה למסד נתונים מאחורי התחברות — הסכומים כבר לא בקובץ ציבורי." },
      { kind: "admin", text: "כפתורים מהירים להוצאות נפוצות: Raspberry Pi, פילמנט, חלפים, אריזות, חשמל ודומיין." },
      { kind: "admin", text: "אחרי אישור, הזמנה עוברת ל„בעבודה” ונשארת שם עד שכל פריט מסומן כמוכן." },
      { kind: "admin", text: "ההתחברות לתור ההזמנות נשמרת — אין צורך להקליד מייל וסיסמה בכל פעם." },
      { kind: "feature", text: "הזמנה חייבת עכשיו לכלול כתובת מייל תקינה ומספר טלפון אמיתי." },
      { kind: "feature", text: "קודי הנחה שאתה יוצר בעצמך מלשונית ייעודית בניהול." },
      { kind: "feature", text: "הסוכן שמחבר את המדפסת לאתר רץ בלחיצה כפולה, מוצא את המספר הסידורי לבד, ויש לו בדיקת תקינות." },
      { kind: "feature", text: "אפשר להריץ את הסוכן על Raspberry Pi כשירות שעולה לבד אחרי הפסקת חשמל." },
    ],
  },
  {
    date: "2026-09-08",
    items: [
      { kind: "feature", text: "הזמנה נשלחת לוואטסאפ עם מספר הזמנה, ונכנסת לתור בניהול לאישור או דחייה." },
      { kind: "feature", text: "הלקוח מקבל מייל אישור מעוצב עם כל פרטי ההזמנה, אוטומטית." },
      { kind: "feature", text: "האתר עלה לדומיין שלו — unit-3d.com." },
      { kind: "feature", text: "סיסמה על שער הניהול, והלוגו של החנות בלשונית הדפדפן." },
      { kind: "content", text: "סמלי יחידות: כל היחידות בקטלוג קיבלו סמל, כולל 69 גדודים ברמת גדוד." },
      { kind: "content", text: "בוחרים איפה הסמל יופיע לפני שמבקשים טלפון, ויש שלושה מיקומים נוספים." },
      { kind: "content", text: "כל תמונה שהמעצב צילם מוצגת, לא רק תמונת השער." },
      { kind: "fix", text: "מחירי הפידג'טים חושבו ממשקל שאיש לא מדד — תוקן, וגם משקלי וזמני הדפסה שנסחפו." },
      { kind: "fix", text: "צבע שייך למשפחת חומרים, ואי אפשר להצליב בין משפחות." },
      { kind: "content", text: "חלקים כבדים מתומחרים בהצעת מחיר, והחנות קוראת עברית נכון." },
    ],
  },
  {
    date: "2026-09-07",
    items: [
      { kind: "admin", text: "תור אישורים: שום מודל לא מגיע לחנות בלי אישור מפורש." },
      { kind: "admin", text: "אפשר להעביר מודל בין מדפים מתוך עמוד המוצר שלו, ולפרסם בלחיצה." },
      { kind: "content", text: "כל מודל קיבל שם בעברית, משפט משלו, וכל מדף שהוא שייך אליו." },
      { kind: "content", text: "המדפסת עלתה לדף הבית — שמונה טיימלפסים אמיתיים מהפלטה." },
      { kind: "content", text: "הטלפון, האינסטגרם והמייל האמיתיים של החנות, במקום אחד." },
      { kind: "fix", text: "מודל מתומחר לפי מה שהמעצב פרסם, לא לפי הקובץ הקל ביותר שהעלה." },
      { kind: "fix", text: "הטוקן מוקלד פעם אחת בביקור, לא בכל שמירה." },
    ],
  },
  {
    date: "2026-09-06",
    items: [
      { kind: "feature", text: "עמוד טקסט אישי ושורת הגדלה בתשלום בכל מוצר." },
      { kind: "content", text: "מדף עישון נפתח, וכל תמונות הקטלוג מאוחסנות אצלנו." },
      { kind: "admin", text: "סנכרון לילי של אוספי MakerWorld — מה שנשמר שם נכנס לתור." },
    ],
  },
  {
    date: "2026-09-05",
    items: [
      { kind: "feature", text: "מחשבון משלוחים, מלאי, ותמחור חי מכל מדף." },
      { kind: "feature", text: "עורך העיצוב נפתח על המוצר שלחצת עליו, לא על הקטגוריה שלו." },
      { kind: "feature", text: "בוט עזרה, מדף פסלים, והפרדה בין פלקסי לפידג'ט." },
      { kind: "content", text: "134 מודלים מ-MakerWorld, כל אחד עם השם והתיאור שלו בעברית." },
      { kind: "content", text: "תמונות אמיתיות בכל האתר, וביקורות שמתאימות למה שמצולם לידן." },
      { kind: "content", text: "מדף סרטים וטלוויזיה עם שמונה מודלים." },
      { kind: "feature", text: "עמודי הרשימה נעשו שמישים בטלפון." },
      { kind: "admin", text: "אפשר לשמור את הגדרות החנות מתוך האתר עצמו." },
      { kind: "admin", text: "פרסום אוטומטי ל-GitHub Pages בכל דחיפה." },
    ],
  },
  {
    date: "2026-09-04",
    items: [
      { kind: "feature", text: "מדף טרנדי, סינון ומיון ברשימות, עריכת כמויות בעגלה." },
      { kind: "content", text: "לוגו מונפש בכותרת, ביקורות נעות, ותצוגת מוצרים." },
      { kind: "fix", text: "31 ממצאים מסקירת קוד עמוקה תוקנו, וכללי התמחור והעברית עודכנו בעקבותיהם." },
    ],
  },
  {
    date: "2026-09-03",
    items: [
      { kind: "feature", text: "החנות עלתה לאוויר: תגי חיות מחמד, מדף בית ומשרד, ועמודי מוצר לפידג'טים." },
      { kind: "feature", text: "מחשבון עלויות בניהול, ומעצב מוצר ל-10 מוצרים." },
      { kind: "feature", text: "הפעלה בלחיצה כפולה, ובנייה סטטית לפרסום." },
    ],
  },
];

/** Everything, flattened — used for the "כמה שינויים" line at the top. */
export const changeCount = (): number =>
  CHANGELOG.reduce((n, d) => n + d.items.length, 0);

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

/** "יום שלישי, 9 בספטמבר" — a date someone can place, not a number to decode. */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `יום ${HE_DAYS[d.getDay()]}, ${d.getDate()} ב${HE_MONTHS[d.getMonth()]}`;
}

/** How long ago, in words. A changelog is read for recency more than for dates. */
export function agoLabel(iso: string, now = new Date()): string {
  const then = new Date(`${iso}T12:00:00`).getTime();
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(new Date(then).toDateString()).getTime()) / 864e5);
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 14) return "לפני שבוע";
  if (days < 31) return `לפני ${Math.round(days / 7)} שבועות`;
  return `לפני ${Math.round(days / 30)} חודשים`;
}
