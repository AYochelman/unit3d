import { SHELF_LABEL } from "./candidates";
import type { ImportedShelf } from "./imported";
import { heName as heNameOf } from "./he-names";
import { PRODUCTS, CONFIG_PRODUCTS, fidgetGrams } from "./products";
import { FIDGETS } from "./data";
import { parseHours } from "./costing";
import { sitePrice } from "./site-price";

/**
 * The help bot's knowledge of what is actually in the shop.
 *
 * Until now the bot answered fifteen prepared questions and knew nothing about
 * the products — a visitor asking "יש לכם דרקון?" was handed to WhatsApp while
 * the shop sat on a dozen of them. This is the missing half: the catalogue,
 * searchable by what a person would type.
 *
 * It stays honest in the way the rest of the bot is honest. Every price and
 * every name comes from the same catalogue the shelves are built from, so the
 * bot cannot quote a price the site does not charge, and a search that finds
 * nothing says so instead of offering something else.
 */
export type Found = {
  id: string;
  name: string;
  shelf: ImportedShelf;
  shelfLabel: string;
  price: number;
  hours: number;
  href: string;
  /** One line about the product, for the AI helper's knowledge file. */
  desc: string;
  /** True when the words typed appear in the product's own name, not only in
   *  its description or its shelf. Lets the caller tell "יש לכם דרקון?" (a
   *  product) apart from "מה יש למשרד?" (a shelf, browsed). */
  nameHit: boolean;
};

/**
 * Hebrew, flattened for comparison.
 *
 * Final letters are the same letter — someone typing "דרקונים" and a product
 * called "דרקון" must meet. Niqqud, geresh and punctuation carry no meaning in
 * a search box, and a definite "ה" at the front of a word is noise here.
 */
export const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")     // niqqud and cantillation
    .replace(/[״"'׳`]/g, "")
    .replace(/[.,!?;:()\[\]{}\-–—_/\\]/g, " ")
    .replace(/ך/g, "כ").replace(/ם/g, "מ").replace(/ן/g, "נ")
    .replace(/ף/g, "פ").replace(/ץ/g, "צ")
    .replace(/\s+/g, " ")
    .trim();

/** Words too common to identify anything. Matching on them finds everything. */
const STOP = new Set(
  ("יש לכם לך את של אני רוצה צריך מחפש מחפשת אפשר האם עם בלי על מה כמה איזה איזו " +
   "עולה עולים מחיר טוב טובה יפה בשביל למי כדי הכי אחד אחת שני שתי זה זו הוא היא " +
   "אתם אתה מישהו משהו קצת מאוד תוכל תוכלי בבקשה שלום היי אוקיי כן לא " +
   // Words about the transaction rather than the thing: matching them turns a
   // policy question ("אפשר להחזיר מוצר?") into a product search.
   "מוצר מוצרים דגם דגמים פריט להזמין הזמנה לקנות קונה למכור מכירה " +
   "a an the is are do you have i want need looking for me my")
    // Folded like everything else, or "לכם" here would never meet the "לכמ"
    // a folded question produces.
    .split(/\s+/).map((w) => fold(w)),
);

/**
 * Everything the shop sells, as the bot knows it.
 *
 * It used to be the imported MakerWorld models only, priced with a formula of
 * its own — so the bot did not know the shop's own products (door sign,
 * business cards, mystery box, pet tags, the 3D name keychain) and quoted
 * prices the site does not charge. Now it is every shelf product, every
 * fidget and every designer product, priced by sitePrice() — the same rule
 * the shelves use, from the same admin-settings.json.
 */
type Item = { id: string; name: string; en: string; shelf: ImportedShelf; shelfLabel: string; desc: string; price: number; hours: number; grams: number; href: string };

const SHELF_OF: Record<string, ImportedShelf> = { pets: "pets", home: "home", office: "office", statues: "statues", trendy: "trendy", b2b: "b2b", smoke: "smoke", screen: "screen" };

function items(): Item[] {
  const out: Item[] = [];
  const seen = new Set<string>();
  for (const p of PRODUCTS) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const shelf = SHELF_OF[p.category] ?? "trendy";
    out.push({
      id: p.id, name: heNameOf(p.id, p.name), en: p.nameEn ?? "", shelf, shelfLabel: SHELF_LABEL[shelf] ?? "",
      desc: p.desc ?? "", hours: p.hours, grams: p.grams, href: `/products/${p.id}`,
      price: sitePrice({ id: p.id, price: p.price, grams: p.grams, hours: p.hours, material: p.material, colors: 1, pieces: p.pieces }),
    });
  }
  for (const f of FIDGETS) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    const grams = fidgetGrams(f), hours = parseHours(f.time);
    out.push({
      id: f.id, name: heNameOf(f.id, f.name), en: f.name, shelf: "fidget", shelfLabel: SHELF_LABEL.fidget ?? "פידג'טים",
      desc: f.desc ?? "", hours, grams, href: `/fidgets/${f.id}`,
      price: sitePrice({ id: f.id, price: f.price, grams, hours }),
    });
  }
  // The designer: things made from the customer's own text or design.
  for (const c of CONFIG_PRODUCTS) {
    const id = `cfg-${c.id}`;
    out.push({
      id, name: c.label, en: "", shelf: "trendy", shelfLabel: "מעצב אישי",
      desc: c.desc, hours: c.hours, grams: c.grams, href: `/configurator?product=${c.id}`,
      price: sitePrice({ id, price: c.basePrice, grams: c.grams, hours: c.hours, material: c.material }),
    });
  }
  return out;
}

