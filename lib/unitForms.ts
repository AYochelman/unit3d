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
  /** Catalogue price — the fallback when automatic pricing is off. */
  price: number;
};

export const UNIT_FORMS: UnitForm[] = [
  {
    id: "keychain",
    label: "מחזיק מפתחות",
    desc: "הסמל על מחזיק, עם טבעת נירוסטה.",
    dim: "47×40mm",
    grams: 12,
    hours: 1.5,
    material: "pla_plus",
    group: "emblem",
    art: "keychain",
    price: 65,
  },
  {
    id: "dogtag",
    label: "דיסקית עם שרשרת",
    desc: "דיסקית צבאית, הסמל בולט מלפנים.",
    dim: "50×28mm",
    grams: 10,
    hours: 1,
    material: "pla_plus",
    group: "emblem",
    art: "dogtag",
    price: 55,
  },
  {
    id: "magnet",
    label: "מגנט למקרר",
    desc: "מגנט שטוח עם מגנט נאודימיום מוטמע.",
    dim: "60×55mm",
    grams: 20,
    hours: 2,
    material: "pla_plus",
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
    material: "pla_matte",
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
    material: "pla_matte",
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
    material: "pla_plus",
    group: "everyday",
    art: "lighter",
    price: 45,
  },
  {
    id: "ashtray",
    label: "מאפרה",
    desc: "מאפרה שולחנית, הסמל בתחתית.",
    dim: "70×70mm",
    grams: 20,
    hours: 0.6,
    material: "petg",
    group: "everyday",
    art: "ashtray",
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
    price: 55,
  },
];

export const UNIT_FORM_BY_ID: Record<UnitFormId, UnitForm> = Object.fromEntries(
  UNIT_FORMS.map((f) => [f.id, f]),
) as Record<UnitFormId, UnitForm>;

/** The admin price key for a form, so /admin can override it like any product. */
export const unitFormItemId = (id: UnitFormId) => `unit-${id}`;
