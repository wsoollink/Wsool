import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-url";

/** wsool.link/robots.txt: everything public may be crawled; dashboards, admin, APIs and payment pages may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/agency/", "/api/", "/billing", "/invest", "/onboarding", "/login", "/newsletter"] },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
