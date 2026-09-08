import type { MaterialId } from "./types";

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
export type UnitFormId = "keychain" | "dogtag" | "magnet" | "desk" | "wall";

export type UnitForm = {
  id: UnitFormId;
  label: string;
  desc: string;
  dim: string;
  grams: number;
  hours: number;
  material: MaterialId;
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
    price: 320,
  },
];

export const UNIT_FORM_BY_ID: Record<UnitFormId, UnitForm> = Object.fromEntries(
  UNIT_FORMS.map((f) => [f.id, f]),
) as Record<UnitFormId, UnitForm>;

/** The admin price key for a form, so /admin can override it like any product. */
export const unitFormItemId = (id: UnitFormId) => `unit-${id}`;
