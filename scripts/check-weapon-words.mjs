#!/usr/bin/env node
/**
 * The weapon test, checked against words that must and must not trip it.
 *
 *   npm run check:weapons
 *
 * WHY THIS FILE EXISTS
 *
 * The regex had no word boundaries, so "blade" matched inside SCHUBLADE —
 * German for drawer — and an AMS drawer for a Bambu printer arrived in the
 * approval queue tagged as a weapon. The same hole catches "crossword" and
 * "password" on `sword`, "Shakespeare" on `spear`, "ammonia" on `ammo`.
 *
 * A wrong tag is noise while the tag only warns. The moment a weapon is
 * dropped rather than flagged, a wrong tag deletes a model nobody ever sees,
 * so these cases are worth a file that fails out loud.
 *
 * The titles below are real: the ones that must match are from the shop's own
 * shelves, and the ones that must not are the traps found in the catalogue.
 */
import { isWeapon, isRealWeapon } from "./lib/makerworld.mjs";

const MUST_NOT = [
  "AMS Schublade für X1C, X2D, P1S, P2S",
  "Crossword puzzle board",
  "Password keeper box",
  "Shakespeare bust",
  "Spearmint tin holder",
  "Ammonia bottle tray",
  "Bullet journal stand",
  "Knife block for the kitchen",
  "Katana display stand",
  "Razor Holder – Bathroom Organizer",
  "Fan blade replacement holder",
];

const MUST = [
  "Butterfly Knife - Print in Place - Balisong",
  "Nanakatana – The Banana Sword Katana Blade",
  "Collapsible Katana Sword",
  "Throwing Knife",
  "Shuriken",
  "Karambit V2 (FAST PRINT)",
  "BB Launcher with Feed Strip",
  "Double Barrel Pistol Shotgun - Fidget",
  "Gravity knife",
  "High-Speed BB Blowgun (Modular)",
];

/**
 * The owner's line, and the only test that removes a model from his choices:
 * a toy or a prop reaches him, a real weapon never does. Every title in
 * PROPS is on his shelves and selling.
 */
const PROPS = [...MUST];
const REAL = [
  "Airsoft magazine holder",
  "Crossbow bolt jig",
  "Taser grip shell",
  "AR-15 lower receiver",
  "Glock frame",
  "Ammunition tray for live rounds",
  "Suppressor baffle",
];

let bad = 0;
for (const t of MUST_NOT) if (isWeapon(t)) { console.log(`  \x1b[31mfalse positive\x1b[0m  ${t}`); bad++; }
for (const t of MUST) if (!isWeapon(t)) { console.log(`  \x1b[31mmissed\x1b[0m          ${t}`); bad++; }
for (const t of PROPS) if (isRealWeapon(t)) { console.log(`  \x1b[31mprop dropped\x1b[0m    ${t}`); bad++; }
for (const t of REAL) if (!isRealWeapon(t)) { console.log(`  \x1b[31mreal weapon let through\x1b[0m  ${t}`); bad++; }
const total = MUST.length + MUST_NOT.length + PROPS.length + REAL.length;
console.log(bad ? `\n  \x1b[31m${bad} wrong\x1b[0m of ${total}\n` : `\n  \x1b[32mall ${total} correct\x1b[0m\n`);
process.exitCode = bad ? 1 : 0;
