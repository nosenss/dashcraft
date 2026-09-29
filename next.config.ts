import type { NextConfig } from "next";

// PAGES=1 — статическое демо для GitHub Pages (собирает scripts/build-pages.mjs)
const pages = process.env.PAGES === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const config: NextConfig = pages
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      devIndicators: false,
      env: { NEXT_PUBLIC_BASE_PATH: basePath },
    }
  : { devIndicators: false };

export default config;
