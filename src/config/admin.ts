/**
 * Admin panel sections and staff permissions (CLAUDE.md section 9). The owner
 * has every permission and is the only one who can manage the team.
 */
export const PERMISSIONS = [
  "verifications.view",
  "verifications.decide",
  "users.view",
  "users.edit",
  "trial.extend",
  "users.suspend",
  "revenue.view",
  "refunds",
  "newsletter.send",
  "discounts.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Presets offered when inviting a member; "custom" starts empty. */
export const ROLE_PRESETS: Record<"verifier" | "support" | "finance" | "custom", Permission[]> = {
  verifier: ["verifications.view", "verifications.decide", "users.view"],
  support: ["users.view", "users.edit", "trial.extend", "verifications.view"],
  finance: ["revenue.view", "refunds", "users.view"],
  custom: [],
};

/** How permissions are grouped in the Team page (every permission in exactly one group). */
export const PERMISSION_GROUPS: Record<"verification" | "users" | "money" | "newsletter", Permission[]> = {
  verification: ["verifications.view", "verifications.decide"],
  users: ["users.view", "users.edit", "users.suspend", "trial.extend"],
  money: ["revenue.view", "refunds", "discounts.manage"],
  newsletter: ["newsletter.send"],
};

export const ADMIN_SECTIONS = [
  { key: "overview", href: "/admin", permission: null },
  { key: "verifications", href: "/admin/verifications", permission: "verifications.view" },
  { key: "users", href: "/admin/users", permission: "users.view" },
  { key: "subscriptions", href: "/admin/subscriptions", permission: "revenue.view" },
  { key: "finance", href: "/admin/finance", permission: "revenue.view" },
  { key: "discounts", href: "/admin/discounts", permission: "discounts.manage" },
  { key: "newsletter", href: "/admin/newsletter", permission: "newsletter.send" },
  { key: "team", href: "/admin/team", permission: "owner" },
  { key: "audit", href: "/admin/audit", permission: "owner" },
] as const;
export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

/** Trial extension choices (days). */
export const TRIAL_EXTENSIONS = [7, 14, 30] as const;
