import { SHELF_LABEL } from "./candidates";
import { sellableModels, suggestPrice, type ImportedModel, type ImportedShelf } from "./imported";
import { HE_NAMES } from "./he-names";
import { HE_NAME_OVERRIDES } from "./he-names.overrides";

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

const heName = (m: ImportedModel): string =>
  HE_NAME_OVERRIDES[m.id] ?? HE_NAMES[m.id] ?? m.name;

const priceOf = (m: ImportedModel): number =>
  suggestPrice(m.grams, m.hours, 1, m.material ?? "pla_plus");

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

/** Same split for a single model: the bendy things have their own detail page. */
const modelHref = (m: ImportedModel): string =>
  m.shelf === "flexi" || m.shelf === "fidget" ? `/fidgets/${m.id}` : `/products/${m.id}`;

const toFound = (m: ImportedModel, nameHit = false): Found => ({
  id: m.id,
  name: heName(m),
  shelf: m.shelf,
  shelfLabel: SHELF_LABEL[m.shelf] ?? "",
  price: priceOf(m),
  hours: m.hours,
  href: modelHref(m),
  nameHit,
});

/** Built once. The catalogue does not change while a page is open. */
let index: { model: ImportedModel; title: string; haystack: string }[] | null = null;

const build = () =>
  (index ??= sellableModels().map((m) => {
    // The Hebrew name, the original title and the shelf all identify a product
    // to somebody: one person types "דרקון", another "dragon", another
    // "פידג'ט". The name is kept apart so a hit on it can count for more.
    const title = fold(`${heName(m)} ${m.name}`);
    return {
      model: m,
      title,
      haystack: `${title} ${fold(`${SHELF_LABEL[m.shelf] ?? ""} ${m.desc ?? ""}`)}`,
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

  const scored: { m: ImportedModel; score: number; nameHit: boolean }[] = [];
  for (const { model, title, haystack } of build()) {
    let score = 0;
    let nameHit = false;
    for (const w of words) {
      if (!haystack.includes(w)) continue;
      // A longer word is a more specific claim; a whole-word hit beats a
      // fragment, which keeps "תג" from matching every word containing it.
      score += new RegExp(`(^| )${w}( |$)`).test(haystack) ? w.length * 2 : w.length;
      if (title.includes(w)) nameHit = true;
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
