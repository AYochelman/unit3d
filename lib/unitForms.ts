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
   * actually asking. Two sources: a shelf product's own catalogue image, and a
   * path under public/studio for the bodies Ariel has printed and photographed
   * himself — those are the better ones, because they show the emblem ON the
   * body, which is what this screen is for. The drawing stays as the fallback.
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
    // Ariel's own photograph of one on a wall. It arrived named .jpg and is
    // actually a WebP — browsers sniff the bytes and render it either way, but
    // the server still labels it image/jpeg from the extension, and anything
    // that trusts that label rather than the content is then simply wrong.
    // The extension says what the file is.
    photo: "/studio/wall-emblem.webp",
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
    // Ariel's own print, and the only photo on this screen that answers the
    // question the screen is asking: the designer's catalogue shot is a bare
    // sleeve, and someone choosing a body for their unit emblem wants to see
    // the emblem ON it. Stored as shot, 3:4 — the tile is aspect-[4/3] with
    // object-cover, which lands on the front face, the emblem and the open lid.
    photo: "/studio/cigcase-emblem.webp",
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
    // Both marks, and which is where: the photograph shows the unit's name
    // raised on the lid and the emblem in the base, and the old line said only
    // "הסמל על המכסה" — a card whose words and picture disagree. Measured in
    // every font the build ships, at 11px in the 176px column: two lines, 30px,
    // inside the 32px the desc box gives it.
    desc: "דו-חלקי עם שיניים מודפסות. השם על המכסה, הסמל בפנים.",
    dim: "Ø60mm",
    grams: 67,
    hours: 2.2,
    material: "pla",
    group: "everyday",
    art: "round",
    // Ariel's own print, like the case above: the designer's catalogue shot is
    // a plain grinder, and this screen exists to show the emblem ON the body.
    // Native 4:3, so the aspect-[4/3] tile crops nothing.
    photo: "/studio/grinder-emblem.webp",
    price: 55,
  },
];

export const UNIT_FORM_BY_ID: Record<UnitFormId, UnitForm> = Object.fromEntries(
  UNIT_FORMS.map((f) => [f.id, f]),
) as Record<UnitFormId, UnitForm>;

/** The admin price key for a form, so /admin can override it like any product. */
export const unitFormItemId = (id: UnitFormId) => `unit-${id}`;
