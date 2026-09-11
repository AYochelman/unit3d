import { CONTACT } from "./contact";

/**
 * Who the business legally is.
 *
 * חוק הגנת הצרכן obliges a distance seller to state its name, its business
 * number and its address before the customer buys. Every legal page and the
 * footer read from here, so the details are written once and cannot drift
 * apart — and so the two still-missing values are missing in one place.
 *
 * ⚠️ FILL THESE IN. Until `legalName` and `vatId` carry real values the site
 * shows an honest "טרם עודכן" rather than inventing a company, and
 * `businessDetailsComplete()` is false.
 */
export const BUSINESS = {
  /** Trading name, as customers know it. */
  tradingName: "Unit 3D",

  /**
   * The name on the עוסק מורשה certificate — a person's full name unless a
   * company was registered.
   * ⚠️ TODO: replace with the real name.
   */
  legalName: "",

  /** "עוסק מורשה" | "עוסק פטור" | "חברה בע\"מ" */
  entityType: "עוסק מורשה",

  /**
   * The 9-digit מספר עוסק מורשה.
   * ⚠️ TODO: replace with the real number.
   */
  vatId: "",

  /** Where the studio is. A street address is required; the city alone is not. */
  city: "גבעתיים",
  street: "",
  country: "ישראל",

  phone: CONTACT.phone,
  phoneDisplay: CONTACT.phoneDisplay,
  email: CONTACT.email,
  whatsapp: CONTACT.whatsapp,
  site: "https://unit-3d.com",

  /**
   * Who answers a privacy request, and who answers an accessibility one.
   * Both are the owner here; the accessibility regulations require the
   * coordinator's name and a way to reach them.
   */
  contactPerson: "אריאל",

  /** Last time the legal pages were reviewed. Shown on each of them. */
  legalUpdated: "2026-09-11",
} as const;

/** Is there enough here to print a lawful "who we are" block? */
export const businessDetailsComplete = (): boolean =>
  Boolean(BUSINESS.legalName && BUSINESS.vatId && BUSINESS.street);

/** The address as one line, with whatever is actually known. */
export const addressLine = (): string =>
  [BUSINESS.street, BUSINESS.city, BUSINESS.country].filter(Boolean).join(", ");

/** A value, or an honest placeholder — never an invented one. */
export const orPending = (v: string): string => v || "טרם עודכן";
