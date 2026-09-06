import type { ConfigProduct, Product, ProductCategory, Shape, Size } from "./types";
import { IMPORTED, importedProducts } from "./imported";

/**
 * A photograph for a designer option.
 *
 * The ten bases are shapes, not catalogue rows, so they had only drawings. A
 * drawing next to ten photographs reads as a placeholder, so each base borrows
 * the picture of a real printed thing of that kind from the imported shelf -
 * no new asset, and it is a genuine print either way.
 */
const shelfPhoto = (id: string): string | undefined => IMPORTED.find((m) => m.id === id)?.image;

// ─── Pet tags (תגים לחיות) ────────────────────────────────────────────────────
const PET_ENGRAVING = {
  label: "שם החיה",
  placeholder: "לוקה",
  max: 12,
  second: { label: "טלפון (על הגב)", placeholder: "050-0000000", max: 14 },
};

export const PET_PRODUCTS: Product[] = [
  {
    id: "pet-bone",
    category: "pets",
    name: "תג עצם",
    desc: "הקלאסי. שם מלפנים, טלפון מאחור. טבעת נירוסטה כלולה.",
    price: 35, size: "40×22mm", time: "35min", hours: 0.6, grams: 6,
    art: "bone", hue: 30, tag: "נמכר ביותר", ams: true, material: "petg",
    engraving: PET_ENGRAVING,
    options: { label: "טבעת", items: [{ id: "ring-std", label: "טבעת נירוסטה", priceAdd: 0 }, { id: "ring-carabiner", label: "קרבינר מיני", priceAdd: 6 }] },
  },
  {
    id: "pet-round",
    category: "pets",
    name: "תג עגול",
    desc: "מטבע 30mm עם שם גדול. מתאים לקולרים דקים.",
    price: 30, size: "Ø30mm", time: "30min", hours: 0.5, grams: 5,
    art: "round", hue: 200, ams: true, material: "petg", engraving: PET_ENGRAVING,
  },
  {
    id: "pet-heart",
    category: "pets",
    name: "תג לב",
    desc: "לכלבים וחתולים שהם בני משפחה. שני צבעים ב-AMS.",
    price: 35, size: "34×30mm", time: "35min", hours: 0.6, grams: 6,
    art: "heart", hue: 340, ams: true, material: "petg", engraving: PET_ENGRAVING,
  },
  {
    id: "pet-fish",
    category: "pets",
    name: "תג דג לחתול",
    desc: "קטן וקל (4 גרם) כדי שהחתול לא ירגיש. שם + טלפון.",
    price: 32, size: "36×18mm", time: "25min", hours: 0.45, grams: 4,
    art: "fish", hue: 190, ams: true, material: "petg", engraving: PET_ENGRAVING,
  },
  {
    id: "pet-paw",
    category: "pets",
    name: "תג כף רגל",
    desc: "כף רגל מובלטת בצבע שני, שם חרוט בבסיס.",
    price: 35, size: "32×32mm", time: "35min", hours: 0.6, grams: 6,
    art: "paw", hue: 25, ams: true, material: "petg", engraving: PET_ENGRAVING,
  },
  {
    id: "pet-qr",
    category: "pets",
    name: "תג עם QR",
    desc: "קוד QR מודפס שמוביל לעמוד עם פרטי הקשר. משנים את הפרטים בלי להדפיס תג חדש.",
    price: 45, size: "35×35mm", time: "45min", hours: 0.75, grams: 8,
    art: "qr", hue: 120, tag: "חדש", ams: true, material: "petg",
    engraving: { label: "שם החיה", placeholder: "לוקה", max: 12 },
  },
  {
    id: "pet-bag-holder",
    category: "pets",
    name: "מחזיק שקיות לרצועה",
    desc: "נתלה על הרצועה, מחזיק גליל שקיות. פתיחה בסיבוב.",
    price: 40, size: "Ø45×80mm", time: "1.5h", hours: 1.5, grams: 22,
    art: "bagholder", hue: 90, material: "petg",
    options: { label: "חיבור", items: [{ id: "clip", label: "קליפ לרצועה", priceAdd: 0 }, { id: "carabiner", label: "קרבינר", priceAdd: 6 }] },
  },
  {
    id: "pet-scoop",
    category: "pets",
    name: "כף מדידה למזון",
    desc: "כף 1 כוס עם שם החיה על הידית. נכנסת לשק המזון.",
    price: 38, size: "180×70mm", time: "2h", hours: 2, grams: 32,
    art: "scoop", hue: 45, material: "petg",
    engraving: { label: "טקסט על הידית", placeholder: "לוקה · בוקר", max: 16 },
  },
];

