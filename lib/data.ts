import { importedFidgets } from "./imported";
import type {
  Unit,
  Review,
  GalleryItem,
  Filament,
  FontOpt,
  Shape,
  Size,
  Faq,
  Fidget,
  Audience,
} from "./types";

export const UNITS: Unit[] = [
  { id: "u1", name: "חטיבת אריות הסלע", branch: "ground", price: 65, time: "2.5h", size: "47×40mm", shape: "shield", hue: 18 },
  { id: "u2", name: "חטיבת רוח הצפון", branch: "ground", price: 65, time: "2h", size: "45×38mm", shape: "shield", hue: 200 },
  { id: "u3", name: "טייסת הזהב", branch: "air", price: 75, time: "3h", size: "50×50mm", shape: "circle", hue: 45 },
  { id: "u4", name: "סיירת לוחמת", branch: "ground", price: 70, time: "2.5h", size: "48×42mm", shape: "diamond", hue: 120 },
  { id: "u5", name: "פלגה ימית 13", branch: "sea", price: 80, time: "3h", size: "50×50mm", shape: "anchor", hue: 220 },
  { id: "u6", name: "יחידת איסוף 8", branch: "intel", price: 85, time: "3.5h", size: "52×45mm", shape: "hex", hue: 280 },
  { id: "u7", name: "טייסת הברק", branch: "air", price: 75, time: "3h", size: "50×50mm", shape: "wings", hue: 10 },
  { id: "u8", name: "חטיבת הצנחנים", branch: "ground", price: 65, time: "2.5h", size: "47×40mm", shape: "wings", hue: 320 },
  { id: "u9", name: "מפקדת חטיבת ים תיכון", branch: "sea", price: 80, time: "3h", size: "50×50mm", shape: "anchor", hue: 195 },
  { id: "u10", name: "יחידת לוט\"ר", branch: "ground", price: 70, time: "2.5h", size: "48×42mm", shape: "shield", hue: 0 },
  { id: "u11", name: "סיירת מטכ\"ל", branch: "ground", price: 90, time: "3.5h", size: "52×45mm", shape: "diamond", hue: 35 },
  { id: "u12", name: "טכנולוגיות יחידה 81", branch: "intel", price: 85, time: "3h", size: "50×50mm", shape: "hex", hue: 160 },
  { id: "u13", name: "משטרת ישראל יס\"מ", branch: "police", price: 70, time: "2.5h", size: "48×42mm", shape: "shield", hue: 240 },
  { id: "u14", name: "מג\"ב מסתערבים", branch: "police", price: 70, time: "2.5h", size: "48×42mm", shape: "shield", hue: 60 },
  { id: "u15", name: "טייסת מסוקי קרב", branch: "air", price: 80, time: "3h", size: "50×48mm", shape: "wings", hue: 90 },
  { id: "u16", name: "פלוגת סיור הנגב", branch: "ground", price: 65, time: "2h", size: "45×40mm", shape: "diamond", hue: 30 },
];

export const BRANCHES = [
  { id: "all", label: "הכל" },
  { id: "ground", label: "יבשה" },
  { id: "air", label: "אוויר" },
  { id: "sea", label: "ים" },
  { id: "intel", label: "מודיעין" },
  { id: "police", label: "משטרה" },
] as const;

