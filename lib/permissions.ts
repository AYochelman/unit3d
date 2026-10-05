import { IMPORTED, type ImportedModel } from "./imported";

/**
 * The designer's answer, model by model.
 *
 * 434 of the 475 models on sale are under MakerWorld's Standard or Exclusive
 * licence, which the shop reads as personal use unless the designer says
 * otherwise. So the designer is asked -- and the answer is written here, by
 * hand, with the date and where it was given, so that "did we ask" has a
 * record and not a memory. Nothing is inferred: a model is granted only when
 * a line for it says so.
 *
 *   "mw-141620": { on: "2026-10-01", from: "MakerWorld DM", note: "yes, credit me" },
 */
export const PERMISSIONS: Record<string, { on: string; from: string; note?: string }> = {
};

export type Standing = "granted" | "free" | "no-derivatives" | "ask" | "blocked";

export const STANDING: Record<Standing, { label: string; tone: "good" | "cyan" | "flame" | "neutral" | "bad"; hint: string }> = {
  granted:          { label: "הסכמה ✓",     tone: "good",    hint: "היוצר אישר מכירה — רשום ב-lib/permissions.ts" },
  free:             { label: "CC — חופשי",   tone: "cyan",    hint: "רישיון Creative Commons שמתיר מכירה עם קרדיט" },
  "no-derivatives": { label: "ללא שינויים", tone: "flame",   hint: "CC BY-ND: מותר למכור כמו שהוא, אסור להוסיף סמל או שם" },
  ask:              { label: "לבקש הסכמה",   tone: "neutral", hint: "רישיון MakerWorld — שימוש אישי אלא אם היוצר אישר" },
  blocked:          { label: "לא מסחרי",     tone: "bad",     hint: "NC — לא למכירה, מוחזק מחוץ למדף" },
};

export function standingOf(m: Pick<ImportedModel, "id" | "license">): Standing {
  if (PERMISSIONS[m.id]) return "granted";
  const l = m.license ?? "";
  if (/(^|-)NC(-|$)/i.test(l)) return "blocked";
  if (/(^|-)ND$/i.test(l)) return "no-derivatives";
  if (l === "CC0" || l === "BY" || l === "BY-SA") return "free";
  return "ask";
}

const BY_ID = new Map(IMPORTED.map((m) => [m.id, m]));
/** For a catalogue id; undefined when it is the shop's own design. */
export const standingFor = (id: string): Standing | undefined => {
  const m = BY_ID.get(id);
  return m ? standingOf(m) : undefined;
};

/** Counts for the admin table's one-line summary, over what is on sale. */
export function standingCounts(ids: Iterable<string>): Record<Standing, number> {
  const c: Record<Standing, number> = { granted: 0, free: 0, "no-derivatives": 0, ask: 0, blocked: 0 };
  for (const id of ids) { const s = standingFor(id); if (s) c[s]++; }
  return c;
}
