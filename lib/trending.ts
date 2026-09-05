import { FIDGETS } from "./data";
import { PRODUCT_BY_ID, CONFIG_PRODUCT_BY_ID, fidgetGrams, fidgetStats, productsByCategory } from "./products";
import { parseHours } from "./costing";
import { productToCard, type ListingCard } from "@/components/ProductGrid";

// "טרנדי כרגע" — a curated shelf that mixes the items people order most right
// now across the whole site. Edit the order/tags here; everything else follows.
type Pick =
  | { kind: "fidget"; id: string; tag: string }
  | { kind: "product"; id: string; tag: string }
  | { kind: "config"; id: keyof typeof CONFIG_PRODUCT_BY_ID; tag: string; hue: number };

export const TRENDING: Pick[] = [
  { kind: "fidget", id: "f2", tag: "ויראלי בטיקטוק" },
  { kind: "config", id: "phone_case", tag: "חדש · עיצוב חופשי", hue: 200 },
  { kind: "fidget", id: "f11", tag: "הכי מוזמן השבוע" },
  { kind: "product", id: "pet-qr", tag: "חדש" },
  { kind: "fidget", id: "f10", tag: "מתנה מנצחת" },
  { kind: "product", id: "off-phone-stand", tag: "לשולחן" },
  { kind: "config", id: "keychain", tag: "קלאסיקה", hue: 145 },
  { kind: "fidget", id: "f5", tag: "אהוב על ילדים" },
  { kind: "product", id: "home-coasters", tag: "סט מתנה" },
  { kind: "config", id: "lighter_case", tag: "חדש", hue: 30 },
  { kind: "fidget", id: "f1", tag: "נמכר ביותר" },
  { kind: "product", id: "pet-bone", tag: "נמכר ביותר" },
  { kind: "product", id: "home-door-sign", tag: "לבית החדש" },
  { kind: "config", id: "name_plate", tag: "למשרד", hue: 260 },
  { kind: "fidget", id: "f13", tag: "AMS" },
  { kind: "product", id: "off-headphone-stand", tag: "לגיימרים" },
];

export function trendingCards(): ListingCard[] {
  const cards: ListingCard[] = [];
  for (const p of TRENDING) {
    if (p.kind === "fidget") {
      const f = FIDGETS.find((x) => x.id === p.id);
      if (!f) continue;
      const st = fidgetStats(f);
      cards.push({
        id: `fidget-${f.id}`,
        itemId: f.id,
        href: `/fidgets/${f.id}`,
        name: f.name,
        desc: f.desc,
        price: f.price,
        size: f.size,
        time: f.time,
        grams: fidgetGrams(f),
        hours: parseHours(f.time),
        hue: f.hue,
        image: f.thumbnail ?? f.images?.[0],
        tag: p.tag,
        category: "פידג'ט",
        colors: st.colors,
        rating: st.rating,
        orders: st.orders,
      });
    } else if (p.kind === "product") {
      const pr = PRODUCT_BY_ID[p.id];
      if (!pr) continue;
      cards.push({ ...productToCard(pr), id: `product-${pr.id}`, itemId: pr.id, tag: p.tag });
    } else {
      const c = CONFIG_PRODUCT_BY_ID[p.id];
      cards.push({
        id: `config-${c.id}`,
        itemId: `cfg-${c.id}`,
        href: `/configurator?product=${c.id}`,
        name: c.label,
        desc: c.desc + " עיצוב אישי במעצב.",
        price: c.basePrice,
        size: `${c.face[0]}×${c.face[1]}mm`,
        time: `${c.hours}h`,
        grams: c.grams,
        hours: c.hours,
        hue: p.hue,
        art: c.art,
        image: c.image,
        tag: p.tag,
        category: "מעצב",
        colors: c.hasDesigner ? 4 : 1,
        rating: 4.9,
        orders: c.id === "keychain" ? 640 : c.id === "phone_case" ? 210 : 120,
        isNew: c.id === "phone_case" || c.id === "lighter_case",
      });
    }
  }
  // Imported models that did not fit a named shelf land on "trendy" — without
  // this they would be in the catalogue but on no page.
  for (const p of productsByCategory("trendy")) {
    cards.push({ ...productToCard(p), id: `product-${p.id}`, tag: p.tag ?? "חדש באתר" });
  }
  // Same rule as the shelves: nothing without a picture.
  return cards.filter((c) => !!c.image);
}