/**
 * Where a shelf actually lives.
 *
 * The shelf keys are not routes and four of them differ: flexi and fidget both
 * list under /fidgets. Home and office have a shelf each. Linking to
 * `/${shelf}` would send people to /flexi, which is a 404.
 */
export const SHELF_ROUTE: Record<ImportedShelf, string> = {
  flexi: "/fidgets",
  fidget: "/fidgets",
  statues: "/statues",
  screen: "/screen",
  pets: "/pets",
  home: "/home",
  office: "/office",
  smoke: "/smoke",
  trendy: "/trendy",
  b2b: "/b2b",
};

const toFound = (m: Item, nameHit = false): Found => ({
  id: m.id,
  name: m.name,
  shelf: m.shelf,
  shelfLabel: m.shelfLabel,
  price: m.price,
  hours: m.hours,
  href: m.href,
  desc: m.desc,
  nameHit,
});

/** Built once. The catalogue does not change while a page is open. */
let index: { model: Item; title: string; haystack: string }[] | null = null;

const build = () =>
  (index ??= items().map((m) => {
    // The Hebrew name, the original title and the shelf all identify a product
    // to somebody: one person types "דרקון", another "dragon", another
    // "פידג'ט". The name is kept apart so a hit on it can count for more.
    const title = fold(`${m.name} ${m.en}`);
    return {
      model: m,
      title,
      haystack: `${title} ${fold(`${m.shelfLabel} ${m.desc}`)}`,
    };
  }));

/**
 * What the shop has that matches this question.
 *
 * Scored rather than filtered: a product matching two of the words the person
 * typed is a better answer than one matching a single common word, and a match
 * on the name counts for more than a match buried in a description.
 */
