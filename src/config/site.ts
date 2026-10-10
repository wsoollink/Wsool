/**
 * Wsool's mailboxes (aliases of the owner's Google Workspace inbox). Support is
 * the reply-to of every email; billing is on invoices and billing emails.
 */
export const SUPPORT_EMAIL = "support@wsool.link";
export const BILLING_EMAIL = "billing@wsool.link";

/**
 * Site-wide settings the owner fills in. The seller details appear on every
 * invoice; the VAT number is required on Saudi tax invoices once registered.
 */
export const SELLER = {
  name: "وصول",
  nameEn: "Wsool",
  /** TODO(owner): VAT registration number (15 digits) once registered. */
  vatNumber: "",
  /** TODO(owner): commercial registration number. */
  crNumber: "",
  address: "",
  email: BILLING_EMAIL,
};

/**
 * Blanks in the Terms and Privacy pages (src/content/legal.ts). An empty value
 * shows as a [bracketed] placeholder, so fill them all before launch.
 */
export const LEGAL = {
  /** TODO(owner): name in the commercial registration / freelance document. */
  entity: "",
  entityEn: "",
  /** TODO(owner): commercial registration / freelance document number. */
  registration: "",
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
