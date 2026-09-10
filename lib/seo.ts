import { CONTACT } from "./contact";

/** The one place the canonical origin is written. */
export const SITE_URL = "https://unit-3d.com";

/**
 * An absolute URL for a route, matching the export's trailing slash.
 *
 * A FILE gets no slash: /img/x.webp/ is a directory that does not exist, and
 * that is what a product's photo turned into the first time round.
 */
export const abs = (path: string): string => {
  const isFile = /\.[a-z0-9]{2,5}$/i.test(path);
  const tail = path === "/" || isFile || path.endsWith("/") ? path : `${path}/`;
  return `${SITE_URL}${tail}`;
};

/**
 * Who we are, in the vocabulary Google reads.
 *
 * `LocalBusiness` rather than a bare `Organization` because the studio has an
 * address people collect from, and that is what puts a business in the map
 * results rather than only in the ten blue links.
 */
export const businessJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Unit 3D",
  alternateName: "יוניט 3D",
  url: SITE_URL,
  logo: abs("/icon.svg"),
  image: abs("/icon.svg"),
  description:
    "סטודיו הדפסת תלת מימד בגבעתיים: סמלי יחידה, מתנות לעובדים, פידג'טים, פסלים והדפסה לפי קובץ.",
  telephone: CONTACT.phone,
  email: CONTACT.email,
  priceRange: "₪₪",
  areaServed: { "@type": "Country", name: "IL" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "גבעתיים",
    addressCountry: "IL",
  },
  sameAs: [CONTACT.instagram],
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Unit 3D",
  inLanguage: "he-IL",
  publisher: { "@id": `${SITE_URL}/#business` },
});

/** A trail Google prints under the result instead of a raw URL. */
export const breadcrumbJsonLd = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.name,
    item: abs(t.path),
  })),
});

/**
 * One product, with its price.
 *
 * The price is the same number the card shows — it is passed in rather than
 * recomputed here, so a search result can never quote a price the page does
 * not. `availability` is InStock because everything is printed to order.
 */
export const productJsonLd = (p: {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  path: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${abs(p.path)}#product`,
  name: p.name,
  ...(p.description ? { description: p.description } : {}),
  ...(p.image ? { image: p.image.startsWith("http") ? p.image : abs(p.image) } : {}),
  brand: { "@type": "Brand", name: "Unit 3D" },
  offers: {
    "@type": "Offer",
    url: abs(p.path),
    priceCurrency: "ILS",
    price: Math.round(p.price),
    availability: "https://schema.org/InStock",
    seller: { "@id": `${SITE_URL}/#business` },
  },
});

export const faqJsonLd = (items: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
