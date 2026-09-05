import type { ConfigProductId, Product, ProductArtId } from "./types";

// Everything on the site can be taken into the designer (/configurator).
//
// A shelf product is not itself a designer base — the designer works on flat
// printable faces — so each product points at the base that matches it: a pet
// tag opens the tag designer, a coaster opens the coaster, a door sign opens
// the name plate. Products that carry an engraving field are "personalizable":
// their card jumps straight into the designer instead of into a product page,
// because that is what the customer came to do.

/**
 * Products the shop personalises even though their title does not say so.
 *
 * The title test below is deliberately conservative, so anything the owner
 * offers with the customer's own text on it is named here instead: a coaster is
 * sold blank on MakerWorld and with a name on it here.
 */
const PERSONAL_IDS = new Set<string>([
  "mw-13127",   // תחתיות קלועות
  "mw-42516",   // סט תחתיות תקליט
  "mw-40121",   // תחתית לכוס
  "mw-48552",   // שלט לדלת
  "mw-48131",   // מתלה מפתחות
  "mw-44432",   // מתלה מפתחות לקיר
  "mw-59837",   // וו לקיר
  "mw-50369",   // וו קיר למטאטא
  "mw-26009",   // סימנייה · מהדק ענק
  "mw-26806",   // מעמד כרטיסי ביקור
  "mw-23274",   // מעמד כרטיסי ביקור · מוסך
  "mw-18356",   // גביע כוכב
]);

/** Explicit choices for the hand-written catalogue. */
const BASE_BY_ID: Record<string, ConfigProductId> = {
  "pet-scoop": "name_plate",
  "pet-bag-holder": "keychain",
  "off-pen-holder": "name_plate",
  "off-headphone-stand": "name_plate",
  "off-phone-stand": "name_plate",
  "off-card-holder": "name_plate",
  "off-organizer": "name_plate",
  "home-planter": "coaster",
  "home-key-rack": "name_plate",
  "st-trophy": "name_plate",
  "st-bust": "keychain",
};

/** Otherwise the drawing tells us what shape it is. */
const BASE_BY_ART: Partial<Record<ProductArtId, ConfigProductId>> = {
  bone: "pet_tag",
  round: "pet_tag",
  heart: "pet_tag",
  fish: "pet_tag",
  paw: "pet_tag",
  qr: "pet_tag",
  dogtag: "dog_tag",
  coaster: "coaster",
  hook: "wall_hook",
  cableclip: "cable_clip",
  bagclip: "cable_clip",
  bookmark: "bookmark",
  nameplate: "name_plate",
  doorsign: "name_plate",
  keyrack: "name_plate",
  penholder: "name_plate",
  cardholder: "name_plate",
  headphones: "name_plate",
  trophy: "name_plate",
  luggage: "luggage_tag",
  phonecase: "phone_case",
  lighter: "lighter_case",
  keychain: "keychain",
};

// Imported MakerWorld models carry no `engraving` field — the personalisation
// lives in their title ("Fully Custom Pet Tag with Phone Number", "Editable
// name keychain"). Reading it from the text is what makes the whole shelf work,
// not just the hand-written catalogue.
const PERSONAL_EN =
  /\b(custom\w*|personali[sz]\w*|editable|monogram\w*|engrav\w*|nameplate|sign|trophy|name\s?(?:tag|plate|keychain|badge|holder)|luggage\s?tags?)\b/i;
const PERSONAL_HE =
  /(התאמה אישית|מותאם אישית|בהתאמה אישית|עיצוב אישי|עם שם|שם וטלפון|תג שם|תג לחיה|תג לכלב|תגי מזוודה|תג למזוודה|חריטה|מונוגרם|ניתן לעריכה|גביע)/;

// Titles only. Imported models share a boiler-plate description ("פריט לשולחן
// העבודה. אפשר עם שם או לוגו.") which would otherwise mark the whole office
// shelf as personalised.
const textOf = (p: Pick<Product, "name" | "nameEn">): string => `${p.name} ${p.nameEn ?? ""}`;

/** Guess the designer base from the title when the drawing does not say. */
function baseFromText(text: string): ConfigProductId | undefined {
  const t = text.toLowerCase();
  if (/luggage|מזוודה/.test(t)) return "luggage_tag";
  if (/keychain|key ?ring|מחזיק מפתחות/.test(t)) return "keychain";
  if (/pet tag|dog tag|תג לחיה|תג לכלב|תג לחתול/.test(t)) return "pet_tag";
  if (/name tag|תג שם/.test(t)) return "name_plate";
  if (/coaster|תחתי/.test(t)) return "coaster";
  if (/key rack|מתלה מפתחות/.test(t)) return "name_plate";
  if (/wall hook|וו לקיר|וו קיר|וו מגבת/.test(t)) return "wall_hook";
  if (/bookmark|סימניי/.test(t)) return "bookmark";
  if (/phone ?case|iphone|קייס.*(?:אייפון|טלפון|גלקסי)/.test(t)) return "phone_case";
  if (/\bsign\b|nameplate|name plate|trophy|שלט|גביע/.test(t)) return "name_plate";
  return undefined;
}

/** Which designer base opens for this product. Never null — everything is designable. */
export function designBaseFor(p: Pick<Product, "id" | "art" | "engraving" | "name" | "nameEn">): ConfigProductId {
  return (
    BASE_BY_ID[p.id] ??
    // The title beats the drawing: imported models nearly all share one generic
    // `art`, so "תגי מזוודה" must reach the luggage tag and not the keychain.
    baseFromText(textOf(p)) ??
    BASE_BY_ART[p.art] ??
    (p.engraving ? "name_plate" : "keychain")
  );
}

/** True when the product is sold with the customer's own text on it. */
export function isPersonalizable(p: Pick<Product, "id" | "engraving" | "name" | "nameEn">): boolean {
  if (p.engraving || PERSONAL_IDS.has(p.id)) return true;
  const t = textOf(p);
  return PERSONAL_EN.test(t) || PERSONAL_HE.test(t);
}

/**
 * Deep link into the designer, on THIS product rather than on its category.
 *
 * `product` picks the drawing, the face and the steps; `item` carries the
 * catalogue row, so the designer opens named, priced and pictured as the exact
 * thing the customer clicked — not as a generic "דיסקית".
 */
export function designHref(p: Pick<Product, "id" | "art" | "engraving" | "name" | "nameEn">): string {
  return `/configurator?product=${designBaseFor(p)}&item=${encodeURIComponent(p.id)}`;
}

/** Anything that is not a catalogue product (a fidget, an emblem) still opens the keychain. */
export function designHrefForItem(id: string, base: ConfigProductId = "keychain"): string {
  return `/configurator?product=${base}&item=${encodeURIComponent(id)}`;
}
