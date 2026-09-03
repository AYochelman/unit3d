import type { NextConfig } from "next";

// STATIC_EXPORT=1 npm run build  ->  ./out (plain HTML/JS, host anywhere: Netlify Drop, GitHub Pages, any static server)
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
  images: {
    unoptimized: staticExport,
    // Only the hosts referenced by lib/data.ts / lib/fidgets.generated.ts.
    // Wildcard CDN patterns (amazonaws/cloudfront/akamaized) turned the image
    // optimizer into an open proxy - keep this list explicit.
    remotePatterns: [
      { protocol: "https", hostname: "makerworld.bblmw.com" },
      { protocol: "https", hostname: "makerworld.com" },
      { protocol: "https", hostname: "media.printables.com" },
      { protocol: "https", hostname: "www.printables.com" },
      { protocol: "https", hostname: "images.cults3d.com" },
      { protocol: "https", hostname: "fbi.cults3d.com" },
      { protocol: "https", hostname: "dl2.myminifactory.com" },
      { protocol: "https", hostname: "www.myminifactory.com" },
      { protocol: "https", hostname: "www.thingiverse.com" },
      { protocol: "https", hostname: "cdn.thingiverse.com" },
    ],
  },
};

export default nextConfig;
