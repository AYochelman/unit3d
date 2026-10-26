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
  "mw-1379807": ["smoke","trendy"],
  "mw-1994754": ["smoke","trendy"],
  "mw-2856174": ["trendy","fidget"],
  "mw-3346591": ["smoke","trendy"],
  "mw-713529": ["smoke","trendy"],
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
