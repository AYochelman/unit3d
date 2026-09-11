import type { MetadataRoute } from "next";

/**
 * /robots.txt — generated at build time, so it ships with the static export.
 *
 * Everything public is open. The admin console and the per-order tracking page
 * are kept out: neither is content anybody could arrive at from a search, and
 * an indexed admin URL is an invitation.
 */
export const dynamic = "force-static";

/**
 * A build carrying a base path is the staging copy at /preview, not the live
 * site. It must be closed to crawlers: an indexed staging copy is a duplicate
 * of every page on the real domain, and Google resolves that by demoting one
 * of them.
 */
const isPreview = Boolean(process.env.NEXT_PUBLIC_BASE_PATH);

export default function robots(): MetadataRoute.Robots {
  if (isPreview) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/tracking/"] }],
    sitemap: "https://unit-3d.com/sitemap.xml",
    host: "https://unit-3d.com",
  };
}
