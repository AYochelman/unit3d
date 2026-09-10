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
export const SHELF_MOVES: Record<string, ImportedShelf[]> = {};

/** Ids taken off the shop entirely. */
export const REMOVED_BY_OWNER: string[] = [];
