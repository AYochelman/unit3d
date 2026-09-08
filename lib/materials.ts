import type { Material, MaterialId } from "./types";

// Filament families we print with. Spool prices are typical Israeli retail
// prices (2026, 1kg spools, ILS incl. VAT) and are the DEFAULTS — the live
// numbers are edited in /admin and travel with the admin settings export.
export const MATERIALS: Material[] = [
  { family: "pla", id: "pla",       name: "PLA רגיל",     short: "PLA",       desc: "סטנדרט. חד, קל להדפסה, לא לשמש ישירה.",         spoolPriceILS: 95,  spoolKg: 1, priceAdd: 0 },
  { family: "pla", id: "pla_plus",  name: "PLA+",         short: "PLA+",      desc: "חזק וגמיש יותר מ-PLA. הבחירה לחפצים יומיומיים.", spoolPriceILS: 110, spoolKg: 1, priceAdd: 5 },
  { family: "pla", id: "pla_matte", name: "PLA מאט",      short: "Matte",     desc: "גימור מאט שמסתיר שכבות. נראה כמו יציקה.",       spoolPriceILS: 115, spoolKg: 1, priceAdd: 5 },
  { family: "pla", id: "pla_silk",  name: "PLA משי",      short: "Silk",      desc: "ברק מתכתי. מצוין לזהב, כסף וטורקיז.",           spoolPriceILS: 120, spoolKg: 1, priceAdd: 8 },
  { id: "petg",      name: "PETG",         short: "PETG",      desc: "עמיד בחום ובשמש. לרכב, למרפסת, לחוץ.",           spoolPriceILS: 125, spoolKg: 1, priceAdd: 10 },
  { id: "tpu",       name: "TPU גמיש",     short: "TPU",       desc: "גומי מודפס. קייסים לטלפון, סופגי זעזועים.",       spoolPriceILS: 160, spoolKg: 1, priceAdd: 20 },
  { id: "abs",       name: "ABS",          short: "ABS",       desc: "פלסטיק הנדסי. חלקי מכונות, עמידות גבוהה.",         spoolPriceILS: 105, spoolKg: 1, priceAdd: 10 },
];

/** What this material can be swapped with. Its own id when it stands alone. */
export const familyOf = (m: { id: string; family?: string }): string => m.family ?? m.id;

export const MATERIAL_BY_ID: Record<MaterialId, Material> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m]),
) as Record<MaterialId, Material>;

/** Map the filament colour `desc` strings in FILAMENTS to a material family. */
export function materialFromFilamentDesc(desc: string): MaterialId {
  const d = desc.toLowerCase();
  if (d.includes("silk")) return "pla_silk";
  if (d.includes("matte")) return "pla_matte";
  if (d.includes("pla+")) return "pla_plus";
  if (d.includes("petg")) return "petg";
  if (d.includes("tpu")) return "tpu";
  if (d.includes("abs")) return "abs";
  return "pla";
}
