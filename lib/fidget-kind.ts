import type { Fidget, FidgetKind } from "./types";

// The fidgets tab holds two quite different things, and people shop for one or
// the other: print-in-place articulated creatures ("flexi"), and desk toys you
// spin, click or fold ("fidget"). Items can declare `kind` explicitly; anything
// that doesn't is classified from its name, which is reliable because the
// maker community names these models very consistently.

const FLEXI_WORDS =
  /(flexi|flexible|articulat|print[- ]?in[- ]?place|dragon|snake|serpent|worm|octopus|axolotl|shark|lizard|gecko|pangolin|spider|scorpion|crab|dino|t-?rex|raptor|caterpillar|mouse|slug|longboi|cat|fish|butterfly)/i;

const FIDGET_WORDS =
  /(spinner|cube|slider|button|clicker|clicky|gear|knob|switch|popper|whirl|top|coin|rattle|maze|snapper)/i;

export function fidgetKind(f: Pick<Fidget, "kind" | "name" | "desc">): FidgetKind {
  if (f.kind) return f.kind;
  // A name wins over the description, and "flexi" wins over "cube" for things
  // like "flexi cube dragon" — the articulation is what the buyer is after.
  if (FLEXI_WORDS.test(f.name)) return "flexi";
  if (FIDGET_WORDS.test(f.name)) return "fidget";
  if (FLEXI_WORDS.test(f.desc)) return "flexi";
  return "fidget";
}

export type FidgetKindFilter = "all" | FidgetKind;

export const FIDGET_KIND_TABS: { id: FidgetKindFilter; label: string; hint: string }[] = [
  { id: "all", label: "הכל", hint: "כל הדגמים בקטגוריה" },
  { id: "flexi", label: "פלקסי", hint: "יצורים מפרקיים שיוצאים מהמדפסת כשהם כבר זזים" },
  { id: "fidget", label: "פידג'טים", hint: "ספינרים, קוביות, סליידרים וכפתורים" },
];

export const FIDGET_KIND_LABEL: Record<FidgetKind, string> = {
  flexi: "פלקסי",
  fidget: "פידג'ט",
};
