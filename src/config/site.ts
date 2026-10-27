/**
 * Wsool's mailboxes (aliases of the owner's Google Workspace inbox). Support is
 * the reply-to of every email; billing is on invoices and billing emails.
 */
export const SUPPORT_EMAIL = "support@wsool.link";
export const BILLING_EMAIL = "billing@wsool.link";
/** Owner's account that holds the demo page (wsool.link/demo), so it can be edited from the dashboard. */
export const DEMO_EMAIL = "ibrahim@wsool.link";

/**
 * Site-wide settings the owner fills in. The seller details appear on every
 * invoice; the VAT number is required on Saudi tax invoices once registered.
 */
export const SELLER = {
  /** Legal name in the commercial registration (one-person LLC, issued 2026-10-27). */
  name: "شركة صفحة وصول لتقنية المعلومات",
  nameEn: "Safhat Wsool Company For Information Technology",
  /**
   * TODO(owner): VAT registration number (15 digits, starts and ends with 3) once registered with ZATCA.
   * Not the ZATCA "distinguished number" (10 digits), which never goes on invoices.
   */
  vatNumber: "",
  /** Unified national number of the commercial registration. */
  crNumber: "7055476373",
  /** National address (may move when the company gets an office): update both languages. */
  address: "طريق الأمير متعب بن عبدالعزيز، حي الشعلة، الدمام، المملكة العربية السعودية",
  addressEn: "Prince Mutaib bin Abdulaziz Rd, Al Shulah, Dammam, Saudi Arabia",
  email: BILLING_EMAIL,
};

/**
 * Blanks in the Terms and Privacy pages (src/content/legal.ts). An empty value
 * shows as a [bracketed] placeholder, so fill them all before launch.
 */
export const LEGAL = {
  /** Name and unified national number in the commercial registration. */
  entity: "شركة صفحة وصول لتقنية المعلومات",
  entityEn: "Safhat Wsool Company For Information Technology",
  registration: "7055476373",
  email: SUPPORT_EMAIL,
  /** TODO(owner): Moyasar or Tap, once chosen. */
  paymentGateway: "",
  emailProvider: "Resend",
  serverLocation: "فرانكفورت، ألمانيا (الاتحاد الأوروبي)",
  serverLocationEn: "Frankfurt, Germany (EU)",
  /** TODO(owner): launch date, YYYY-MM-DD. */
  effectiveDate: "",
};

/**
 * Wsool's own accounts, shown as "Follow us" icons in the marketing site
 * footer (CLAUDE.md section 11, phase 6). Leave a link empty to hide its icon.
 * Order here = order in the footer.
 */
/**
 * Store pages of the Wsool app (docs/mobile-app-plan.md). Empty = not published
 * yet: the home page shows that store's badge without a link.
 */
export const APP_LINKS = {
  ios: "",
  android: "",
} as const;

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/wsoollink",
  tiktok: "https://www.tiktok.com/@wsoollink",
  x: "https://x.com/wsoollink",
  snapchat: "https://snapchat.com/t/SQd8jrgq",
  youtube: "",
  facebook: "https://www.facebook.com/wsoollink",
  threads: "https://www.threads.com/@wsoollink",
  telegram: "https://t.me/wsoollink",
} as const;