// ─── Office & home (מוצרים למשרד ולבית) ──────────────────────────────────────
export const OFFICE_PRODUCTS: Product[] = [
  {
    id: "off-pen-holder",
    category: "office",
    name: "מעמד עטים משושה",
    desc: "3 תאים בגבהים שונים. שם או לוגו חרוט בחזית.",
    price: 55, size: "110×95×90mm", time: "3.5h", hours: 3.5, grams: 58,
    art: "penholder", hue: 200, tag: "פופולרי", material: "pla_matte",
    engraving: { label: "טקסט בחזית", placeholder: "אלון", max: 14 },
  },
  {
    id: "off-cable-clips",
    category: "office",
    name: "סט 6 קליפסים לכבלים",
    desc: "מדבקת 3M מאחור. מחזיקים כבל טעינה על שולחן או ליד המיטה.",
    price: 30, size: "25×20mm ×6", time: "50min", hours: 0.85, grams: 14,
    art: "cableclip", hue: 160, material: "tpu",
  },
  {
    id: "off-headphone-stand",
    category: "office",
    name: "מעמד לאוזניות",
    desc: "בסיס כבד, זרוע מעוגלת שלא מועכת את הריפוד.",
    price: 85, size: "120×100×250mm", time: "6h", hours: 6, grams: 120,
    art: "headphones", hue: 260, material: "pla_matte",
    engraving: { label: "טקסט על הבסיס", placeholder: "STUDIO", max: 12 },
  },
  {
    id: "off-phone-stand",
    category: "office",
    name: "מעמד לטלפון",
    desc: "זווית 60°, פתח לכבל טעינה. מתאים לכל גודל טלפון.",
    price: 35, size: "80×70×90mm", time: "1.8h", hours: 1.8, grams: 28,
    art: "phonestand", hue: 210, material: "pla_plus",
  },
  {
    id: "home-coasters",
    category: "home",
    name: "סט 4 תחתיות לכוסות",
    desc: "משושה, 4 צבעים שונים או שם/אמוג'י על כל אחת.",
    price: 50, size: "Ø90mm ×4", time: "2.4h", hours: 2.4, grams: 60,
    art: "coaster", hue: 20, ams: true, material: "pla_matte",
    engraving: { label: "טקסט על התחתיות", placeholder: "משפחת כהן", max: 14 },
  },
  {
    id: "home-wall-hook",
    category: "home",
    name: "וו לקיר",
    desc: "מחזיק עד 5 ק\"ג. בורג + דיבל כלולים. גם עם שם.",
    price: 28, size: "60×40×35mm", time: "1h", hours: 1, grams: 18,
    art: "hook", hue: 40, material: "petg",
    engraving: { label: "טקסט על הוו", placeholder: "מפתחות", max: 10 },
  },
  {
    id: "home-key-rack",
    category: "home",
    name: "מתלה מפתחות לקיר",
    desc: "4 ווים + מדף קטן לדואר. שם המשפחה מובלט.",
    price: 75, size: "220×80×40mm", time: "4.5h", hours: 4.5, grams: 85,
    art: "keyrack", hue: 30, ams: true, material: "pla_plus",
    engraving: { label: "שם המשפחה", placeholder: "משפחת לוי", max: 14 },
  },
  {
    id: "off-card-holder",
    category: "office",
    name: "מעמד כרטיסי ביקור",
    desc: "מחזיק 40 כרטיסים בזווית. לוגו בחזית ב-AMS.",
    price: 40, size: "95×50×40mm", time: "1.6h", hours: 1.6, grams: 26,
    art: "cardholder", hue: 220, ams: true, material: "pla_matte",
    engraving: { label: "טקסט / שם החברה", placeholder: "Unit 3D", max: 16 },
  },
  {
    id: "home-planter",
    category: "home",
    name: "עציץ גיאומטרי",
    desc: "עם צלחת ניקוז נסתרת. לסוקולנטים ולקקטוסים.",
    price: 45, size: "Ø100×90mm", time: "3h", hours: 3, grams: 55,
    art: "planter", hue: 140, material: "petg",
    options: { label: "גודל", items: [{ id: "s", label: "קטן Ø80", priceAdd: 0 }, { id: "m", label: "בינוני Ø100", priceAdd: 10 }, { id: "l", label: "גדול Ø130", priceAdd: 25 }] },
  },
  {
    id: "home-bag-clips",
    category: "home",
    name: "סט 4 קליפסים לשקיות",
    desc: "סוגרים שקית חטיפים או קפה. TPU שלא נשבר.",
    price: 25, size: "70×25mm ×4", time: "1.2h", hours: 1.2, grams: 20,
    art: "bagclip", hue: 350, material: "tpu",
  },
  {
    id: "off-bookmark",
    category: "office",
    name: "סימנייה עם שם",
    desc: "דקה (1.2mm), שם מובלט, חור לשרוך.",
    price: 22, size: "140×40mm", time: "35min", hours: 0.6, grams: 6,
    art: "bookmark", hue: 280, ams: true, material: "pla_plus",
    engraving: { label: "שם", placeholder: "נועה", max: 12 },
  },
  {
    id: "home-door-sign",
    category: "home",
    name: "שלט לדלת",
    desc: "שם המשפחה או מספר דירה. אותיות מובלטות בצבע שני.",
    price: 65, size: "180×60mm", time: "2.5h", hours: 2.5, grams: 42,
    art: "doorsign", hue: 60, ams: true, material: "petg",
    engraving: { label: "טקסט על השלט", placeholder: "משפחת ישראלי", max: 18 },
  },
  {
    id: "off-organizer",
    category: "office",
    name: "מארגן מגירה",
    desc: "מודולרי: 3 תאים שנצמדים זה לזה. לשולחן או למטבח.",
    price: 48, size: "200×100×40mm", time: "3.2h", hours: 3.2, grams: 64,
    art: "organizer", hue: 180, material: "pla",
    options: { label: "מספר תאים", items: [{ id: "3", label: "3 תאים", priceAdd: 0 }, { id: "5", label: "5 תאים", priceAdd: 20 }] },
  },
];


