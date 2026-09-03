import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.thingiverse.com" },
      { protocol: "https", hostname: "**.thingiverse.com" },
      { protocol: "https", hostname: "media.printables.com" },
      { protocol: "https", hostname: "media-printables-com.b-cdn.net" },
      { protocol: "https", hostname: "**.printables.com" },
      { protocol: "https", hostname: "cdn.myminifactory.com" },
      { protocol: "https", hostname: "**.myminifactory.com" },
      { protocol: "https", hostname: "**.cults3d.com" },
      { protocol: "https", hostname: "makerworld.com" },
      { protocol: "https", hostname: "**.makerworld.com" },
      { protocol: "https", hostname: "makerworld-public.akamaized.net" },
      { protocol: "https", hostname: "makerworld.bblmw.com" },
      { protocol: "https", hostname: "**.bblmw.com" },
      { protocol: "https", hostname: "**.bambulab.com" },
      { protocol: "https", hostname: "**.akamaized.net" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
};

export default nextConfig;
