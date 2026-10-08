/**
 * Runs the billing job every hour: renewals, retries, ended trials and
 * cancelled plans (src/lib/billing.ts runBillingJob). Needs CRON_SECRET and
 * URL (set by Netlify) in the environment.
 */
export default async () => {
  const secret = process.env.CRON_SECRET;
  const base = process.env.URL;
  if (!secret || !base) {
    console.error("billing-cron: CRON_SECRET or URL missing");
    return;
  }
  const res = await fetch(`${base}/api/cron/billing`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  console.log("billing-cron:", res.status, await res.text());
};

export const config = { schedule: "@hourly" };
