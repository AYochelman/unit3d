// Israel Post rates, packaging costs, and the calculator that combines them.
//
// SOURCE — every price in RATES comes from Israel Post's own published business
// price list, "עיקרי מחירון עסקי – דואר ישראל, ינואר 2026" (PDF, VAT included):
// https://cdn-mypostpublic.israelpost.co.il/media/media/x50d2wyi/112026-מחירון-עסקי.pdf
// Their live price calculator sits behind a captcha, so this table is read from
// that document rather than queried. Re-read the PDF when they publish a new
// one and update RATES — nothing else needs to change.
//
// NOTE ON "DISTANCE": Israel Post does not price a domestic package by
// kilometres. Weight decides the band, and the only geography that changes the
// price is whether the delivery is inside the sender's city or between cities
// (and that only on the door-delivery service). The calculator reflects that
// rather than inventing a per-km rate.

export const RATES_SOURCE = {
  title: "עיקרי מחירון עסקי – דואר ישראל, ינואר 2026",
  url: "https://cdn-mypostpublic.israelpost.co.il/media/media/x50d2wyi/112026-%D7%9E%D7%97%D7%99%D7%A8%D7%95%D7%9F-%D7%A2%D7%A1%D7%A7%D7%99.pdf",
  updated: "ינואר 2026",
  note: "המחירים כוללים מע\"מ.",
};

/** Discount for preparing the shipment at home through "דואר בקליק". */
export const CLICK_DISCOUNT = 3;

export type Destination = "city" | "intercity";

/** Monthly volume tier — Israel Post's package price drops as you ship more. */
export type VolumeTier = "upto10" | "upto100" | "upto1000" | "over1000";

export const VOLUME_TIERS: { id: VolumeTier; label: string }[] = [
  { id: "upto10", label: "עד 10 חבילות בחודש" },
  { id: "upto100", label: "11 עד 100" },
  { id: "upto1000", label: "101 עד 1,000" },
  { id: "over1000", label: "מעל 1,000" },
];

/** חבילות מאשנב לאשנב — you hand it in, they collect it from a branch. */
const PARCEL_COUNTER: Record<VolumeTier, { maxKg: number; ils: number }[]> = {
  upto10:    [{ maxKg: 2, ils: 38 }, { maxKg: 5, ils: 47 }, { maxKg: 10, ils: 55 }, { maxKg: 20, ils: 69 }],
  upto100:   [{ maxKg: 2, ils: 31 }, { maxKg: 5, ils: 36 }, { maxKg: 10, ils: 39 }, { maxKg: 20, ils: 52 }],
  upto1000:  [{ maxKg: 2, ils: 23 }, { maxKg: 5, ils: 27 }, { maxKg: 10, ils: 27 }, { maxKg: 20, ils: 36 }],
  over1000:  [{ maxKg: 2, ils: 21 }, { maxKg: 5, ils: 23 }, { maxKg: 10, ils: 23 }, { maxKg: 20, ils: 29 }],
};

/** משלוחים מהירים מאשנב לדלת — delivered to the customer's door. */
const PARCEL_DOOR: { maxKg: number; city: number; intercity: number }[] = [
  { maxKg: 1, city: 50.5, intercity: 67 },
  { maxKg: 10, city: 63, intercity: 73 },
  { maxKg: 20, city: 75, intercity: 86 },
];

/**
 * דואר רשום — cheapest way to send something small and light, with tracking.
 * The published table's lightest band is read here as "up to 200 g"; Israel
 * Post also lists a sub-50 g rate which is not legible in the PDF text layer,
 * so the calculator never quotes below this band.
 */
const REGISTERED: { maxG: number; ils: number }[] = [
  { maxG: 200, ils: 18.5 },
  { maxG: 500, ils: 22.5 },
  { maxG: 1000, ils: 24.5 },
  { maxG: 2000, ils: 29 },
];

/** Max size Israel Post accepts for a registered-mail envelope, in mm. */
const ENVELOPE_MAX = { l: 237, w: 160, h: 50 };

// ── Packaging ────────────────────────────────────────────────────────────────
//
// Prices are per unit from stockarton.co.il (September 2026), a wholesale
// packaging shop that sells online with no minimum order.

export const PACKAGING_SOURCE = { name: "סטוק קרטון", url: "https://stockarton.co.il" };