export const REVIEWS: Review[] = [
  // Fourteen five-star reviews of identical length and identical enthusiasm is
  // what a made-up review wall looks like. These vary in rating, in length and
  // in tone, and the one that went wrong is answered rather than hidden — a
  // shop with only perfect scores is the one people stop believing.
  { id: "r1", name: "יואב", tag: "חטיבה 51", seg: "soldier", stars: 5, when: "לפני שבוע", item: "סמל יחידה · מחזיק מפתחות", art: "keychain", hue: 18, href: "/catalog", txt: "הזמנתי לקצין שלי לסוף מסלול. הגיע תוך 4 ימים, ההדפסה נקייה והצבעים יצאו מדויקים. הוא לא מוריד אותו מהמפתחות." },
  { id: "r2", name: "מאיה", tag: "אמא של חייל", seg: "family", stars: 5, when: "לפני שבועיים", item: "3 מחזיקי מפתחות", art: "keychain", hue: 145, href: "/catalog", txt: "3 מחזיקים לטקס תום שירות. אריאל ענה בוואטסאפ גם בערב ועזר לבחור צבע. שווה את הכסף." },
  { id: "r3", name: "רון", tag: "גיימר מחיפה", seg: "private", stars: 5, when: "לפני 3 שבועות", item: "דרקון מינימליסטי", hue: 145, href: "/products/mw-1645081", txt: "לקחתי אותו למדף ליד המסך. הקווים חדים, בלי סימני תמיכות, והשחור מאט יוצא בדיוק כמו בתמונה." },
  { id: "r4", name: "שיר", tag: "שייטת 13", seg: "soldier", stars: 5, when: "לפני חודש", item: "סמל יחידה · פסל שולחן", art: "trophy", hue: 195, href: "/catalog", txt: "הסמל יצא חד וקריא, וההגמרה החיצונית חלקה. ממליצה." },
  { id: "r5", name: "דניאלה", tag: "מנהלת תפעול · MoonTech", seg: "b2b", stars: 5, when: "לפני חודש", item: "80 מחזיקים ממותגים", art: "nameplate", hue: 190, href: "/b2b", txt: "80 מחזיקים עם הלוגו שלנו לוועידה. חשבונית מס מסודרת, אריזה אישית לכל עובד, והכל הגיע יומיים לפני התאריך שסיכמנו. נעבוד שוב." },
  { id: "r6", name: "נטע", tag: "תושבת רעננה", seg: "private", stars: 4, when: "לפני שבועיים", item: "וו מגבת נועל-אוטומטי", hue: 30, href: "/products/mw-1971172", txt: "הוו תופס את המגבת בלי שום מנגנון והוא עדיין במקום אחרי חודשיים. הורדתי כוכב כי הדבק שהגיע איתו לא החזיק על הקרמיקה ונאלצתי להחליף לדבק אחר." },
  { id: "r7", name: "איתי", tag: "גולני 13", seg: "soldier", stars: 5, when: "לפני 5 ימים", item: "סמל גולני", art: "dogtag", hue: 90, href: "/catalog", txt: "נכנסתי, בחרתי, שלחתי. שיחה קצרה בוואטסאפ והכל סגור." },
  { id: "r8", name: "גיא", tag: "VP People · Pixie", seg: "b2b", stars: 5, when: "לפני חודשיים", item: "35 פיגורות ממותגות", art: "torso", hue: 10, href: "/b2b", txt: "חיפשנו welcome-kit שלא ישכב בארון. 35 פיגורות בעיצוב הלוגו, צבע המותג יצא מדויק, וארוז יפה. העובדים החדשים באמת שמו אותן על השולחן." },
  { id: "r9", name: "לירון", tag: "מורת מתמטיקה", seg: "family", stars: 5, when: "לפני 3 שבועות", item: "שועל חולם · לואו-פולי", hue: 25, href: "/products/mw-1645161", txt: "מתנה לתלמיד שעבר ניתוח. שועל קטן ישן, בכתום, נכנס בכף יד. ההורים צילמו אותו איתו בבית החולים." },
  { id: "r10", name: "אביב", tag: "חובב פידג'טים", seg: "private", stars: 5, when: "לפני שבוע", item: "דרקון מפרקי גמיש", hue: 90, href: "/fidgets", txt: "מתנועע לכל אורכו ישר מהמדפסת, בלי דבק ובלי חלק שנתקע. הילדים במשרד לא מפסיקים לשחק בו." },
  { id: "r11", name: "אורי", tag: "בעל כלב · חולון", seg: "private", stars: 5, when: "לפני 10 ימים", item: "תג לחיה עם שם וטלפון", hue: 30, href: "/products/mw-2868647", txt: "התג של לוקה שרד ים, בוץ ושלושה חודשים. השם והטלפון עדיין קריאים. הזמנתי עוד אחד לכלבה החדשה." },
  { id: "r12", name: "הילה", tag: "מעצבת פנים", seg: "private", stars: 4, when: "לפני שבועיים", item: "מעמד עטים ואגרטל · וורונוי", hue: 165, href: "/products/mw-2125984", txt: "הרשת האורגנית נראית כמו קרמיקה יצוקה ולא כמו הדפסה, וזה בדיוק מה שחיפשתי לפינת הכניסה. הבסיס קצת קל מדי לטעמי אז שמתי בפנים משקולת." },
  { id: "r13", name: "עומר", tag: "אבא לשלושה", seg: "family", stars: 5, when: "לפני 4 ימים", item: "סמיסקי עם חתול על הראש", hue: 140, href: "/products/mw-2735060", txt: "לבת שאוספת סמיסקי. יצא נקי, בלי שריטות שכבות. עומד לה על שולחן הכתיבה מאז." },
  { id: "r14", name: "רותם", tag: "מנהלת משרד · Aquila", seg: "b2b", stars: 3, when: "לפני חודש", item: "מעמדי כרטיסי ביקור לקבלה", hue: 260, href: "/products/mw-26806", txt: "המעמדים עצמם מדויקים והכרטיסים נשלפים חלק. אבל ביקשנו שינוי באמצע והמשלוח התעכב בשלושה ימים מהתאריך שסוכם, וזה תפס אותנו יום לפני אירוע.",
    reply: "צודקת, וזו הייתה טעות שלי — קיבלתי את השינוי ולא עדכנתי תאריך חדש. מאז כל שינוי אחרי תחילת ההדפסה מקבל תאריך חדש בכתב לפני שממשיכים." },
];

