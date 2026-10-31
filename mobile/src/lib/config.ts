/**
 * App settings from EXPO_PUBLIC_* variables (public by design: they ship
 * inside the app). Never put secrets here.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://wsool.link").replace(/\/$/, "");
export const SITE_URL = "https://wsool.link";
/** Wsool's WhatsApp Business chat (same number as the website's SUPPORT_WHATSAPP). */
export const SUPPORT_WHATSAPP = "966550960540";

/** Native sign-in buttons appear only once their accounts are set up (docs/mobile-app-plan.md). */
export const APPLE_SIGN_IN = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === "1";