// ─── Statues & display pieces (פסלים) ────────────────────────────────────────
// Display prints: bigger, slower, heavier than the everyday shelf. Priced on
// print hours rather than on the little bit of filament they use.
export const STATUE_PRODUCTS: Product[] = [
  {
    id: "st-bust",
    category: "statues",
    name: "בוסט דיוקן",
    desc: "בוסט 150mm על בסיס. מתמונה שלך או מקובץ מוכן. גימור מאט שמסתיר שכבות.",
    price: 320, size: "150mm", time: "11h", hours: 11, grams: 190,
    art: "bust", hue: 35, tag: "עבודת יד", material: "pla_matte", colors: 1,
    options: { label: "גובה", items: [{ id: "h120", label: "120mm", priceAdd: 0 }, { id: "h150", label: "150mm", priceAdd: 60 }, { id: "h200", label: "200mm", priceAdd: 150 }] },
  },
  {
    id: "st-dragon",
    category: "statues",
    name: "פסל דרקון",
    desc: "דרקון שוכב על בסיס סלע, 220mm. הפסל שהכי מבקשים למדף גיימינג.",
    price: 280, size: "220×130mm", time: "14h", hours: 14, grams: 215,
    art: "dragonstatue", hue: 145, tag: "נמכר ביותר", material: "pla_matte", ams: true, colors: 2,
  },
  {
    id: "st-lowpoly",
    category: "statues",
    name: "חיה בלואו-פולי",
    desc: "צבי, זאב או ינשוף בסגנון מצולעים. חד, מודרני, מדהים ב-PLA משי.",
    price: 150, size: "140mm", time: "6h", hours: 6, grams: 95,
    art: "lowpoly", hue: 190, material: "pla_silk", colors: 1,
    options: { label: "דגם", items: [{ id: "deer", label: "צבי", priceAdd: 0 }, { id: "wolf", label: "זאב", priceAdd: 0 }, { id: "owl", label: "ינשוף", priceAdd: 0 }, { id: "lion", label: "אריה", priceAdd: 15 }] },
  },
  {
    id: "st-chess",
    category: "statues",
    name: "סט שחמט מודפס",
    desc: "32 כלים בשני צבעים, מלך 75mm. בלי לוח. הכלים מגיעים משוקללים בבסיס.",
    price: 420, size: "מלך 75mm", time: "22h", hours: 22, grams: 340,
    art: "chess", hue: 260, material: "pla_plus", ams: true, colors: 2, isNew: true,
  },
  {
    id: "st-trophy",
    category: "statues",
    name: "גביע / פרס מותאם",
    desc: "פרס לתחרות, לטורניר או ל\"עובד החודש\". שם ותאריך חרוטים בבסיס.",
    price: 190, size: "180mm", time: "8h", hours: 8, grams: 130,
    art: "trophy", hue: 45, material: "pla_silk", ams: true, colors: 2,
    engraving: { label: "טקסט על הבסיס", placeholder: "אלוף 2026", max: 22, second: { label: "שורה שנייה", placeholder: "מועדון הכדורסל", max: 22 } },
  },
  {
    id: "st-vase",
    category: "statues",
    name: "אגרטל ספירלה",
    desc: "הדפסת vase-mode בקיר אחד: קווים רציפים, אור עובר דרכם. אטום למים עם ליינר.",
    price: 110, size: "Ø120×220mm", time: "5h", hours: 5, grams: 105,
    art: "vase", hue: 165, material: "pla_silk", colors: 1,
    options: { label: "גובה", items: [{ id: "v160", label: "160mm", priceAdd: 0 }, { id: "v220", label: "220mm", priceAdd: 30 }, { id: "v280", label: "280mm", priceAdd: 70 }] },
  },
  {
    id: "st-moon",
    category: "statues",
    name: "מנורת ירח",
    desc: "כדור ירח 150mm עם מכתשים אמיתיים מנתוני נאס\"א, מואר מבפנים. בסיס עץ כלול.",
    price: 175, size: "Ø150mm", time: "9h", hours: 9, grams: 120,
    art: "moon", hue: 50, tag: "מתנה", material: "pla", colors: 1,
  },
  {
    id: "st-torso",
    category: "statues",
    name: "פסל קלאסי",
    desc: "טורסו בהשראת פיסול יווני, 200mm. מאט לבן או שיש. לחדר עבודה ולסטודיו.",
    price: 230, size: "200mm", time: "12h", hours: 12, grams: 175,
    art: "torso", hue: 210, material: "pla_matte", colors: 1,
  },
];

