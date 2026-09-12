import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/products";
import { FIDGETS } from "@/lib/data";

/**
 * /sitemap.xml — every page worth landing on, listed for Google.
 *
 * The site is a static export with `trailingSlash: true`, so each URL is
 * written with its slash: without it Google sees a redirect on every entry and
 * spends its crawl budget on hops instead of pages.
 */
export const dynamic = "force-static";

const SITE = "https://unit-3d.com";
const url = (path: string) => `${SITE}${path === "/" ? "/" : `${path}/`}`;

/** Shelves and the pages a person browses. */
const BROWSE = [
  "/trendy", "/catalog", "/fidgets", "/pets", "/statues",
  "/screen", "/smoke", "/home", "/office", "/home-office", "/b2b",
];

/** Make-it-yours pages: the designer, personalisation, file upload. */
const TOOLS = ["/configurator", "/personalize", "/upload"];

/** Everything else a customer reads before buying. */
const INFO = ["/shipping", "/faq", "/reviews", "/gallery", "/livestream", "/contact"];

/** The legal set. Low priority, but they must be findable and indexable. */
const LEGAL = ["/terms", "/privacy", "/cookies", "/returns", "/accessibility"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const at = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" | "yearly") => ({
    url: url(path),
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    at("/", 1, "daily"),
    ...BROWSE.map((p) => at(p, 0.8, "weekly")),
    ...TOOLS.map((p) => at(p, 0.7, "monthly")),
    ...INFO.map((p) => at(p, 0.5, "monthly")),
    ...LEGAL.map((p) => at(p, 0.3, "yearly")),
    // The catalogue itself — the long tail, and the reason anybody searching
    // for a specific model can land here at all.
    ...PRODUCTS.map((p) => at(`/products/${p.id}`, 0.6, "weekly")),
    ...FIDGETS.map((f) => at(`/fidgets/${f.id}`, 0.6, "weekly")),
  ];
}
