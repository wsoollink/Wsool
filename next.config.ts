import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Fonts read at runtime by the link-preview image route.
  outputFileTracingIncludes: {
    "/[locale]/[username]/og": ["./assets/fonts/**/*"],
    "/[locale]/[username]/pdf": ["./assets/fonts/**/*"],
  },
  partialPrefetching: true,
  // Security headers on every response. frame-ancestors 'self' stops other sites framing the
  // dashboard/admin (clickjacking) while the Edit page can still frame /<username>/preview.
  // A full script CSP would need nonces for THEME_SCRIPT; not yet.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
