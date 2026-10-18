import { z } from "zod";
import { apiError, json, preflight, readBody, withPage } from "@/lib/mobile/api";
import * as accounts from "@/app/[locale]/(site)/dashboard/accounts/actions";
import * as appearance from "@/app/[locale]/(site)/dashboard/appearance/actions";
import * as contact from "@/app/[locale]/(site)/dashboard/contact/actions";
import * as coupons from "@/app/[locale]/(site)/dashboard/coupons/actions";
import * as edit from "@/app/[locale]/(site)/dashboard/edit/actions";
import * as links from "@/app/[locale]/(site)/dashboard/links/actions";
import * as rates from "@/app/[locale]/(site)/dashboard/rates/actions";
import * as referrals from "@/app/[locale]/(site)/dashboard/referrals/actions";
import * as subscription from "@/app/[locale]/(site)/dashboard/subscription/actions";
import * as verification from "@/app/[locale]/(site)/dashboard/verification/actions";
import * as work from "@/app/[locale]/(site)/dashboard/work/actions";
import { requestUpload } from "@/app/[locale]/(site)/dashboard/upload-actions";

/**
 * The app calls the website's own dashboard server actions here, so every rule
 * (zod validation, ownership via requireCreator() reading the Bearer token,
 * plan limits, file checks, cache refresh) lives in one place. Only the
 * actions listed below can be called; arguments are passed through as JSON.
 */
const ACTIONS: Record<string, (...args: never[]) => Promise<unknown>> = {
  // Edit page (saveProfile takes the form fields as an object here).
  saveProfile: (fields: Record<string, string | boolean>) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields ?? {})) {
      if (k === "enEnabled") { if (v === true) form.set(k, "on"); }
      else form.set(k, String(v ?? ""));
    }
    return edit.saveProfile({}, form);
  },
  setPublished: edit.setPublished,
  savePhoto: edit.savePhoto,
  savePhotoShape: edit.savePhotoShape,
  saveLogo: edit.saveLogo,
  saveTags: edit.saveTags,
  saveCategories: edit.saveCategories,
  saveLicenses: edit.saveLicenses,
  changeUsername: edit.changeUsername,
  // Accounts & numbers
  saveAccounts: accounts.saveAccounts,
  saveMonthlyViews: accounts.saveMonthlyViews,
  saveAudience: accounts.saveAudience,
  readAudienceShot: accounts.readAudienceShot,
  // Brands & work
  saveBrands: work.saveBrands,
  saveWorks: work.saveWorks,
  checkWorkLink: work.checkWorkLink,
  // Ad rates
  saveRateSettings: rates.saveRateSettings,
  saveRates: rates.saveRates,
  saveBundles: rates.saveBundles,
  // Links & services, contact, appearance
  saveLinksAndServices: links.saveLinksAndServices,
  saveCoupons: coupons.saveCoupons,
  saveContact: contact.saveContact,
  saveAppearance: appearance.saveAppearance,
  // Verification (screenshot read by the AI first, like the website)
  checkScreenshot: verification.checkScreenshot,
  applyReadFollowers: verification.applyReadFollowers,
  submitVerification: verification.submitVerification,
  cancelVerification: verification.cancelVerification,
  submitLicense: verification.submitLicense,
  cancelLicense: verification.cancelLicense,
  // Commission payout settings
  savePayoutSettings: referrals.savePayoutSettings,
  // Account deletion (Apple requires it inside the app). Nothing that buys or renews a plan is listed:
  // store rules allow selling subscriptions only through their own payments.
  requestDeletion: subscription.requestDeletion,
  undoDeletion: subscription.undoDeletion,
  // Uploads: a one-time signed URL in the creator's own folder.
  requestUpload,
};

const body = z.object({ args: z.array(z.unknown()).max(5).default([]) });

export const POST = withPage(async ({ req }) => {
  const name = new URL(req.url).pathname.split("/").pop() ?? "";
  const fn = Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : null;
  if (!fn) return apiError("unknown_action", 404);
  const data = await readBody(req, body);
  if (!data) return apiError("invalid");
  try {
    return json({ result: (await fn(...(data.args as never[]))) ?? null });
  } catch (err) {
    // A redirect() inside an action (e.g. no session) is a refusal, not a crash.
    if (String((err as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) return apiError("unauthorized", 401);
    throw err;
  }
});
export const OPTIONS = preflight;
