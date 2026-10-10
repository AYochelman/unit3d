// Company letters per battalion, only where public sources give them (research
// 10.10.2026: news, memorial sites, unit citations — via search results).
// A battalion missing here still takes its company as free text in the order
// screen. See lib/unit-companies.ts.
import type { UnitCompanies } from "./unit-companies";

const P = (...l: string[]) => l.map((x) => `פלוגה ${x}`);
const S = (...l: string[]) => l.map((x) => `סוללה ${x}`);

export const UNIT_COMPANIES: Record<string, UnitCompanies> = {
  // Armor — letters run across the brigade.
  "armor-188-53-shualey-habashan": { word: "פלוגה", companies: P("א'", "ב'", "ג'") },
  "armor-188-74-habokim": { word: "פלוגה", companies: P("ו'", "ז'", "ח'") },
  "armor-7-82-bnei-itshar": { word: "פלוגה", companies: P("א'", "ב'", "ג'") },
  "armor-7-77-oz": { word: "פלוגה", companies: P("ו'", "ז'", "ח'") },
  "armor-401-52-habokim": { word: "פלוגה", companies: P("א'", "ב'", "ג'") },
  // Golani — letters restart in each battalion.
  "golani-12-barak": { word: "פלוגה", companies: P("א'", "ב'", "ג'") },
  "golani-13-gideon": { word: "פלוגה", companies: P("א'", "ב'", "ג'", "ד'") },
  // Artillery — batteries א'-ג' inside each battalion.
  "art-215-334-marav": { word: "סוללה", companies: S("א'", "ב'", "ג'") },
  "art-215-405-cheetz-shahor": { word: "סוללה", companies: S("א'", "ב'", "ג'") },
  "art-215-411-yuri": { word: "סוללה", companies: S("א'", "ב'", "ג'") },
  "art-282-55": { word: "סוללה", companies: S("א'", "ב'", "ג'") },
};
