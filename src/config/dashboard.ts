/**
 * Dashboard sections (CLAUDE.md section 8). Notifications live behind the
 * bell in the header. Desktop: sidebar; phones: the ☰ menu (MobileMenu).
 */
export const DASHBOARD_SECTIONS = [
  { key: "home", href: "/dashboard" },
  { key: "edit", href: "/dashboard/edit" },
  { key: "accounts", href: "/dashboard/accounts" },
  { key: "work", href: "/dashboard/work" },
  { key: "rates", href: "/dashboard/rates" },
  { key: "links", href: "/dashboard/links" },
  { key: "contact", href: "/dashboard/contact" },
  { key: "verification", href: "/dashboard/verification" },
  { key: "appearance", href: "/dashboard/appearance" },
  { key: "analytics", href: "/dashboard/analytics" },
  { key: "subscription", href: "/dashboard/subscription" },
] as const;

export type SectionKey = (typeof DASHBOARD_SECTIONS)[number]["key"] | "notifications";