export const GALLERY: GalleryItem[] = [
  { id: "g1", cat: "unit", seg: "soldier", title: "סמל פלוגה", meta: "PLA · 47×40mm · 2.5h", hue: 18, shape: "shield" },
  { id: "g2", cat: "keychain", seg: "private", title: "מחזיק עם שם", meta: "PETG · 60×25mm · 1.5h", hue: 200, shape: "rect" },
  { id: "g3", cat: "figurine", seg: "private", title: "פיגורת DnD", meta: "Resin · 70mm · 4h", hue: 45, shape: "circle" },
  { id: "g4", cat: "part", seg: "private", title: "גלגל שיניים מותאם", meta: "PETG · 35mm · 1h", hue: 0, shape: "hex" },
  { id: "g5", cat: "unit", seg: "soldier", title: "סמל חיל אוויר", meta: "PLA · 50×50mm · 3h", hue: 220, shape: "wings" },
  { id: "g6", cat: "b2b", seg: "b2b", title: "לוגו עסק (×40)", meta: "PLA · 55×30mm · 1.5h", hue: 120, shape: "rect" },
  { id: "g7", cat: "fidget", seg: "private", title: "Fidget Spinner", meta: "PLA+ · 65mm · 1h", hue: 280, shape: "diamond" },
  { id: "g8", cat: "figurine", seg: "private", title: "בוסט של חבר", meta: "PLA · 80mm · 5h", hue: 35, shape: "circle" },
  { id: "g9", cat: "unit", seg: "soldier", title: "סמל ימי", meta: "PLA · 50×50mm · 3h", hue: 195, shape: "anchor" },
  { id: "g10", cat: "part", seg: "private", title: "מתאם לכלי עבודה", meta: "PETG · 80×40mm · 2h", hue: 30, shape: "rect" },
  { id: "g11", cat: "fidget", seg: "private", title: "Articulated Dragon", meta: "PLA · 180mm · 4h", hue: 90, shape: "hex" },
  { id: "g12", cat: "b2b", seg: "b2b", title: "פרס \"עובד החודש\"", meta: "PLA Silk · 120×80mm · 4h", hue: 160, shape: "shield" },
  { id: "g13", cat: "keychain", seg: "soldier", title: "מחזיק כפול", meta: "PLA · 55×35mm · 1.5h", hue: 240, shape: "rect" },
  { id: "g14", cat: "unit", seg: "soldier", title: "סמל מטכ\"ל", meta: "PLA · 50×45mm · 3.5h", hue: 60, shape: "diamond" },
  { id: "g15", cat: "figurine", seg: "private", title: "בעל חיים מיניאטורי", meta: "Resin · 45mm · 3h", hue: 330, shape: "circle" },
  { id: "g16", cat: "fidget", seg: "private", title: "Infinity Cube", meta: "PLA · 35mm · 2h", hue: 140, shape: "hex" },
  { id: "g17", cat: "b2b", seg: "b2b", title: "Welcome Kit (×25)", meta: "PLA · 60mm · 2h ea", hue: 10, shape: "circle" },
  { id: "g18", cat: "fidget", seg: "private", title: "Fidget Cube", meta: "PLA · 40mm · 1.5h", hue: 250, shape: "hex" },
];