export function findProducts(input: string, limit = 3): Found[] {
  const words = fold(input)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP.has(w))
    // "הנחש הפלקסי" and "נחש פלקסי" are the same request. A leading definite
    // ה is dropped when what remains is still a word worth searching for.
    .map((w) => (w.length >= 4 && w.startsWith("ה") ? w.slice(1) : w))
    .filter((w) => !STOP.has(w));
  if (!words.length) return [];

  const scored: { m: Item; score: number; nameHit: boolean }[] = [];
  for (const { model, title, haystack } of build()) {
    let score = 0;
    let nameHit = false;
    for (const w of words) {
      if (!haystack.includes(w)) continue;
      // A longer word is a more specific claim; a whole-word hit beats a
      // fragment, which keeps "תג" from matching every word containing it.
      score += new RegExp(`(^| )${w}( |$)`).test(haystack) ? w.length * 2 : w.length;
      // A word that is in the name counts again: "שלט לדלת" is the door
      // sign, not every sign whose description mentions a door.
      if (title.includes(w)) {
        nameHit = true;
        score += w.length;
      }
    }
    if (score > 0) scored.push({ m: model, score, nameHit });
  }
  if (!scored.length) return [];

  // A product whose own name was typed comes first, then by how much matched.
  scored.sort(
    (a, b) =>
      Number(b.nameHit) - Number(a.nameHit) || b.score - a.score || a.m.grams - b.m.grams,
  );
  // One weak hit on one short word is a coincidence, not an answer.
  const best = scored[0].score;
  if (best < 4) return [];
  return scored
    .filter((x) => x.score >= best * 0.6)
    .slice(0, limit)
    .map((x) => toFound(x.m, x.nameHit));
}

/**
 * The words people actually use for a shelf, beyond its own label.
 *
 * Nobody asks for "לחיות" — they ask for a dog. And a shelf called "פידג'טים"
 * is typed "פידגט", singular and without the geresh, more often than not.
 * Written folded, because that is how they are compared.
 */
const SHELF_ALIASES: Record<ImportedShelf, string[]> = {
  flexi: ["פלקסי", "מפרקי", "מפרקים", "גמיש", "flexi"],
  fidget: ["פידגט", "פידגטימ", "פידג'ט", "לחצ", "הרגעה", "חרדה", "fidget"],
  statues: ["פסל", "פסלימ", "מיניאטור", "דמות", "דמויות", "statue"],
  screen: ["סרט", "סרטימ", "סדרה", "סדרות", "אנימה", "גיבור", "גיבורי על", "משחק", "גיימינג"],
  pets: ["חיה", "חיות", "כלב", "כלבימ", "חתול", "חתולימ", "מחמד", "pet", "dog", "cat"],
  home: ["בית", "מטבח", "סלונ", "עציצ", "אמבטיה", "מגנט", "home"],
  office: ["משרד", "שולחנ", "מחשב", "כבל", "עט", "עטימ", "office", "desk"],
  smoke: ["עישונ", "מאפרה", "גריינדר", "טבק"],
  trendy: ["טרנד", "טרנדי", "ויראלי", "טיקטוק", "trend"],
  b2b: ["עסק", "עסקימ", "מיתוג", "לוגו", "כמות", "מתנות לעובדימ", "b2b"],
};

/** Which shelf a question is about, when it names one rather than a product. */
export function findShelf(input: string): { shelf: ImportedShelf; label: string } | null {
  const q = fold(input);
  const words = new Set(q.split(" "));
  const hits: { shelf: ImportedShelf; label: string; weight: number }[] = [];

  for (const [shelf, label] of Object.entries(SHELF_LABEL) as [ImportedShelf, string][]) {
    const terms = [label, ...(SHELF_ALIASES[shelf] ?? [])].map(fold);
    // A whole word is a request; a substring of a longer word is usually not
    // ("כלב" inside "כלבלב" is fine, inside a longer unrelated word is not),
    // so a substring only counts when the term is long enough to be specific.
    let weight = 0;
    for (const t of terms) {
      if (!t) continue;
      if (words.has(t)) weight = Math.max(weight, t.length + 2);
      else if (t.length >= 4 && q.includes(t)) weight = Math.max(weight, t.length);
    }
    if (weight) hits.push({ shelf, label, weight });
  }

  hits.sort((a, b) => b.weight - a.weight);
  return hits.length ? { shelf: hits[0].shelf, label: hits[0].label } : null;
}

/** How many things are on a shelf, for an answer that states a real number. */
export function shelfCount(shelf: ImportedShelf): number {
  return build().filter((x) => x.model.shelf === shelf).length;
}

export const catalogueSize = (): number => build().length;

/** Every sellable model as the bot quotes it: the AI helper's product list. */
export const allProducts = (): Found[] => build().map((x) => toFound(x.model, true));
