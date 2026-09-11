import { IMPORTED } from "./imported";
import { CONFIG_PRODUCT_BY_ID } from "./products";
import type { MaterialId, ProductArtId } from "./types";

/**
 * Where a unit emblem can go.
 *
 * The catalogue has always promised "מחזיק מפתחות, פסל שולחני, או במידה גדולה
 * לתלייה", but ordering one jumped straight to the contact form with a keychain
 * baked in — the customer was never asked. These are the five bodies the same
 * emblem is printed on, with the weight and time each really takes, so the live
 * pricer quotes them on the shop's own cost model rather than from a guess.
 *
 * The wall piece crosses the made-to-order line on purpose: 190g and twelve
 * hours is a conversation, not a tap-to-buy price (see MADE_TO_ORDER_FROM).
 */
export type UnitFormId =
  | "keychain"
  | "dogtag"
  | "magnet"
  | "desk"
  | "wall"
  | "lighter"
  | "cigcase"
  | "ashtray"
  | "grinder";

/** The two questions are different: is this the emblem, or a thing wearing it. */
export type UnitFormGroup = "emblem" | "everyday";

export const UNIT_FORM_GROUP: Record<UnitFormGroup, string> = {
  emblem: "הסמל עצמו",
  everyday: "על משהו שאתה משתמש בו",
};

export type UnitForm = {
  id: UnitFormId;
  label: string;
  desc: string;
  dim: string;
  grams: number;
  hours: number;
  material: MaterialId;
  group: UnitFormGroup;
  /** The line drawing on the row — recoloured live with the chosen filament. */
  art: ProductArtId;
  /**
   * A photograph of the real thing, when the shop already has one.
   *
   * Already resolved to a local copy: lib/imported.ts runs every row's image
   * through photoSrc when it builds IMPORTED. Passing it through a second time
   * prepends the /unit3d base path twice, which is a 404 on the published site
   * and invisible in dev, where the base path is empty.
   *
   * A drawing says what the body IS; a photograph says what it looks like
   * printed, which is the question someone choosing between five of them is
   * actually asking. Only the bodies that exist elsewhere in the shop have one,
   * and the drawing stays as the fallback for the rest.
   */
  photo?: string;
  /**
   * A filament that suits this body better than the one it prints in.
   *
   * The ashtray is the case: it holds a lit cigarette, so PETG is the right
   * plastic for it, and PLA is what is on the shelf. Saying so is better than
   * either silently printing the weaker one or refusing the order — the
   * customer decides, and can ask for the other.
   */
  recommends?: { material: MaterialId; why: string };
  /** Catalogue price — the fallback when automatic pricing is off. */
  price: number;
};

/** The catalogue photo of a shelf model, when it has one. */
const shelfPhoto = (id: string): string | undefined => IMPORTED.find((m) => m.id === id)?.image;

export const UNIT_FORMS: UnitForm[] = [
  {
    id: "keychain",
    label: "מחזיק מפתחות",
    desc: "הסמל על מחזיק, עם טבעת נירוסטה.",
    dim: "47×40mm",
    grams: 12,
    hours: 1.5,
    material: "pla",
    group: "emblem",
    art: "keychain",
    photo: CONFIG_PRODUCT_BY_ID.keychain.image,
    price: 65,
  },
  {
    id: "dogtag",
    label: "דיסקית עם שרשרת",
    desc: "דיסקית צבאית, הסמל בולט מלפנים.",
    dim: "50×28mm",
    grams: 10,
    hours: 1,
    material: "pla",
    group: "emblem",
    art: "dogtag",
    photo: CONFIG_PRODUCT_BY_ID.dog_tag.image,
    price: 55,
  },
  {
    id: "magnet",
    label: "מגנט למקרר",
    desc: "מגנט שטוח עם מגנט נאודימיום מוטמע.",
    dim: "60×55mm",
    grams: 20,
    hours: 2,
    material: "pla",
    group: "emblem",
    art: "coaster",
    price: 75,
  },
  {
    id: "desk",
    label: "סמל שולחני על מעמד",
    desc: "הסמל על מעמד יציב — למדף, למשרד או לסלון.",
    dim: "90×80mm",
    grams: 60,
    hours: 5,
    material: "pla",
    group: "emblem",
    art: "trophy",
    price: 140,
  },
  {
    id: "wall",
    label: "סמל גדול לתלייה",
    desc: "מידה גדולה לקיר, עם תלייה מאחור.",
    dim: "200×180mm",
    grams: 190,
    hours: 12,
    material: "pla",
    group: "emblem",
    art: "doorsign",
    price: 320,
  },
  {
    id: "lighter",
    label: "קייס למצית",
    desc: "נרתיק ל-BIC, הסמל בחזית.",
    dim: "24×60mm",
    grams: 14,
    hours: 1.2,
    material: "pla",
    group: "everyday",
    art: "lighter",
    photo: CONFIG_PRODUCT_BY_ID.lighter_case.image,
    price: 45,
  },
  {
    id: "cigcase",
    label: "מגן לחפיסת סיגריות",
    desc: "נרתיק קשיח שהחפיסה נכנסת אליו, הסמל בחזית.",
    // A standard 20-pack is 88x58x23mm; the sleeve is that plus wall and clearance.
    dim: "92×62×27mm",
    // The shop already sells this exact body on the smoking shelf, and the card
    // below now shows THAT print. So the weight and the time are its real
    // published figures rather than my estimate — a card that shows one object
    // and prices another is the kind of thing a customer notices at the door.
    grams: 64,
    hours: 1.33,
    // PLA like the rest of the bodies, so the colour list stays one list — but
    // this one lives in a pocket and in a car, and PLA is the plastic that
    // softens on a dashboard in the sun. Named, not silently swapped.
    material: "pla",
    recommends: { material: "petg", why: "לא מתעוות ברכב בשמש" },
    group: "everyday",
    art: "cigcase",
    photo: shelfPhoto("mw-713529"),
    price: 60,
  },
  {
    id: "ashtray",
    label: "מאפרה",
    desc: "מאפרה שולחנית, הסמל בתחתית.",
    dim: "70×70mm",
    grams: 20,
    hours: 0.6,
    // PLA at the owner's decision: it is what is on the shelf, and one filament
    // across every body means one colour list on the screen. The better plastic
    // for the job is named rather than dropped — see `recommends`.
    material: "pla",
    recommends: { material: "petg", why: "עומד בחום" },
    group: "everyday",
    art: "ashtray",
    photo: CONFIG_PRODUCT_BY_ID.ashtray.image,
    price: 40,
  },
  {
    id: "grinder",
    label: "גריינדר",
    desc: "דו-חלקי עם שיניים מודפסות, הסמל על המכסה.",
    dim: "Ø60mm",
    grams: 67,
    hours: 2.2,
    material: "pla",
    group: "everyday",
    art: "round",
    photo: shelfPhoto("mw-2019559"),
    price: 55,
  },
];

export const UNIT_FORM_BY_ID: Record<UnitFormId, UnitForm> = Object.fromEntries(
  UNIT_FORMS.map((f) => [f.id, f]),
) as Record<UnitFormId, UnitForm>;

/** The admin price key for a form, so /admin can override it like any product. */
export const unitFormItemId = (id: UnitFormId) => `unit-${id}`;