export const GALLERY_CATS = [
  { id: "all", label: "הכל" },
  { id: "unit", label: "סמלי יחידה" },
  { id: "keychain", label: "מחזיקי מפתחות" },
  { id: "fidget", label: "פידג'טים" },
  { id: "figurine", label: "פסלונים" },
  { id: "part", label: "חלקי חילוף" },
  { id: "b2b", label: "מתנות עסקיות" },
] as const;

const CURATED_FIDGETS: Fidget[] = [
  {
    id: "f1",
    name: "Air Spinner",
    desc: "ספינר אווירי קלאסי. הדפסה אחת. מסתובב כ-90 שניות.",
    price: 55,
    size: "60mm",
    time: "1h",
    tag: "נמכר ביותר",
    hue: 90,
    shape: "diamond",
    thumbnail:
      "https://images.cults3d.com/aLZQQzYVIF3AEIX3_h9bdUXOIVs=/516x516/filters:no_upscale()/https://fbi.cults3d.com/uploaders/14324891/illustration-file/ca58d121-9c0f-4ee2-b3a2-6ffc4970efc2/IMGP7387.jpg",
    creator: "walter",
    source: "thingiverse",
    sourceUrl: "https://www.thingiverse.com/thing:2823006",
    license: "CC0",
    downloads: 14141,
  },
  {
    id: "f2",
    name: "Spiral Cone Fidget",
    desc: "ספירלה מחודדת שמתפתלת ביד. גרסת AMS דו-צבעית מדגישה את החריצים.",
    price: 65,
    size: "70mm",
    time: "2h",
    tag: "פופולרי",
    hue: 280,
    shape: "diamond",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/UScc20b36ef7010a/design/2025-06-20_f64ebf63cad84.jpg",
    creator: "rangido",
    source: "makerworld",
    sourceUrl: "https://makerworld.com/en/models/1536241-spiral-cone-fidget",
    license: "CC-BY",
    downloads: 36717,
    ams: true,
    variants: [
      {
        id: "single",
        label: "צבע אחד",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/UScc20b36ef7010a/design/2025-06-20_f64ebf63cad84.jpg",
        surcharge: 0,
        colors: 1,
        time: "2h",
      },
      {
        id: "ams-2c",
        label: "2 צבעים · AMS",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/UScc20b36ef7010a/600683599/instance/e9be8b38eace2871.jpg",
        surcharge: 10,
        colors: 2,
        time: "1.9h",
      },
    ],
  },
  {
    id: "f3",
    name: "Infinity Cube",
    desc: "קוביית אינסוף קלאסית. מתקפלת ונפרשת ללא הרכבה.",
    price: 75,
    size: "60mm",
    time: "3h",
    hue: 140,
    shape: "hex",
    thumbnail:
      "https://media.printables.com/media/prints/652108/images/5142446_b7375fa0-32c1-451f-82cb-f5922192e206_26967c92-a545-4d38-a95e-cbe47a325e50/pxl_20231119_112545238portraitoriginal.jpg",
    creator: "diademiemi",
    source: "printables",
    sourceUrl: "https://www.printables.com/model/652108-infinity-cube-print-in-place",
    license: "CC0",
    downloads: 2143,
  },
  {
    id: "f4",
    name: "Fidget Cube Remix",
    desc: "קוביית 6 פאות עם 6 פונקציות לחיצה/סיבוב/החלקה.",
    price: 70,
    size: "75mm",
    time: "2h",
    tag: "שולחני",
    hue: 250,
    shape: "hex",
    thumbnail:
      "https://dl2.myminifactory.com/object-assets/5992b909866ea/images/720X720-imgp5831.jpg",
    creator: "walterhsiao",
    source: "myminifactory",
    sourceUrl:
      "https://www.myminifactory.com/object/3d-print-fidget-cube-remix-42718",
    license: "CC-BY",
  },
  {
    id: "f5",
    name: "Funny Flexi Octopus",
    desc: "תמנון מפרקי 8 זרועות. מתפתל ומתקפל ביד.",
    price: 90,
    size: "150mm",
    time: "4h",
    tag: "קלאסי",
    hue: 200,
    shape: "circle",
    thumbnail:
      "https://media.printables.com/media/prints/398842/images/3323724_9e774878-257e-45f3-8d24-7dac8f593f39/photo1.jpg",
    creator: "aamott",
    source: "printables",
    sourceUrl: "https://www.printables.com/model/398842-funny-flexi-octopus",
    license: "CC-BY",
    downloads: 7311,
  },
  {
    id: "f6",
    name: "Articulated Cute Mouse",
    desc: "עכבר מפרקי חמוד. זנב, רגליים, אוזניים — הכל זז.",
    price: 85,
    size: "120mm",
    time: "3h",
    tag: "חמוד",
    hue: 320,
    shape: "circle",
    thumbnail:
      "https://media.printables.com/media/prints/1117146/images/8438212_d7dfeed6-3b04-41ed-8ab9-e616416534aa_ac90de1c-dc73-4ff0-9656-ee09c9532a68/20241221_120149.jpg",
    creator: "3DeeMagic",
    source: "printables",
    sourceUrl: "https://www.printables.com/model/1117146-articulated-cute-mouse",
    license: "CC-BY",
    downloads: 5643,
  },
  {
    id: "f7",
    name: "Super Clicky Fidget Button",
    desc: "כפתור גדול שמקליק חזק. תרפיה לאצבע.",
    price: 55,
    size: "40mm",
    time: "1h",
    tag: "מהיר",
    hue: 18,
    shape: "circle",
    thumbnail:
      "https://media.printables.com/media/prints/143740/images/1360127_5583e39b-acac-42c7-8f97-0a8b55278805/thingiverse-thumbnail.jpg",
    creator: "3D Printy",
    source: "printables",
    sourceUrl: "https://www.printables.com/model/143740-super-clicky-fidget-button",
    license: "CC-BY",
    downloads: 3604,
  },
  {
    id: "f8",
    name: "Flexi Shark",
    desc: "כריש מפרקי 180mm. שובט בכל הכיוונים.",
    price: 95,
    size: "180mm",
    time: "4h",
    tag: "חדש",
    hue: 220,
    shape: "rect",
    thumbnail:
      "https://media.printables.com/media/prints/1149203/images/8674971_a7d9f754-b4d3-497e-a606-5d431472ed48_a4938967-94ed-4970-9754-de9445992c39/pxl_20250115_0059002642.jpg",
    creator: "Snympi",
    source: "printables",
    sourceUrl: "https://www.printables.com/model/1149203-flexi-shark",
    license: "CC-BY",
    downloads: 625,
  },
  {
    id: "f9",
    name: "Dune Flexi Sandworm",
    desc: "תולעת חול ענקית מ-Dune. 200mm של חוליות מפרקיות.",
    price: 110,
    size: "200mm",
    time: "6h",
    tag: "גדול",
    hue: 30,
    shape: "rect",
    thumbnail:
      "https://media.printables.com/media/prints/814967/images/6298626_fd05a9df-2606-47ee-a7bc-6c9ea6f9e6d3_4c100fa1-8c12-4fa1-853d-7291cf5c72dd/sandworm-miniatura.png",
    creator: "Mi Réplica 3D",
    source: "printables",
    sourceUrl:
      "https://www.printables.com/model/814967-dune-flexi-sandworm-print-in-place-support-free",
    license: "CC0",
    downloads: 3005,
  },
  {
    id: "f10",
    name: "longboi articulated snake",
    desc: "נחש מפרקי ענק. 1.5m במדפסת A1 mini, או 3m במדפסת גדולה. AMS לדוגמת עור.",
    price: 95,
    size: "1.5m / 3m",
    time: "5h",
    tag: "ענק",
    hue: 120,
    shape: "rect",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/US84c84f62078d5/228072425/instance/2024-06-12_b7ba512971f0a.png",
    creator: "bsjavik",
    source: "makerworld",
    sourceUrl: "https://makerworld.com/en/models/477964-longboi-articulated-snake",
    license: "CC-BY",
    downloads: 17239,
    ams: true,
    variants: [
      {
        id: "single-a1",
        label: "צבע אחד · A1 mini (~1.5m)",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US84c84f62078d5/228072425/instance/2024-06-12_b7ba512971f0a.png",
        surcharge: 0,
        colors: 1,
        time: "5.3h",
      },
      {
        id: "ams-2c-p1s",
        label: "2 צבעים · AMS · P1S (~3m)",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US84c84f62078d5/144792141/instance/2024-10-26_9ee700d10bda7.png",
        surcharge: 50,
        colors: 2,
        time: "10.5h",
      },
    ],
  },
  {
    id: "f11",
    name: "Infinity Cube - Flush",
    desc: "קוביית אינסוף בעיצוב flush. גיאומטריה מינימליסטית, פאות מושלמות.",
    price: 75,
    size: "60mm",
    time: "2h",
    tag: "מינימליסטי",
    hue: 220,
    shape: "hex",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/US8abc7b49f4b201/design/2024-07-17_368a14241e739.png",
    creator: "ninjake",
    source: "makerworld",
    sourceUrl:
      "https://makerworld.com/en/models/545133-infinity-cube-flush-object",
    license: "CC-BY",
    downloads: 19361,
  },
  {
    id: "f12",
    name: "flexi dragon",
    desc: "דרקון מפרקי 180mm. גרסת AMS מבליטה את הקשקשים בשני צבעים.",
    price: 105,
    size: "180mm",
    time: "6h",
    tag: "חדש",
    hue: 30,
    shape: "hex",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/USb9f49a206bc423/design/2025-05-22_139fc067c9698.jpg",
    creator: "kamel_3d",
    source: "makerworld",
    sourceUrl: "https://makerworld.com/en/models/1443329-flexi-dragon",
    license: "CC-BY",
    downloads: 15236,
    ams: true,
    variants: [
      {
        id: "single",
        label: "צבע אחד",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/USb9f49a206bc423/design/2025-05-22_139fc067c9698.jpg",
        surcharge: 0,
        colors: 1,
        time: "5.9h",
      },
      {
        id: "ams-2c",
        label: "2 צבעים · AMS",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/USb9f49a206bc423/744266005/instance/5bc4c6c6c98ab554.jpg",
        surcharge: 10,
        colors: 2,
        time: "7.8h",
      },
    ],
  },
  {
    id: "f13",
    name: "Articulated Jumping Spider",
    desc: "עכביש מקפץ מפרקי. רגליים זזות עצמאית. גרסת AMS מבליטה את העיניים.",
    price: 65,
    size: "90mm",
    time: "1h",
    tag: "מהיר",
    hue: 250,
    shape: "diamond",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/US55c1c3e844f8f3/design/2024-06-01_f1224564867d6.jpg",
    creator: "Daann_ii",
    source: "makerworld",
    sourceUrl:
      "https://makerworld.com/en/models/481693-articulated-jumping-spider",
    license: "CC-BY",
    downloads: 14353,
    ams: true,
    variants: [
      {
        id: "single",
        label: "צבע אחד",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US55c1c3e844f8f3/design/2024-06-01_f1224564867d6.jpg",
        surcharge: 0,
        colors: 1,
        time: "1h",
      },
      {
        id: "ams-2c",
        label: "2 צבעים · AMS",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US55c1c3e844f8f3/319358611/instance/2025-06-04_5c2fd36c2530c8.png",
        surcharge: 10,
        colors: 2,
        time: "3.3h",
      },
    ],
  },
  {
    id: "f14",
    name: "Articulated crystal dragon",
    desc: "דרקון קריסטל מפרקי 200mm. פירוט גבוה. גרסת AMS לקריסטלים.",
    price: 130,
    size: "200mm",
    time: "10h",
    tag: "פרימיום",
    hue: 195,
    shape: "wings",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/US57d0e62dba805/design/2024-04-04_nga8zg2djixj.jpg",
    creator: "Chrobakx",
    source: "makerworld",
    sourceUrl:
      "https://makerworld.com/en/models/412675-articulated-crystal-dragon",
    license: "CC-BY",
    downloads: 12457,
    ams: true,
    variants: [
      {
        id: "single",
        label: "צבע אחד",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US57d0e62dba805/design/2024-04-04_nga8zg2djixj.jpg",
        surcharge: 0,
        colors: 1,
        time: "10.4h",
      },
      {
        id: "ams-2c",
        label: "2 צבעים · AMS",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US57d0e62dba805/301137952/instance/2025-05-14_ea3722ff47acc.jpeg",
        surcharge: 10,
        colors: 2,
        time: "9.8h",
      },
    ],
  },
  {
    id: "f15",
    name: "Articulated Spider",
    desc: "עכביש מפרקי קלאסי. 8 רגליים שזזות עצמאית.",
    price: 70,
    size: "80mm",
    time: "2h",
    hue: 0,
    shape: "diamond",
    thumbnail:
      "https://makerworld.bblmw.com/makerworld/model/US1aebfe7e5f4cd3/design/2024-02-12_32be92c6340608.jpg",
    creator: "soozafone",
    source: "makerworld",
    sourceUrl: "https://makerworld.com/en/models/183671-articulated-spider",
    license: "CC-BY",
    downloads: 7360,
    ams: true,
    variants: [
      {
        id: "single",
        label: "צבע אחד",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US1aebfe7e5f4cd3/design/2024-02-12_32be92c6340608.jpg",
        surcharge: 0,
        colors: 1,
        time: "2.1h",
      },
      {
        id: "ams-2c",
        label: "2 צבעים · AMS",
        thumbnail:
          "https://makerworld.bblmw.com/makerworld/model/US1aebfe7e5f4cd3/49811327/instance/2024-02-12_32be92c6340608.jpg",
        surcharge: 10,
        colors: 2,
        time: "1.8h",
      },
    ],
  },
];