// The hand-written catalogue plus anything pulled in by the MakerWorld import
// (empty until `npm run import:makerworld` has run).
export const PRODUCTS: Product[] = [
  ...PET_PRODUCTS,
  ...OFFICE_PRODUCTS,
  ...STATUE_PRODUCTS,
  ...importedProducts(),
];

/**
 * Every product on one shelf that we can show a photograph of.
 *
 * A shop page full of drawings reads as a shop that has never printed
 * anything, so a product with no `image` is not listed. It still exists in
 * PRODUCTS (its own page and the admin costing still work) — it is simply not
 * put on a shelf until there is a picture of it.
 */
export const productsByCategory = (...cats: ProductCategory[]): Product[] =>
  PRODUCTS.filter((p) => cats.includes(p.category) && !!p.image);

/** Including the ones with no photograph — for /admin and internal tooling. */
export const allProductsByCategory = (...cats: ProductCategory[]): Product[] =>
  PRODUCTS.filter((p) => cats.includes(p.category));
export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const CATEGORY_LABEL: Record<Product["category"], string> = {
  pets: "לחיות",
  office: "למשרד",
  home: "לבית",
  trendy: "טרנדי",
  statues: "פסלים",
  screen: "סרטים וסדרות",
  smoke: "מוצרי עישון",
  b2b: "לעסקים",
};

