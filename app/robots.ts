import type { MetadataRoute } from "next";

/**
 * /robots.txt — generated at build time, so it ships with the static export.
 *
 * Everything public is open. The admin console and the per-order tracking page
 * are kept out: neither is content anybody could arrive at from a search, and
 * an indexed admin URL is an invitation.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/tracking/"] }],
    sitemap: "https://unit-3d.com/sitemap.xml",
    host: "https://unit-3d.com",
  };
}