// The curated shelf plus whatever the MakerWorld import brought in.
export const FIDGETS: Fidget[] = [...CURATED_FIDGETS, ...importedFidgets()];

export const AUDIENCES: Audience[] = [
  { id: "private", label: "אני מזמין בשבילי", desc: "מתנה, פיגורה, חלק חילוף, פידג'ט, או כל רעיון שיש לך בראש.", iconKey: "sparkles" },
  { id: "soldier", label: "אני חייל/ת", desc: "סמל היחידה שלך כמחזיק, פסל או מתנה לטקס תום מסלול/שירות.", iconKey: "shieldMini" },
  { id: "b2b", label: "אני מזמין לחברה", desc: "מתנות לעובדים, פרסים פנימיים, ערכות קליטה. מ-10 יחידות ומעלה.", iconKey: "building" },
];

export const FILAMENTS: Filament[] = [
  { id: "black", name: "שחור מאט", hex: "#1a1a1d", desc: "PLA Matte" },
  { id: "white", name: "לבן שיש", hex: "#f2f2ef", desc: "PLA Marble" },
  { id: "orange", name: "כתום לוהט", hex: "#FF6B1A", desc: "PLA+" },
  { id: "red", name: "אדום דם", hex: "#C2261C", desc: "PLA+" },
  { id: "blue", name: "כחול כהה", hex: "#1E40AF", desc: "PLA" },
  { id: "cyan", name: "טורקיז", hex: "#00C2C7", desc: "PLA Silk" },
  { id: "green", name: "ירוק זית", hex: "#3D5229", desc: "PLA Army" },
  { id: "gold", name: "זהב", hex: "#C9A227", desc: "PLA Silk" },
  { id: "silver", name: "כסף", hex: "#A8A9AD", desc: "PLA Silk" },
  { id: "purple", name: "סגול חצות", hex: "#4C1D95", desc: "PLA" },
  { id: "pink", name: "ורוד פלמינגו", hex: "#EC4899", desc: "PLA" },
  { id: "glow", name: "זוהר בחושך", hex: "#7EE787", desc: "Glow PLA" },
];

