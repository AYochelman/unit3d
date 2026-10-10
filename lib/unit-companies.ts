/**
 * The level under the battalion: its companies (פלוגות).
 *
 * Two sources, in this order:
 *  1. Names a public source actually lists (Wikipedia, the unit's own
 *     association site) — kept with the URL they came from in
 *     lib/unit-companies.generated.ts. Never invented: a soldier spots a wrong
 *     company name instantly, and it is their company.
 *  2. Otherwise, the standard sub-units for that kind of battalion — an
 *     infantry battalion has companies א', ב', ג' and a support company, an
 *     artillery battalion has batteries. That is not a guess about one unit,
 *     it is how the army is built.
 *
 * Units where a company level does not apply or is not public (squadrons,
 * flotillas, intelligence and special units) get none — the card simply has
 * no company row, rather than a made-up one.
 */
import { UNIT_COMPANIES } from "./unit-companies.generated";

export type CompanyStructure = "infantry" | "armor" | "artillery" | "engineering" | "none";

export type UnitCompanies = {
  structure: CompanyStructure;
  /** Public names, exactly as the source writes them. */
  companies?: { name: string; nickname?: string }[];
  source?: string;
};

const STANDARD: Record<CompanyStructure, string[]> = {
  infantry: ["פלוגה א'", "פלוגה ב'", "פלוגה ג'", "פלוגה מסייעת"],
  armor: ["פלוגה א'", "פלוגה ב'", "פלוגה ג'"],
  engineering: ["פלוגה א'", "פלוגה ב'", "פלוגה ג'"],
  artillery: ["סוללה א'", "סוללה ב'", "סוללה ג'"],
  none: [],
};

/** The battalion's companies as the customer picks them: named when public, standard otherwise. */
export function companiesFor(slug: string): { label: string; named: boolean }[] {
  const u = UNIT_COMPANIES[slug];
  if (!u) return [];
  if (u.companies?.length) {
    return u.companies.map((c) => ({ label: c.nickname ? `${c.name} - ${c.nickname}` : c.name, named: true }));
  }
  return STANDARD[u.structure].map((label) => ({ label, named: false }));
}

/** "פלוגות" or "סוללות" — the word the unit itself uses. */
export function companyWord(slug: string): string {
  return UNIT_COMPANIES[slug]?.structure === "artillery" ? "סוללה" : "פלוגה";
}
