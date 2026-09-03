import type { ConfigProduct, Product, Size } from "./types";

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

export const PRODUCTS: Product[] = [...PET_PRODUCTS, ...OFFICE_PRODUCTS];
export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const CATEGORY_LABEL: Record<Product["category"], string> = {
  pets: "לחיות",
  office: "למשרד",
  home: "לבית",
};

// ─── Configurator products (what the designer can be applied to) ─────────────
const PLATE_SIZES: Size[] = [
  { id: "sm", label: "שולחני", dim: "120×35mm", priceAdd: 0, time: "2h" },
  { id: "md", label: "לדלת", dim: "180×50mm", priceAdd: 25, time: "3h" },
  { id: "lg", label: "גדול", dim: "250×70mm", priceAdd: 55, time: "4.5h" },
];

const COASTER_SIZES: Size[] = [
  { id: "sm", label: "יחידה", dim: "Ø90mm", priceAdd: 0, time: "40min" },
  { id: "md", label: "סט 4", dim: "Ø90mm ×4", priceAdd: 45, time: "2.5h" },
  { id: "lg", label: "סט 6", dim: "Ø90mm ×6", priceAdd: 70, time: "3.8h" },
];

export const CONFIG_PRODUCTS: ConfigProduct[] = [
  {
    id: "keychain", label: "מחזיק מפתחות", desc: "שם, מספר אישי, סמל יחידה.",
    art: "keychain", basePrice: 55, hours: 1.5, grams: 12, material: "pla_plus",
    hasShape: true, hasSize: true, hasText: true, hasDesigner: true, face: [50, 35],
  },
  {
    id: "dog_tag", label: "דיסקית", desc: "דיסקית צבאית עם שרשרת.",
    art: "dogtag", basePrice: 60, hours: 1, grams: 10, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [50, 28],
  },
  {
    id: "phone_case", label: "קייס לטלפון", desc: "TPU גמיש, עיצוב על הגב.",
    art: "phonecase", basePrice: 120, hours: 3.5, grams: 45, material: "tpu",
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
    id: "lighter_case", label: "קייס למצית", desc: "נרתיק ל-BIC עם עיצוב בחזית.",
    art: "lighter", basePrice: 45, hours: 1.2, grams: 14, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [24, 60],
    models: {
      label: "סוג המצית",
      items: [{ id: "bic-j26", label: "BIC רגיל (J26)" }, { id: "bic-j25", label: "BIC מיני (J25)" }, { id: "clipper", label: "Clipper" }],
    },
  },
  {
    id: "luggage_tag", label: "תג למזוודה", desc: "שם וטלפון, רצועה כלולה.",
    art: "luggage", basePrice: 50, hours: 1.3, grams: 15, material: "petg",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [85, 54],
  },
  {
    id: "name_plate", label: "שלט שם", desc: "לשולחן, לדלת המשרד או לבית.",
    art: "nameplate", basePrice: 70, hours: 2, grams: 30, material: "pla_matte",
    hasShape: false, hasSize: true, hasText: true, hasDesigner: true, face: [120, 35], sizes: PLATE_SIZES,
  },
  {
    id: "coaster", label: "תחתית לכוס", desc: "עגולה, עם שם או עיצוב.",
    art: "coaster", basePrice: 35, hours: 0.7, grams: 15, material: "pla_matte",
    hasShape: false, hasSize: true, hasText: true, hasDesigner: true, face: [90, 90], sizes: COASTER_SIZES,
  },
  {
    id: "wall_hook", label: "וו לקיר", desc: "עם מילה או שם על הבסיס.",
    art: "hook", basePrice: 40, hours: 1, grams: 20, material: "petg",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: false, face: [60, 40],
  },
  {
    id: "cable_clip", label: "קליפ לכבלים", desc: "קליפ שולחני, ללא טקסט.",
    art: "cableclip", basePrice: 25, hours: 0.4, grams: 6, material: "tpu",
    hasShape: false, hasSize: false, hasText: false, hasDesigner: false, face: [25, 20],
  },
  {
    id: "bookmark", label: "סימנייה", desc: "דקה, עם שם או עיצוב.",
    art: "bookmark", basePrice: 30, hours: 0.6, grams: 6, material: "pla_plus",
    hasShape: false, hasSize: false, hasText: true, hasDesigner: true, face: [40, 140],
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
