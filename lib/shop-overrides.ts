// Moves and removals the owner made from /admin → "שמות".
// WRITTEN BY THE SITE, NOT BY HAND.
//
// lib/shelves.ts holds the hand-written placements, grouped and commented;
// lib/imported.ts holds the hand-written removals. Letting the admin page
// rewrite either would flatten their structure and their reasoning, so edits
// made from the shop land here instead and win over both.
//
// Deleting an entry here restores whatever the hand-written files say.

import type { ImportedShelf } from "./imported";

/** id → the shelves it sits on. The first is its home. */
export const SHELF_MOVES: Record<string, ImportedShelf[]> = {
  "mw-1032328": ["trendy","statues"],
  "mw-1132819": ["home","office"],
  "mw-1209712": ["home","office"],
  "mw-1271221": ["fidget","screen","trendy"],
  "mw-1369010": ["statues","screen"],
  "mw-1608147": ["screen","trendy"],
  "mw-1636314": ["home","office"],
  "mw-1889932": ["office","home","statues"],
  "mw-1903673": ["statues","screen"],
  "mw-1994253": ["statues","screen"],
  "mw-2249212": ["screen","fidget"],
  "mw-2286601": ["trendy","statues"],
  "mw-239395": ["screen","fidget"],
  "mw-2426234": ["home"],
  "mw-26009": ["home","office"],
  "mw-2633270": ["home","office"],
  "mw-2647425": ["fidget","trendy"],
  "mw-2714054": ["trendy","smoke"],
  "mw-2772314": ["home","office"],
  "mw-2787704": ["trendy","b2b","office","home"],
  "mw-2835851": ["trendy","screen","statues"],
  "mw-2870508": ["home","trendy"],
  "mw-3025314": ["home","office"],
  "mw-3157560": ["fidget","statues"],
  "mw-3251864": ["trendy","screen"],
  "mw-427080": ["b2b","office","home"],
  "mw-42910": ["home","office"],
  "mw-471428": ["home","office"],
  "mw-48131": ["office","home"],
  "mw-550723": ["screen","statues"],
  "mw-567166": ["fidget","trendy"],
  "mw-615735": ["flexi","trendy"],
  "mw-641029": ["statues","screen"],
  "mw-710726": ["home","b2b","office"],
  "mw-731832": ["office","home"],
  "mw-847695": ["screen","statues"],
  "mw-849620": ["b2b","office","home"],
  "mw-896722": ["statues","screen"],
  "mw-95207": ["office","home"],
};

/** Ids taken off the shop entirely. */
export const REMOVED_BY_OWNER: string[] = [
  "mw-1074963",
  "mw-115260",
  "mw-1203450",
  "mw-1292618",
  "mw-1376675",
  "mw-1509282",
  "mw-1515698",
  "mw-1616971",
  "mw-1706306",
  "mw-1797688",
  "mw-18687",
  "mw-2253620",
  "mw-2254413",
  "mw-2375134",
  "mw-2624902",
  "mw-27048",
  "mw-2745579",
  "mw-2845840",
  "mw-2863365",
  "mw-2872917",
  "mw-3244067",
  "mw-624571"
];
