// How every shelf decides what a visitor sees first.
//
// The owner named five things that should decide the order, and each one gets
// a term below with a real number behind it:
//
//   1. downloads          how many people took a copy
//   2. how it looks       how many photographs the page can show
//   3. will they buy it   how many people saved it, and how many printed it
//   4. is it hot now      downloads per month since it was published
//   5. does it belong     whether its own tags match the shelf it sits on
//
// WHY A SCORE AND NOT A SORT BY EACH IN TURN
//
// Sorting by one field and breaking ties with the next means the second field
// almost never speaks: exact ties in a download count are rare. Adding the
// terms lets a model with 6,000 downloads that 18,000 people SAVED beat one
// with 9,000 downloads nobody kept — which is the judgement the owner asked
// for, and a tie-break could never express.
//
// WHY EVERY TERM IS A LOG
//
// These counts span four orders of magnitude: 382 downloads to 105,957. On a
// linear scale the top model is 277 times the bottom one and no other term can
// move anything. log10 turns "ten times more" into "one point more", which is
// how a person reads these numbers anyway — 100k and 50k downloads are both
// simply "very popular".
//
// A missing signal scores 0 for that term rather than dragging the model down.
// Until scripts/fetch-signals.mjs has run there are no signals at all, every
// model scores on downloads alone, and the shelves keep exactly the order they
// have today.

import { SIGNALS, type ModelSignals } from "./signals.generated";

export type RankInput = {
  /** Catalogue id, with or without the mw- prefix. */
  id: string;
  /** The shelf it is sitting on, for the relevance term. */
  shelf?: string;
  /** Downloads as the catalogue row records them, when signals are missing. */
  downloads?: number;
  /** How many photographs the product page can show. */
  shots?: number;
  /** Words to match against the shelf when the model has no tags. */
  name?: string;
};

const log = (n: number) => Math.log10(Math.max(0, n) + 1);

/** Signals for a row, by either spelling of its id. */
export function signalsFor(id: string): ModelSignals | undefined {
  return SIGNALS[id] ?? SIGNALS[id.replace(/^mw-/, "")];
}

/**
 * What each shelf is actually about, in the words models use about themselves.
 *
 * Read against tags first and the title second. A model can sit on a shelf
 * that does not match — the import guesses, and an owner's collection called
 * "mine" says nothing about what is in it — and when that happens the model
 * should not lead a shelf it only half belongs to.
 *
 * Absence is neutral, never negative: an unmatched model still shows, it just
 * does not get the bonus. Pushing it DOWN would hide a good product over a
 * vocabulary gap, and these lists are nowhere near complete enough for that.
 */
const SHELF_WORDS: Record<string, RegExp> = {
  fidget: /fidget|clicker|spinner|stress|sensory|adhd|desk toy|tactile|print in place/,
  flexi: /flexi|flexible|articulated|articulate|bendy|squishy|snake|dragon|dino/,
  statues: /statue|sculpture|bust|figure|figurine|miniature|decor|art|sculptures/,
  pets: /pet|pets|dog|cat|bird|fish|aquarium|feeder|collar|kitten|puppy/,
  home: /home|household|kitchen|bathroom|decor|house|shelf|hook|hanger|holder|storage|organizer|lamp|vase/,
  office: /office|desk|pen|pencil|cable|monitor|laptop|stationery|organizer|tray|stand/,
  screen: /movie|film|series|tv|game|gaming|anime|marvel|star wars|comic|character/,
  smoke: /smok|cigar|ashtray|grinder|rolling|tobacco|lighter/,
  b2b: /business|logo|brand|corporate|sign|nameplate|award|trophy/,
  trendy: /trend|viral|popular|new/,
};

/** Months since publication, or undefined when the date is unknown. */
function ageMonths(published: string): number | undefined {
  if (!published) return undefined;
  const t = Date.parse(published);
  if (Number.isNaN(t)) return undefined;
  const months = (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44);
  // A model published in the future, or today, is one month old: dividing by
  // zero months would make its rate infinite and put it above everything.
  return Math.max(1, months);
}

export type RankParts = {
  downloads: number;
  looks: number;
  intent: number;
  heat: number;
  relevance: number;
  picked: number;
  total: number;
};

/**
 * The five terms, and what each is worth.
 *
 * The weights are a judgement, not a measurement, so they are written here in
 * one place where they can be argued with rather than spread through the
 * sorting code:
 *
 *   intent    1.4  the strongest, and the one the shop cares about most —
 *                  saving and printing cost something, a download costs a click
 *   downloads 1.0  the broadest measure of interest, and the only one every
 *                  model has
 *   heat      0.8  a model that earns 2,000 downloads a month now beats one
 *                  that earned 20,000 over four years
 *   looks     0.6  a product page with twelve photographs sells better than
 *                  one with a single cover, whatever the model is
 *   relevance 0.5  a bonus for belonging, never a penalty for not
 *   picked    0.3  MakerWorld's editors are a second opinion worth a nudge
 */
export function rankParts(it: RankInput): RankParts {
  const s = signalsFor(it.id);

  const downloads = log(s?.downloads ?? it.downloads ?? 0);

  // Pictures, with the cover not counted as a gallery: one photograph is what
  // every model has, and the term is about having MORE than that.
  const looks = log(Math.max(0, (it.shots ?? 0) - 1)) * 1.6;

  // Saves and prints both mean "I want this", prints more so. Comments are a
  // weak third: a page people talk on is a page people looked at properly.
  const intent = s ? log(s.saves) * 0.6 + log(s.prints) * 0.5 + log(s.comments) * 0.2 : 0;

  const months = s ? ageMonths(s.published) : undefined;
  const heat = s && months ? log(s.downloads / months) : 0;

  const words = SHELF_WORDS[it.shelf ?? ""];
  const text = [...(s?.tags ?? []), ...(s?.cats ?? []), it.name ?? ""].join(" ").toLowerCase();
  const relevance = words && text && words.test(text) ? 1 : 0;

  const picked = s?.picked ? 1 : 0;

  const total =
    intent * 1.4 + downloads * 1.0 + heat * 0.8 + looks * 0.6 + relevance * 0.5 + picked * 0.3;

  return { downloads, looks, intent, heat, relevance, picked, total };
}

export const rankScore = (it: RankInput): number => rankParts(it).total;
