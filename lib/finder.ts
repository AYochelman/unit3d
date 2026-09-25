/**
 * "איזו הדפסה מתאימה לך" — the questionnaire behind /finder.
 *
 * The shop has ten shelves and a designer, and a first-time visitor has no
 * way to know which of them is for them. Three questions narrow it down: who
 * it is for, what kind of thing, and roughly how much. Each answer adds
 * points to the shelves it fits; the shelf with the most points is the
 * recommendation, the next two are the alternatives.
 *
 * Everything the owner will want to tune is in this file and nowhere else:
 * the questions, the wording of every option, which shelves an answer
 * favours and by how much, and what the result page says about each shelf.
 * The UI in app/finder/FinderClient.tsx only renders what is here. Prices
 * and the product suggestions come from the catalogue (lib/finder-cards.ts).
 */
import { shelfPriceText } from "./finder-cards";

export type ShelfId =
  | "catalog" | "configurator" | "b2b" | "fidgets" | "pets" | "statues"
  | "screen" | "smoke" | "home-office" | "upload";

export type Shelf = {
  id: ShelfId;
  href: string;
  title: string;
  /** One line under the title on the result card. */
  blurb: string;
};

export const SHELVES: Record<ShelfId, Shelf> = {
  catalog:      { id: "catalog",      href: "/catalog/",      title: "סמלי יחידות",        blurb: "100 סמלי יחידות צה\"ל, מוכנים להדפסה ואפשר להוסיף שם." },
  configurator: { id: "configurator", href: "/configurator/", title: "המעצב האישי",         blurb: "מחזיק מפתחות, שלט, מגן — כותבים שם או לוגו ורואים מחיר מיד." },
  b2b:          { id: "b2b",          href: "/b2b/",          title: "מתנות לעובדים",       blurb: "הזמנה לחברה או ליחידה, עם הלוגו שלכם ומחיר לכמות." },
  fidgets:      { id: "fidgets",      href: "/fidgets/",      title: "פידג'טים ופלקסי",     blurb: "144 דגמים — דרקונים שמתקפלים, מפרקי לחץ, צעצועי שולחן." },
  pets:         { id: "pets",         href: "/pets/",         title: "תגים לחיות",          blurb: "תג שם עם טלפון לכלב או לחתול, ב-PETG שלא נשבר." },
  statues:      { id: "statues",      href: "/statues/",      title: "פסלים ודמויות",       blurb: "באסטים, דמויות ופסלי שולחן — לאספנים ולמתנה שמרשימה." },
  screen:       { id: "screen",       href: "/screen/",       title: "סרטים וסדרות",        blurb: "דמויות ואביזרים מהסרטים והסדרות שאתם אוהבים." },
  smoke:        { id: "smoke",        href: "/smoke/",        title: "מוצרי עישון",         blurb: "קופסאות סיגריות, מאפרות, גריינדרים — אפשר עם שם." },
  "home-office":{ id: "home-office",  href: "/home-office/",  title: "לבית ולמשרד",         blurb: "מארגנים, מעמדים, מתלים — דברים שמסדרים לך את השולחן." },
  upload:       { id: "upload",       href: "/upload/",       title: "הדפסה מהקובץ שלך",    blurb: "יש לך כבר STL? שולחים, מקבלים מחיר, מדפיסים." },
};

export type Option = {
  id: string;
  label: string;
  /** Shelves this answer points at, with a weight each. */
  favours: Partial<Record<ShelfId, number>>;
};

export type Question = { id: string; title: string; hint?: string; options: Option[] };

export const QUESTIONS: Question[] = [
  {
    id: "who",
    title: "למי זה?",
    options: [
      { id: "me",      label: "לעצמי",              favours: { fidgets: 2, statues: 2, screen: 2, "home-office": 2, smoke: 1, configurator: 1 } },
      { id: "friend",  label: "מתנה לחבר או לחברה", favours: { configurator: 3, statues: 2, screen: 2, fidgets: 1, smoke: 1 } },
      { id: "soldier", label: "לחייל, לחיילת או ליחידה", favours: { catalog: 5, configurator: 2, b2b: 1 } },
      { id: "company", label: "לעובדים או לחברה",   favours: { b2b: 5, configurator: 2 } },
      { id: "pet",     label: "לחיית המחמד",        favours: { pets: 6 } },
    ],
  },
  {
    id: "what",
    title: "מה בא לך?",
    hint: "אפשר לבחור יותר מאחד.",
    options: [
      { id: "named",   label: "משהו עם שם או לוגו",   favours: { configurator: 3, catalog: 2, b2b: 2, pets: 1, smoke: 1 } },
      { id: "play",    label: "משהו לשחק בו",         favours: { fidgets: 4 } },
      { id: "figure",  label: "פסל או דמות",          favours: { statues: 4, screen: 2 } },
      { id: "fandom",  label: "מהסרטים והסדרות",      favours: { screen: 4, statues: 1 } },
      { id: "useful",  label: "משהו שימושי לבית או למשרד", favours: { "home-office": 4, configurator: 1 } },
      { id: "smoke",   label: "מוצרי עישון",          favours: { smoke: 5 } },
      { id: "file",    label: "יש לי כבר קובץ להדפסה", favours: { upload: 6 } },
    ],
  },
  {
    id: "budget",
    title: "בערך כמה?",
    options: [
      { id: "low",  label: "עד ₪50",     favours: { fidgets: 2, pets: 2, configurator: 1, catalog: 1 } },
      { id: "mid",  label: "₪50–150",    favours: { catalog: 1, configurator: 1, smoke: 1, "home-office": 1, screen: 1 } },
      { id: "high", label: "יותר מ-₪150", favours: { statues: 2, screen: 1, b2b: 1 } },
      { id: "any",  label: "לא משנה, שיהיה טוב", favours: {} },
    ],
  },
];

export type Answers = Record<string, string[]>;

/**
 * What a shelf really costs — read off its products, not typed in here.
 * The middle 80% of the catalogue prices, rounded to ₪5 (lib/finder-cards.ts).
 */
export const shelfPrice = (id: ShelfId): string => shelfPriceText(id);

/** The shelves in order of fit. The first is the recommendation. */
export function recommend(answers: Answers): Shelf[] {
  const score: Record<ShelfId, number> = Object.fromEntries(
    Object.keys(SHELVES).map((k) => [k, 0]),
  ) as Record<ShelfId, number>;
  for (const q of QUESTIONS) {
    for (const picked of answers[q.id] ?? []) {
      const opt = q.options.find((o) => o.id === picked);
      if (!opt) continue;
      for (const [shelf, w] of Object.entries(opt.favours)) score[shelf as ShelfId] += w ?? 0;
    }
  }
  return (Object.keys(score) as ShelfId[])
    .filter((id) => score[id] > 0)
    .sort((a, b) => score[b] - score[a])
    .map((id) => SHELVES[id]);
}
