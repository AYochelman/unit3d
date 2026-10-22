/**
 * Everything a product needs besides filament.
 *
 * A keychain is a print and a split ring; a fridge magnet is a print and a
 * neodymium disc. Running out of the ring stops the keychain exactly as surely
 * as running out of the spool, and nothing tracked it. This is that list, and
 * which products use what.
 *
 * Built from a sweep of every product on 22.10 (names, original MakerWorld
 * titles, tags and descriptions), read by hand: the keyword hits were noisy —
 * "spinner" models print their own bearing, "Print in Place" switches have no
 * switch in them, and an AirTag holder does not come with the AirTag. Only
 * what the shop actually has to buy and put in the box is here.
 *
 * Counts live in the admin store and go to the site with the rest of the
 * settings ("parts" in admin-settings.json). A part with no count is simply
 * not tracked — nothing is assumed out.
 */

export type Part = {
  id: string;
  name: string;
  /** What one unit is, for the count field. */
  unit: string;
  note?: string;
  /** Warn at or below this many. */
  low: number;
};

export const PARTS: Part[] = [
  { id: "key-ring", name: "טבעת למחזיק מפתחות", unit: "יח'", note: "טבעת נירוסטה מפוצלת, 25mm", low: 30 },
  { id: "ball-chain", name: "שרשרת כדורים לדיסקית", unit: "יח'", note: "60cm עם סוגר", low: 15 },
  { id: "magnet", name: "מגנט נאודימיום", unit: "יח'", note: "דיסק 10×3mm", low: 30 },
  { id: "keycap", name: "Keycaps", unit: "יח'", note: "מקשים למקלדת — לחיבור למוצרים כשיתווספו", low: 10 },
  { id: "luggage-strap", name: "רצועה לתג", unit: "יח'", note: "לתג מזוודה ולתג תיק", low: 10 },
  { id: "adhesive-3m", name: "מדבקת 3M דו-צדדית", unit: "יח'", note: "לקליפסים לכבלים", low: 30 },
  { id: "screw-anchor", name: "בורג + דיבל", unit: "זוג", note: "לתלייה על קיר", low: 10 },
  { id: "cord", name: "שרוך לסימנייה", unit: "יח'", low: 10 },
  { id: "rubber-band", name: "גומיות", unit: "יח'", note: "לקליקר הגומיות", low: 20 },
  { id: "chess-weight", name: "משקולת לבסיס כלי שחמט", unit: "יח'", note: "32 לסט", low: 32 },
  { id: "led-base", name: "תאורת LED + בסיס עץ", unit: "סט", note: "למנורת הירח", low: 2 },
  { id: "packaging", name: "אריזה (שקית/קופסה)", unit: "יח'", note: "לכל הזמנה, לא לפי מוצר", low: 20 },
];

export const PART_BY_ID: Record<string, Part> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export type Need = { part: string; qty: number };

const ring = [{ part: "key-ring", qty: 1 }];

/**
 * Product id → what goes in the box with it.
 *
 * Ids are the shop's own: catalogue products, imported models (mw-…), the
 * designer's products (cfg:…) and the bodies a unit emblem is printed on
 * (unit:…).
 */
export const PART_NEEDS: Record<string, Need[]> = {
  // Keychains — the ring is what makes them one.
  "mw-2772314": ring, // מעמד טלפון מתקפל לכיס (מחזיק מפתחות)
  "mw-1509282": ring, // מחזיק מפתחות BYD
  "mw-2254413": ring, // מחזיק מפתחות צ'בורשקה
  "mw-587584": ring, // דרקון פלקסי מיני · מחזיק מפתחות
  "mw-30796": ring, // מחזיק מפתחות עם שם מסתובב
  "mw-65972": ring, // מחזיק מפתחות עם שם
  "mw-3245667": ring, // צב תנין גמיש (מחזיק מפתחות)
  "mw-2608825": ring, // כלב גמיש · מחזיק מפתחות
  "mw-2811814": ring, // מחולל מחזיקי מפתחות
  "mw-2459711": ring, // חתול פלקסי · מחזיק מפתחות
  "cfg:keychain": ring,
  "unit:keychain": ring,

  // Pet tags hang on the collar by a ring.
  "pet-bone": ring,
  "pet-round": ring,
  "pet-heart": ring,
  "pet-fish": ring,
  "pet-paw": ring,
  "pet-qr": ring,
  "cfg:pet_tag": ring,
  "mw-59619": ring, // תג לכלב להתאמה אישית

  // Dog tags come on a chain.
  "mw-2335039": [{ part: "ball-chain", qty: 1 }],
  "cfg:dog_tag": [{ part: "ball-chain", qty: 1 }],
  "unit:dogtag": [{ part: "ball-chain", qty: 1 }],

  // Magnets.
  "unit:magnet": [{ part: "magnet", qty: 1 }],
  "mw-3272219": [{ part: "magnet", qty: 1 }], // שלט "אל תהיה טיפש" · מגנט למקרר

  // Tags with a strap.
  "cfg:luggage_tag": [{ part: "luggage-strap", qty: 1 }],
  "cfg:bag_tag": [{ part: "luggage-strap", qty: 1 }],

  // Stuck or screwed to something.
  "off-cable-clips": [{ part: "adhesive-3m", qty: 6 }],
  "home-wall-hook": [{ part: "screw-anchor", qty: 1 }],
  "home-key-rack": [{ part: "screw-anchor", qty: 2 }],

  // The rest.
  "off-bookmark": [{ part: "cord", qty: 1 }],
  "cfg:bookmark": [{ part: "cord", qty: 1 }],
  "mw-2661039": [{ part: "rubber-band", qty: 4 }], // פנטה-קליק · קליקר גומיות
  "st-chess": [{ part: "chess-weight", qty: 32 }],
  "st-moon": [{ part: "led-base", qty: 1 }],
};

export const needsFor = (productId: string): Need[] => PART_NEEDS[productId] ?? [];

/** Product ids that use a part. */
export const usersOf = (partId: string): string[] =>
  Object.entries(PART_NEEDS).filter(([, needs]) => needs.some((n) => n.part === partId)).map(([id]) => id);

/** Counts on hand. A missing key means "not tracked", never "zero". */
export type PartCounts = Record<string, number>;

/**
 * How many of a product the parts on hand allow, or null when none of its
 * parts are tracked (then only filament limits it).
 */
export function canMake(productId: string, counts: PartCounts): number | null {
  const needs = needsFor(productId).filter((n) => counts[n.part] != null);
  if (!needs.length) return null;
  return Math.min(...needs.map((n) => Math.floor((counts[n.part] ?? 0) / n.qty)));
}

/** Parts a quantity of this product needs that are not on the shelf (tracked and short). */
export function missingParts(productId: string, counts: PartCounts, qty = 1): Part[] {
  return needsFor(productId)
    .filter((n) => counts[n.part] != null && (counts[n.part] ?? 0) < n.qty * qty)
    .map((n) => PART_BY_ID[n.part])
    .filter(Boolean);
}

/** Every tracked part that is short for at least one product that uses it. */
export function shortParts(counts: PartCounts): Part[] {
  return PARTS.filter((p) => counts[p.id] != null && usersOf(p.id).some((id) => missingParts(id, counts).some((m) => m.id === p.id)));
}

/** The line the owner sees: "יש להשלים את החלקים הבאים: …". */
export const restockLine = (parts: Part[]): string =>
  `יש להשלים את החלקים הבאים: ${parts.map((p) => p.name).join(", ")}`;
