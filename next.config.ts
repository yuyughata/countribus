import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (static-first dynamicIO) is disabled: the authenticated
  // dashboard is per-user dynamic (reads auth cookies), so it opts out anyway.
  // Static routes (e.g. the marketing landing page) are still prerendered.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