// ─── Listing stats for products (demo counters until there is a backend) ─────
const PRODUCT_STATS: Record<string, { rating: number; orders: number; colors?: number; isNew?: boolean }> = {
  "pet-bone": { rating: 4.9, orders: 412, colors: 2 },
  "pet-round": { rating: 4.7, orders: 188, colors: 2 },
  "pet-heart": { rating: 4.8, orders: 240, colors: 2 },
  "pet-fish": { rating: 4.8, orders: 133, colors: 2 },
  "pet-paw": { rating: 4.7, orders: 156, colors: 2 },
  "pet-qr": { rating: 4.9, orders: 97, colors: 3, isNew: true },
  "pet-bag-holder": { rating: 4.6, orders: 64 },
  "pet-scoop": { rating: 4.7, orders: 51 },
  "off-pen-holder": { rating: 4.8, orders: 233, colors: 2 },
  "off-cable-clips": { rating: 4.5, orders: 310 },
  "off-headphone-stand": { rating: 4.9, orders: 142 },
  "off-phone-stand": { rating: 4.7, orders: 388 },
  "home-coasters": { rating: 4.8, orders: 176, colors: 4 },
  "home-wall-hook": { rating: 4.6, orders: 201 },
  "home-key-rack": { rating: 4.9, orders: 88, colors: 2 },
  "off-card-holder": { rating: 4.7, orders: 73, colors: 2 },
  "home-planter": { rating: 4.8, orders: 119 },
  "home-bag-clips": { rating: 4.4, orders: 264 },
  "st-bust": { rating: 5.0, orders: 41 },
  "st-dragon": { rating: 4.9, orders: 128, colors: 2 },
  "st-lowpoly": { rating: 4.8, orders: 96 },
  "st-chess": { rating: 4.9, orders: 34, colors: 2, isNew: true },
  "st-trophy": { rating: 4.8, orders: 67, colors: 2 },
  "st-vase": { rating: 4.7, orders: 152 },
  "st-moon": { rating: 4.9, orders: 205 },
  "st-torso": { rating: 4.7, orders: 58 },
  "off-bookmark": { rating: 4.6, orders: 95, colors: 2 },
  "home-door-sign": { rating: 4.9, orders: 61, colors: 2, isNew: true },
  "off-organizer": { rating: 4.7, orders: 108 },
};

for (const p of PRODUCTS) {
  const st = PRODUCT_STATS[p.id];
  if (!st) continue;
  p.rating ??= st.rating;
  p.orders ??= st.orders;
  p.colors ??= st.colors ?? (p.ams ? 2 : 1);
  p.isNew ??= st.isNew;
}

// ─── Fidget stats (rating/orders derived from downloads when not set) ────────
const FIDGET_STATS: Record<string, { rating: number; orders: number }> = {
  f1: { rating: 4.9, orders: 780 }, f2: { rating: 4.9, orders: 1240 }, f3: { rating: 4.7, orders: 210 },
  f4: { rating: 4.6, orders: 160 }, f5: { rating: 4.8, orders: 530 }, f6: { rating: 4.8, orders: 340 },
  f10: { rating: 4.9, orders: 610 }, f11: { rating: 4.9, orders: 890 }, f12: { rating: 4.7, orders: 300 },
  f13: { rating: 4.8, orders: 410 }, f14: { rating: 4.7, orders: 270 }, f15: { rating: 4.6, orders: 150 },
};

export function fidgetStats(f: { id: string; downloads?: number; ams?: boolean; variants?: { colors: number }[]; rating?: number; orders?: number }) {
  const st = FIDGET_STATS[f.id];
  const colors = f.variants?.length ? Math.max(...f.variants.map((v) => v.colors)) : f.ams ? 2 : 1;
  return {
    rating: f.rating ?? st?.rating ?? 4.7,
    orders: f.orders ?? st?.orders ?? Math.max(20, Math.round((f.downloads ?? 800) / 40)),
    colors,
  };
}

// ─── Configurator products (what the designer can be applied to) ─────────────
const PLATE_SIZES: Size[] = [
  { id: "sm", label: "שולחני", dim: "120×35mm", priceAdd: 0, time: "2h" },
  { id: "md", label: "לדלת", dim: "180×50mm", priceAdd: 25, time: "3h" },
  { id: "lg", label: "גדול", dim: "250×70mm", priceAdd: 55, time: "4.5h" },
];

