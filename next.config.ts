import type { NextConfig } from "next";

// GitHub Pages serves this as a project page at /beermap/, so the built
// assets need that prefix. Capacitor's build must stay prefix-free since it
// serves from the app's own root, so this only applies when explicitly set.
const basePath = process.env.GITHUB_PAGES === "true" ? "/beermap" : "";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
