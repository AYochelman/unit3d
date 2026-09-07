import type { ImportedModel, ImportedShelf } from "./imported";

/**
 * Where a model is listed, when the importer's guess is not where it belongs.
 *
 * MakerWorld's categories put an ashtray under "Household" and a Billy Butcher
 * bust under "Sculptures", which is true and useless: a customer looks for the
 * first on the smoking shelf and the second under films. `shelf` moves a model;
 * `also` lists it on a second shelf as well, because a screen character IS a
 * display piece — it belongs on both, not on whichever we picked.
 */
export type ShelfOverride = { shelf?: ImportedShelf; also?: ImportedShelf[] };

export const SHELF_FIX: Record<string, ShelfOverride> = {
  // ── מהמסך: גם פסל וגם סרטים וסדרות ──────────────────────────────────────
  "mw-2639040": { shelf: "screen", also: ["statues"] }, // בילי בוצ'ר · The Boys
  "mw-2757268": { shelf: "screen", also: ["statues"] }, // בילי בוצ'ר · Oi
  "mw-2748570": { shelf: "screen", also: ["statues"] }, // The Deep · The Boys
  "mw-2810709": { shelf: "screen", also: ["statues"] }, // הומלנדר · The Boys
  "mw-1580660": { shelf: "screen", also: ["statues"] }, // אינווינסיבל
  "mw-2660713": { shelf: "screen", also: ["statues"] }, // איירון מן יושב
  "mw-2560145": { shelf: "screen", also: ["statues"] }, // איירון מן
  "mw-3174552": { shelf: "screen", also: ["statues"] }, // ספיידרמן וורונוי
  "mw-2403804": { shelf: "screen", also: ["statues"] }, // ספיידר נואר
  "mw-2864973": { shelf: "screen", also: ["statues"] }, // ספיידר נואר על מדף
  "mw-2760721": { shelf: "screen", also: ["statues"] }, // מיילס מוראלס
  "mw-2815953": { shelf: "screen", also: ["statues"] }, // דארת' ויידר
  "mw-2402555": { shelf: "screen", also: ["statues"] }, // צריח פורטל
  "mw-2872917": { shelf: "screen", also: ["statues"] }, // גביע ריפר · Subnautica
  "mw-2692124": { shelf: "statues", also: ["screen"] }, // מומינטרול
  // ── ג'וג'וטסו קייסן ──────────────────────────────────────────────────────
  "mw-1003010": { shelf: "screen", also: ["statues"] },
  "mw-2835851": { shelf: "screen", also: ["statues"] },
  "mw-2619092": { shelf: "screen", also: ["statues"] },
  "mw-715812": { shelf: "screen", also: ["statues"] },
  "mw-847695": { shelf: "screen" },
  "mw-2821771": { shelf: "screen", also: ["statues"] },

  // ── העברות נקודתיות שביקש ────────────────────────────────────────────────
  "mw-1253219": { shelf: "flexi" },   // פנדה
  "mw-2002935": { shelf: "trendy" },  // מסרק טקסטורה
  "mw-942697": { shelf: "statues" },  // שלושת הקופים
  "mw-1261408": { shelf: "trendy" },  // תיבת נגינה
  "mw-3251864": { shelf: "trendy" },  // תיבת נגינה ריקרול
  "mw-2606112": { shelf: "trendy" },  // מגן שקע USB-C
  "mw-2787704": { shelf: "trendy" },  // מגן כבל USB-C
  "mw-2835386": { shelf: "trendy" },  // מצביע טלסקופי

  // ── מוצרי עישון: רק שם, בשום מדף אחר ────────────────────────────────────
  "mw-491769": { shelf: "smoke" },   // מיכל אטום עם נעילת בָּיוֹנֶט
  "mw-1556315": { shelf: "smoke" },  // מיכל נשיאה ארוך
  "mw-2531853": { shelf: "smoke" },  // קופסת עישון
  "mw-2716073": { shelf: "smoke" },  // תחנת EDC
  "mw-1553865": { shelf: "smoke" },  // גריינדר דק
  "mw-2467622": { shelf: "smoke" },  // מאפרה
  "mw-935162": { shelf: "smoke" },   // מאפרת מגדל
  "mw-1487479": { shelf: "smoke" },  // שרוול קליפר
  "mw-657056": { shelf: "smoke" },   // קופסה ל-9 סיגריות

  // מוזג שוטים הוא פריט מסיבות, לא יצור מפרקי
  "mw-1107929": { shelf: "home" },
};

/** Applies the corrections to a freshly imported row. */
export function applyShelf(m: ImportedModel): ImportedModel {
  const fix = SHELF_FIX[m.id];
  if (!fix) return m;
  return { ...m, ...(fix.shelf ? { shelf: fix.shelf } : {}), ...(fix.also ? { also: fix.also } : {}) };
}