/** Pet-tag silhouettes. The shape IS the product here, so it gets its own list. */
const PET_TAG_SHAPES: Shape[] = [
  { id: "bone", label: "עצם", icon: "🦴" },
  { id: "round", label: "עגול", icon: "●" },
  { id: "heart", label: "לב", icon: "♥" },
  { id: "fish", label: "דג", icon: "🐟" },
  { id: "paw", label: "כף רגל", icon: "🐾" },
];

/** Pet tags are small; the ladder is tighter than the keychain's. */
const PET_TAG_SIZES: Size[] = [
  { id: "sm", label: "לחתול", dim: "30×18mm", priceAdd: 0, time: "25min" },
  { id: "md", label: "בינוני", dim: "40×24mm", priceAdd: 5, time: "35min" },
  { id: "lg", label: "לכלב גדול", dim: "50×30mm", priceAdd: 10, time: "45min" },
];

const COASTER_SIZES: Size[] = [
  { id: "sm", label: "יחידה", dim: "Ø90mm", priceAdd: 0, time: "40min" },
  { id: "md", label: "סט 4", dim: "Ø90mm ×4", priceAdd: 45, time: "2.5h" },
  { id: "lg", label: "סט 6", dim: "Ø90mm ×6", priceAdd: 70, time: "3.8h" },
];

