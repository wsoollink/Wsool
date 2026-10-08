/**
 * Writes every notification email as HTML files for a visual check:
 *   npx tsx --require ./scripts/no-server-only.cjs scripts/preview-emails.ts <out-dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { previewEmail, NOTIFICATIONS, type NotificationType } from "../src/lib/notify";

const out = process.argv[2] ?? "email-previews";
mkdirSync(out, { recursive: true });
const sample = {
  days: 4, endDate: "2026-10-22T00:00:00Z", invoice: "WS-001042", amount: 49, currency: "SAR",
  periodEndDate: "2026-11-22T00:00:00Z", renewDate: "2026-11-01T00:00:00Z", retryDate: "2026-10-10T00:00:00Z",
  platform: "TikTok", handle: "sara.design", untilDate: "2027-01-06T00:00:00Z", reason: "followers_mismatch",
  purgeDate: "2026-11-07T00:00:00Z",
};
for (const lang of ["ar", "en"] as const) {
  for (const type of Object.keys(NOTIFICATIONS) as NotificationType[]) {
    const email = previewEmail(type, sample, lang);
    writeFileSync(join(out, `${lang}-${type}.html`), `<!-- ${email.subject} -->\n${email.html}`);
  }
}
console.log("written to", out);
