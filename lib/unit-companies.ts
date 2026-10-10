/**
 * The level under the battalion: its companies (פלוגות) or batteries.
 *
 * Company letters are NOT a fixed א'-ג' in every battalion. In an armor
 * brigade they run across the brigade (brigade 188: 53 = א'-ג', 74 = ו'-ח'),
 * and most infantry battalions today name their companies by role. So a
 * battalion shows chips only when public sources give its own letters —
 * lib/unit-companies.generated.ts, with the evidence noted there. Every other
 * battalion still has the level: the order screen takes the company as free
 * text, written by the soldier who knows it, instead of a guess of ours.
 */
import { UNIT_COMPANIES } from "./unit-companies.generated";

export type UnitCompanies = {
  /** "סוללה" for artillery, otherwise "פלוגה". */
  word: "פלוגה" | "סוללה";
  /** Labels exactly as they will be offered, e.g. "פלוגה ו'". */
  companies: string[];
};

/** The battalion's sourced companies, as chips. Empty = not known publicly. */
export function companiesFor(slug: string): { label: string }[] {
  return (UNIT_COMPANIES[slug]?.companies ?? []).map((label) => ({ label }));
}

/** "פלוגה" or "סוללה" — the word the unit itself uses. */
export function companyWord(slug: string): string {
  return UNIT_COMPANIES[slug]?.word ?? "פלוגה";
}
