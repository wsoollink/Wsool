/**
 * Dashboard sections (CLAUDE.md section 8). Notifications live behind the
 * bell in the header; "more" is the mobile page listing the rest.
 */
export const DASHBOARD_SECTIONS = [
  { key: "home", href: "/dashboard" },
  { key: "edit", href: "/dashboard/edit" },
  { key: "accounts", href: "/dashboard/accounts" },
  { key: "work", href: "/dashboard/work" },
  { key: "rates", href: "/dashboard/rates" },
  { key: "contact", href: "/dashboard/contact" },
  { key: "verification", href: "/dashboard/verification" },
  { key: "appearance", href: "/dashboard/appearance" },
  { key: "analytics", href: "/dashboard/analytics" },
  { key: "subscription", href: "/dashboard/subscription" },
] as const;

export type SectionKey = (typeof DASHBOARD_SECTIONS)[number]["key"] | "notifications" | "more";

/** Mobile bottom tab bar: Home, My page, Accounts, Analytics, More. */
export const TAB_BAR: { key: SectionKey; href: string; label?: "myPage" | "accountsShort" }[] = [
  { key: "home", href: "/dashboard" },
  { key: "edit", href: "/dashboard/edit", label: "myPage" },
  { key: "accounts", href: "/dashboard/accounts", label: "accountsShort" },
  { key: "analytics", href: "/dashboard/analytics" },
  { key: "more", href: "/dashboard/more" },
];

/** Sections not in the tab bar, listed on /dashboard/more. */
export const MORE_SECTIONS = DASHBOARD_SECTIONS.filter((s) => !TAB_BAR.some((tab) => tab.key === s.key));

/** Placeholder sections that are built in later phases. */
export const PLACEHOLDER_SECTIONS: readonly SectionKey[] = [
  "verification",
  "analytics", "subscription", "notifications",
];