export const FONTS: FontOpt[] = [
  { id: "sans", name: "Heebo Bold", preview: "דוגמה", css: "var(--font-sans), sans-serif", weight: 800 },
  { id: "mono", name: "Mono Tech", preview: "דוגמה", css: "var(--font-mono), monospace", weight: 600 },
  { id: "stencil", name: "סטנסיל צבאי", preview: "דוגמה", css: "var(--font-sans), sans-serif", weight: 900, letter: "-0.02em", upper: true },
];

export const SHAPES: Shape[] = [
  { id: "round", label: "עגול", icon: "●" },
  { id: "rect", label: "מלבני", icon: "▭" },
  { id: "emblem", label: "סמל יחידה", icon: "⬢" },
  { id: "custom", label: "אישי", icon: "✦" },
];

export const SIZES: Size[] = [
  { id: "sm", label: "קטן", dim: "30×20mm", priceAdd: 0, time: "45min" },
  { id: "md", label: "בינוני", dim: "50×35mm", priceAdd: 15, time: "1.5h" },
  { id: "lg", label: "גדול", dim: "70×50mm", priceAdd: 30, time: "2.5h" },
];

export const FAQS: Faq[] = [
  { q: "כמה זמן לוקחת הדפסה?", a: "רוב ההזמנות יוצאות תוך 3-5 ימי עסקים מרגע אישור העיצוב. מחזיקי מפתחות פשוטים — לרוב תוך 48 שעות. פיגורות גדולות או הזמנות במספרים גדולים יכולות לקחת עד 7-10 ימים." },
  { q: "איזה חומרים אתה משתמש?", a: "בעיקר PLA ו-PLA+ לחיים יומיומיים, PETG לחלקים שצריכים לעמוד בחום/שמש, ו-Resin לפיגורות בדיוק גבוה. אני אסביר לך מה הכי מתאים להזמנה שלך." },
  { q: "מה האחריות?", a: "אם משהו נשבר תוך 30 יום משימוש סביר — אני מדפיס מחדש בחינם ושולח. אם זה היה תאונה (החתול אכל את זה) — אני אדפיס שוב במחיר עלות." },
  { q: "איך מחושב המחיר?", a: "מחיר = חומר + זמן הדפסה + זמן עיבוד אחרי. למוצרי קטלוג יש מחיר קבוע. להזמנות מיוחדות אני נותן הצעת מחיר תוך 24 שעות אחרי שאתה שולח לי את הבקשה." },
  { q: "אפשר לבטל הזמנה?", a: "כן, עד הרגע שההדפסה התחילה (בדרך כלל 24-48 שעות אחרי שאישרת עיצוב). אחרי שהמדפסת כבר רצה — אפשר לבטל עם החזר חלקי." },
  { q: "אתה שולח לכל הארץ?", a: "כן — דואר רשום (3-5 ימים, ₪25) או שליח עד הבית (יום-יומיים, ₪45). יש גם איסוף עצמי מהבית שלי בפתח תקווה — בחינם." },
  { q: "איך אתה מקבל קבצים?", a: "דרך טופס יצירת קשר באתר אפשר להעלות STL/OBJ/3MF עד 50MB. גם וואטסאפ עובד. אני אגיד לך אם הקובץ צריך תיקונים לפני ההדפסה." },
  { q: "יש מינימום הזמנה?", a: "אין. אפילו אם זה מחזיק מפתחות אחד ב-₪65 — אני מדפיס. אבל הזמנות מעל ₪200 מקבלות משלוח חינם." },
];
