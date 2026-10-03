import path from "node:path";
import type { NextConfig } from "next";

// Reference Studio is a local, single-user tool. It is deliberately NOT part of
// the public site build: the shop deploys with `output: "export"` to GitHub
// Pages, and route handlers cannot exist in a static export. Keeping the studio
// in its own Next project is what lets it have a real server.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Both this folder and the repository root have a lockfile, so Turbopack is
  // told explicitly where the file-system root is. It has to be the repository
  // root, because that is where the shared node_modules lives.
  turbopack: { root: path.resolve(process.cwd(), "..", "..") },
  // Reference images can be large; the upload route streams them to disk.
  experimental: { serverActions: { bodySizeLimit: "32mb" } },
  // Everything the studio renders comes from its own /api/files route, so the
  // optimizer never needs a remote host.
  images: { unoptimized: true },
};

export default nextConfig;