export type Packaging = {
  id: string;
  label: string;
  /** Internal size it fits, in mm. */
  fits: { l: number; w: number; h: number };
  ils: number;
  /** Protects a fragile print on its own. */
  protective: boolean;
  note?: string;
};

export const PACKAGING: Packaging[] = [
  { id: "bubble-a", label: "מעטפה מרופדת בועות · דגם A", fits: { l: 175, w: 110, h: 25 }, ils: 0.78, protective: true },
  { id: "bubble-c", label: "מעטפה מרופדת בועות · דגם C", fits: { l: 210, w: 150, h: 30 }, ils: 0.94, protective: true },
  { id: "bubble-d", label: "מעטפה מרופדת בועות · דגם D", fits: { l: 265, w: 180, h: 35 }, ils: 1.63, protective: true },
  { id: "bubble-g", label: "מעטפה מרופדת בועות · דגם G", fits: { l: 340, w: 240, h: 40 }, ils: 1.88, protective: true },
  { id: "box-16", label: "קרטון 16×5×5 ס\"מ", fits: { l: 160, w: 50, h: 50 }, ils: 2.06, protective: false },
  { id: "box-2210", label: "קרטון 22×10×10 ס\"מ", fits: { l: 220, w: 100, h: 100 }, ils: 2.65, protective: false },
  { id: "box-2510", label: "קרטון 25×20×10 ס\"מ", fits: { l: 250, w: 200, h: 100 }, ils: 2.57, protective: false },
  { id: "box-1818", label: "קרטון 18×18×18 ס\"מ", fits: { l: 180, w: 180, h: 180 }, ils: 2.28, protective: false },
  { id: "box-3020", label: "קרטון דו-גלי 30×20×10 ס\"מ", fits: { l: 300, w: 200, h: 100 }, ils: 3.27, protective: false, note: "דו-גלי — לפריטים שבירים" },
  { id: "box-3030", label: "קרטון דו-גלי 30×30×20 ס\"מ", fits: { l: 300, w: 300, h: 200 }, ils: 4.21, protective: false, note: "דו-גלי — לפריטים שבירים" },
];

/** Bubble wrap and tape, charged per shipment. */
export const CONSUMABLES = {
  /** גליל ניילון בועות 0.5 מ' — ₪72 the roll; a wrap of a small print is ~0.4 m². */
  bubbleWrapPerShipment: 0.9,
  /** סרט הדבקה ₪7.95 the roll, roughly 60 boxes from one. */
  tapePerShipment: 0.15,
  /** מדבקת משלוח — 4×6 תרמית, קופסה של 500 בכ-₪60. */
  labelPerShipment: 0.12,
};

const band = <T extends { maxKg?: number; maxG?: number }>(
  rows: T[],
  grams: number,
  key: "maxKg" | "maxG",
): T | undefined =>
  rows.find((r) => (key === "maxKg" ? grams <= (r.maxKg as number) * 1000 : grams <= (r.maxG as number)));

export type QuoteInput = {
  /** Weight of the printed item(s), in grams — packaging is added on top. */
  grams: number;
  /** Longest, middle and shortest dimension in mm. */
  size: { l: number; w: number; h: number };
  destination: Destination;
  tier: VolumeTier;
  /** Prepared at home through "דואר בקליק". */
  click: boolean;
  fragile: boolean;
};

export type QuoteOption = {
  id: string;
  service: string;
  detail: string;
  shipping: number;
  packaging: number;
  packagingLabel: string;
  total: number;
  /** Why this option is not available, when it is not. */
  unavailable?: string;
};

/** The lightest packaging the item actually fits into. */
export function pickPackaging(size: QuoteInput["size"], fragile: boolean): Packaging | undefined {
  const [l, w, h] = [size.l, size.w, size.h].sort((a, b) => b - a);
  const fits = PACKAGING.filter((p) => {
    const [pl, pw, ph] = [p.fits.l, p.fits.w, p.fits.h].sort((a, b) => b - a);
    return l <= pl && w <= pw && h <= ph;
  });
  // A fragile print wants a box or a padded envelope, never a bare box edge.
  const preferred = fragile ? fits.filter((p) => p.protective || p.note) : fits;
  const pool = preferred.length ? preferred : fits;
  return pool.sort((a, b) => a.ils - b.ils)[0];
}

