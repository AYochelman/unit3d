import { PRODUCTS, fidgetGrams } from "./products";
import { FIDGETS } from "./data";
import { parseHours } from "./costing";
import { heName } from "./he-names";
import type { MaterialId } from "./types";

/**
 * "מוצר היום" — one product the home page puts forward.
 *
 * The owner picks it from /admin (stored as "product:<id>" or "fidget:<id>" in
 * admin-settings.json). With no pick, the site turns one over every day by
 * the Israel date, from products with a real photograph, so the slot is never
 * empty and never the same two days running.
 */
export type DailyItem = {
  key: string;
  id: string;
  href: string;
  name: string;
  desc: string;
  image: string;
  price: number;
  grams: number;
  hours: number;
  material?: MaterialId;
  shelf: string;
};

let cache: DailyItem[] | null = null;

/** Everything the owner can choose from: every shop product and every fidget, once each. */
export function dailyChoices(): DailyItem[] {
  if (cache) return cache;
  const out: DailyItem[] = [];
  for (const p of PRODUCTS) {
    if (!p.image) continue;
    out.push({
      key: `product:${p.id}`, id: p.id, href: `/products/${p.id}`,
      name: heName(p.id, p.name), desc: p.desc, image: p.image,
      price: p.price, grams: p.grams, hours: p.hours, material: p.material, shelf: p.category,
    });
  }
  const seen = new Set(out.map((x) => x.id));
  for (const f of FIDGETS) {
    const img = f.thumbnail ?? f.images?.[0];
    if (!img || seen.has(f.id)) continue;
    out.push({
      key: `fidget:${f.id}`, id: f.id, href: `/fidgets/${f.id}`,
      name: heName(f.id, f.name), desc: f.desc, image: img,
      price: f.price, grams: fidgetGrams(f), hours: parseHours(f.time), shelf: "fidget",
    });
  }
  cache = out;
  return out;
}

/** Today's date in Israel as a day number, so the automatic pick turns over at local midnight. */
const israelDay = (now: number) => {
  const d = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  return Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
};

/** The owner's pick if it still exists; otherwise the one the date points at. */
export function dailyPick(key: string | null, now: number): { item: DailyItem; picked: boolean } | null {
  const all = dailyChoices();
  if (!all.length) return null;
  const chosen = key ? all.find((x) => x.key === key) : undefined;
  if (chosen) return { item: chosen, picked: true };
  // The automatic pool: the shop's own products first-class, so a day lands on
  // something it makes rather than only on imported models.
  const pool = all.filter((x) => !x.id.startsWith("mw-") || x.shelf === "fidget");
  const list = pool.length ? pool : all;
  return { item: list[israelDay(now) % list.length], picked: false };
}
