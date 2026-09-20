// Who is carrying the parcel, and where the customer watches it travel.
//
// Separate from lib/shipping.ts on purpose: that file prices a shipment before
// it exists (rates, packaging, what it will cost to send). This one is about a
// parcel that is already on its way.

export type CourierId =
  | "israel-post" | "cheetah" | "hfd" | "baldar" | "ups" | "fedex" | "dhl" | "other";

export type Courier = {
  id: CourierId;
  label: string;
  /**
   * The customer-facing tracking page for a number, when the format is known.
   *
   * Absent means the carrier has a tracking page whose address is not
   * something to guess at. A link built from a wrong pattern looks exactly
   * like a working one until the customer clicks it and lands on an error,
   * which is worse than sending no link at all. For those the admin pastes the
   * real link once and `Shipment.url` carries it.
   */
  track?: (code: string) => string;
};

export const COURIERS: Courier[] = [
  {
    id: "israel-post",
    label: "דואר ישראל",
    track: (c) => `https://mypost.israelpost.co.il/itemtrace?itemcode=${encodeURIComponent(c)}`,
  },
  // The Israeli couriers below each have a tracking page, and none of them has
  // an address for it that is safe to construct from here. They stay on the
  // list because naming the carrier is useful on its own — the customer knows
  // who is knocking — and the link comes from the admin when there is one.
  { id: "cheetah", label: "צ'יטה" },
  { id: "hfd", label: "HFD" },
  { id: "baldar", label: "בלדר" },
  {
    id: "ups",
    label: "UPS",
    track: (c) => `https://www.ups.com/track?loc=he_IL&tracknum=${encodeURIComponent(c)}`,
  },
  {
    id: "fedex",
    label: "FedEx",
    track: (c) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(c)}`,
  },
  {
    id: "dhl",
    label: "DHL",
    track: (c) => `https://www.dhl.com/il-he/home/tracking.html?tracking-id=${encodeURIComponent(c)}`,
  },
  { id: "other", label: "אחר" },
];

export const COURIER_BY_ID = Object.fromEntries(COURIERS.map((c) => [c.id, c])) as Record<CourierId, Courier>;

export type Shipment = {
  courier: CourierId;
  /** The number the carrier gave it. */
  code: string;
  /** A tracking link pasted by hand, for a carrier with no known pattern. */
  url?: string;
  /** When it was handed over. */
  at: string;
};

/**
 * Where to send the customer to follow the parcel.
 *
 * A pasted link wins over a built one: it was seen working by a person, the
 * pattern was not. Returns undefined rather than a guess when there is
 * neither, and the letter then prints the number without pretending it is
 * clickable.
 */
export function trackUrl(s: Shipment | undefined): string | undefined {
  if (!s) return undefined;
  const pasted = s.url?.trim();
  if (pasted) return pasted;
  const code = s.code.trim();
  if (!code) return undefined;
  return COURIER_BY_ID[s.courier]?.track?.(code);
}

/** Who is carrying it: "דואר ישראל". */
export const courierName = (s: Shipment | undefined): string =>
  s ? COURIER_BY_ID[s.courier]?.label ?? s.courier : "";

/** "דואר ישראל · RR123456789IL", for one line of text. */
export function shipmentLabel(s: Shipment | undefined): string {
  if (!s) return "";
  const name = courierName(s);
  return s.code.trim() ? `${name} · ${s.code.trim()}` : name;
}