const round = (n: number) => Math.round(n * 100) / 100;

export function quote(input: QuoteInput): QuoteOption[] {
  const pack = pickPackaging(input.size, input.fragile);
  const packWeight = pack ? (pack.protective ? 20 : 90) : 40; // envelope vs box, grams
  const total = input.grams + packWeight;

  const extras =
    (input.fragile ? CONSUMABLES.bubbleWrapPerShipment : 0) +
    CONSUMABLES.tapePerShipment +
    CONSUMABLES.labelPerShipment;
  const packaging = round((pack?.ils ?? 0) + extras);
  const packagingLabel = pack ? pack.label : "לא נמצאה אריזה מתאימה";

  const discount = input.click ? CLICK_DISCOUNT : 0;
  const out: QuoteOption[] = [];

  // ── דואר רשום ────────────────────────────────────────────────────────────
  const [l, w, h] = [input.size.l, input.size.w, input.size.h].sort((a, b) => b - a);
  const fitsEnvelope = l <= ENVELOPE_MAX.l && w <= ENVELOPE_MAX.w && h <= ENVELOPE_MAX.h;
  const reg = band(REGISTERED, total, "maxG");
  if (reg && fitsEnvelope) {
    const shipping = round(reg.ils - discount);
    out.push({
      id: "registered",
      service: "דואר רשום",
      detail: "עם מעקב · נמסר לסניף או לתיבה",
      shipping,
      packaging,
      packagingLabel,
      total: round(shipping + packaging),
    });
  } else {
    out.push({
      id: "registered",
      service: "דואר רשום",
      detail: "עם מעקב",
      shipping: 0,
      packaging,
      packagingLabel,
      total: 0,
      unavailable: !fitsEnvelope
        ? "החבילה גדולה מדי למעטפה (מקסימום 23.7×16×5 ס\"מ)"
        : "מעל 2 ק\"ג — צריך חבילה",
    });
  }

  // ── חבילה מאשנב לאשנב ────────────────────────────────────────────────────
  const counter = band(PARCEL_COUNTER[input.tier], total, "maxKg");
  out.push(
    counter
      ? {
          id: "counter",
          service: "חבילה · מאשנב לאשנב",
          detail: "הלקוח אוסף מסניף הדואר",
          shipping: round(counter.ils - discount),
          packaging,
          packagingLabel,
          total: round(counter.ils - discount + packaging),
        }
      : {
          id: "counter",
          service: "חבילה · מאשנב לאשנב",
          detail: "",
          shipping: 0,
          packaging,
          packagingLabel,
          total: 0,
          unavailable: "מעל 20 ק\"ג — לא בשירות הזה",
        },
  );

  // ── משלוח מהיר עד הדלת ───────────────────────────────────────────────────
  const door = band(PARCEL_DOOR, total, "maxKg");
  out.push(
    door
      ? {
          id: "door",
          service: "משלוח מהיר · עד הדלת",
          detail: input.destination === "city" ? "בתוך העיר" : "בין-עירוני",
          shipping: door[input.destination === "city" ? "city" : "intercity"],
          packaging,
          packagingLabel,
          total: round(door[input.destination === "city" ? "city" : "intercity"] + packaging),
        }
      : {
          id: "door",
          service: "משלוח מהיר · עד הדלת",
          detail: "",
          shipping: 0,
          packaging,
          packagingLabel,
          total: 0,
          unavailable: "מעל 20 ק\"ג — לא בשירות הזה",
        },
  );

  // ── איסוף עצמי ───────────────────────────────────────────────────────────
  out.push({
    id: "pickup",
    service: "איסוף עצמי",
    detail: "מפתח תקווה, בתיאום",
    shipping: 0,
    packaging: round(packaging - CONSUMABLES.labelPerShipment),
    packagingLabel: pack ? `${pack.label} (לא חובה)` : "ללא אריזה",
    total: round(packaging - CONSUMABLES.labelPerShipment),
  });

  return out.sort((a, b) => {
    if (a.unavailable && !b.unavailable) return 1;
    if (b.unavailable && !a.unavailable) return -1;
    return a.total - b.total;
  });
}

/** Total weight including packaging, for display. */
export const shippedWeight = (grams: number, pack?: Packaging) =>
  grams + (pack ? (pack.protective ? 20 : 90) : 40);