export const CONFIG_PRODUCTS: ConfigProduct[] = [
  {
    id: "keychain", label: "מחזיק מפתחות", desc: "שם, מספר אישי, סמל יחידה.",
    art: "keychain", image: shelfPhoto("mw-65972"), basePrice: 55, hours: 1.5, grams: 12, material: "pla_plus",
    hasShape: true, hasSize: true, hasText: true, hasDesigner: true, face: [50, 35],
  },
  {
    id: "pet_tag", label: "תג לחיה", desc: "שם מלפנים, טלפון מאחור. חמש צורות.",
    art: "bone", image: shelfPhoto("mw-2868647"), basePrice: 35, hours: 0.6, grams: 6, material: "petg",
    hasShape: true, shapes: PET_TAG_SHAPES, hasSize: true, sizes: PET_TAG_SIZES,
    hasText: true, hasDesigner: true, face: [40, 24],
  },
  {
    id: "dog_tag", label: "דיסקית", desc: "דיסקית צבאית עם שרשרת.",
    art: "dogtag", image: shelfPhoto("mw-2335039"), basePrice: 60, hours: 1, grams: 10, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [50, 28],
  },
  {
    id: "phone_case", label: "קייס לטלפון", desc: "TPU גמיש, עיצוב על הגב.",
    art: "phonecase", image: shelfPhoto("mw-1835046"), basePrice: 120, hours: 3.5, grams: 45, material: "tpu",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [70, 145],
    models: {
      label: "דגם הטלפון",
      items: [
        { id: "ip16", label: "iPhone 16" }, { id: "ip16p", label: "iPhone 16 Pro" }, { id: "ip16pm", label: "iPhone 16 Pro Max" },
        { id: "ip15", label: "iPhone 15" }, { id: "ip15p", label: "iPhone 15 Pro" }, { id: "ip14", label: "iPhone 14" }, { id: "ip13", label: "iPhone 13" },
        { id: "s25", label: "Galaxy S25" }, { id: "s24", label: "Galaxy S24" }, { id: "s23", label: "Galaxy S23" }, { id: "a55", label: "Galaxy A55" },
        { id: "px9", label: "Pixel 9" }, { id: "px8", label: "Pixel 8" },
        { id: "other", label: "אחר (כתוב בטופס)" },
      ],
    },
  },
  {
    // The Clipper case the owner sent is licensed BY-NC-SA — non-commercial —
    // so the shelf photo comes from the BIC sleeve, which is not.
    id: "lighter_case", label: "קייס למצית", desc: "נרתיק ל-BIC עם עיצוב בחזית.",
    art: "lighter", image: shelfPhoto("mw-96585"), basePrice: 45, hours: 1.2, grams: 14, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [24, 60],
    models: {
      label: "סוג המצית",
      items: [{ id: "bic-j26", label: "BIC רגיל (J26)" }, { id: "bic-j25", label: "BIC מיני (J25)" }, { id: "clipper", label: "Clipper" }],
    },
  },
  {
    id: "luggage_tag", label: "תג למזוודה", desc: "שם וטלפון, רצועה כלולה.",
    art: "luggage", image: shelfPhoto("mw-35620"), basePrice: 50, hours: 1.3, grams: 15, material: "petg",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [85, 54],
  },
  {
    id: "name_plate", label: "שלט שם", desc: "לשולחן, לדלת המשרד או לבית.",
    art: "nameplate", image: shelfPhoto("mw-41887"), basePrice: 70, hours: 2, grams: 30, material: "pla_matte",
    hasShape: false, hasSize: true, hasText: true, hasDesigner: true, face: [120, 35], sizes: PLATE_SIZES,
  },
  {
    id: "coaster", label: "תחתית לכוס", desc: "עגולה, עם שם או עיצוב.",
    art: "coaster", image: shelfPhoto("mw-13127"), basePrice: 35, hours: 0.7, grams: 15, material: "pla_matte",
    hasShape: false, hasSize: true, hasText: true, hasDesigner: true, face: [90, 90], sizes: COASTER_SIZES,
  },
  {
    id: "wall_hook", label: "וו לקיר", desc: "עם מילה או שם על הבסיס.",
    art: "hook", image: shelfPhoto("mw-59837"), basePrice: 40, hours: 1, grams: 20, material: "petg",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: false, face: [60, 40],
  },
  {
    id: "cable_clip", label: "קליפ לכבלים", desc: "קליפ שולחני, ללא טקסט.",
    art: "cableclip", image: shelfPhoto("mw-26130"), basePrice: 25, hours: 0.4, grams: 6, material: "tpu",
    hasShape: false, hasSize: false, hasText: false, hasDesigner: false, face: [25, 20],
  },
  {
    id: "bookmark", label: "סימנייה", desc: "דקה, עם שם או עיצוב.",
    art: "bookmark", image: shelfPhoto("mw-26009"), basePrice: 30, hours: 0.6, grams: 6, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [40, 140],
  },
  {
    id: "bag_tag", label: "BAG TAG", desc: "תג לתיק אימון או לתיק גולף.",
    art: "bagtag", image: shelfPhoto("mw-710726"), basePrice: 45, hours: 0.9, grams: 13, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [55, 80],
  },
  {
    id: "brush_case", label: "כיס מברשות נייד", desc: "נרתיק סגור למברשות איפור או צבע.",
    art: "brushcase", image: shelfPhoto("mw-1298742"), basePrice: 95, hours: 3.6, grams: 110, material: "petg",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [60, 150],
  },
  {
    id: "poker_chip", label: "ז'יטון פוקר", desc: "עם לוגו, שם או מספר. סטים לפי הזמנה.",
    art: "pokerchip", image: shelfPhoto("mw-741443"), basePrice: 12, hours: 0.24, grams: 4, material: "pla_matte",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [39, 39],
  },
  {
    id: "ashtray", label: "מאפרה", desc: "מאפרה שולחנית, עם שם או עיצוב בתחתית.",
    art: "ashtray", image: shelfPhoto("mw-697819"), basePrice: 40, hours: 0.6, grams: 20, material: "petg",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [70, 70],
  },
];

export const CONFIG_PRODUCT_BY_ID = Object.fromEntries(CONFIG_PRODUCTS.map((p) => [p.id, p])) as Record<ConfigProduct["id"], ConfigProduct>;

// ─── Fidget weight estimates (grams) — kept here so /admin and the detail page agree ──
export const FIDGET_WEIGHTS: Record<string, number> = {
  "mw-01": 38, "mw-02": 108, "mw-03": 155, "mw-04": 18, "mw-05": 15,
  "mw-06": 7, "mw-07": 19, "mw-08": 26, "mw-09": 92, "mw-10": 130,
  "mw-11": 55, "mw-12": 48,
  f1: 22, f2: 35, f3: 48, f4: 40, f5: 70, f6: 45,
};

export function fidgetGrams(f: { id: string; time: string }): number {
  if (FIDGET_WEIGHTS[f.id]) return FIDGET_WEIGHTS[f.id];
  const m = f.time.match(/([\d.]+)/);
  return Math.round((m ? parseFloat(m[1]) : 1) * 12);
}
