import { CONFIG_PRODUCTS } from "./products";
import { UNIT_FORMS } from "./unitForms";
import { PART_NEEDS, missingParts, type Part, type PartCounts } from "./parts";

/**
 * Which product an order line is, as lib/parts.ts names it.
 *
 * Shop and imported products carry their id on the line. The designer's and
 * the soldiers' products do not, so those are recognised by the product name
 * in the line's title or summary ("מחזיק מפתחות", "דיסקית עם שרשרת"…), the
 * soldiers' bodies first because their lines also name the unit.
 */
export function partsKeyForLine(line: { itemId?: string; title?: string; summary?: string[] }): string | null {
  if (line.itemId && PART_NEEDS[line.itemId]) return line.itemId;
  const text = `${line.title ?? ""} ${(line.summary ?? []).join(" ")}`;
  const unit = /יחידה|גדוד|חטיבה|סמל/.test(text) ? UNIT_FORMS.find((f) => text.includes(f.label)) : undefined;
  if (unit && PART_NEEDS[`unit:${unit.id}`]) return `unit:${unit.id}`;
  const cfg = CONFIG_PRODUCTS.find((c) => text.includes(c.label));
  if (cfg && PART_NEEDS[`cfg:${cfg.id}`]) return `cfg:${cfg.id}`;
  return null;
}

/** Parts this order line is short of, given what is on the shelf. */
export function missingForLine(line: { itemId?: string; title?: string; summary?: string[]; qty?: number }, counts: PartCounts): Part[] {
  const key = partsKeyForLine(line);
  return key ? missingParts(key, counts, line.qty ?? 1) : [];
}
