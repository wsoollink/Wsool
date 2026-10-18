import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Download of everything the signed-in creator stored (JSON), before deleting the account. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const data = await db.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      createdAt: true,
      subscription: { select: { plan: true, status: true, cycle: true, currency: true, trialEndsAt: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } },
      page: {
        include: {
          translations: true, tags: true, licenses: true, monthlyViews: true, brandLogos: true, rateSettings: true,
          socialAccounts: { include: { audience: true, rates: true } },
          portfolioItems: { include: { translations: true } },
          rateBundles: { include: { platforms: true, rates: true } },
          links: true, services: true, coupons: true,
          categories: { select: { category: { select: { nameAr: true, nameEn: true } } } },
        },
      },
    },
  });
  const invoices = await db.invoice.findMany({
    where: { userId: user.id, number: { not: null } },
    select: { number: true, status: true, cycle: true, currency: true, amount: true, vatAmount: true, paidAt: true, periodStart: true, periodEnd: true },
  });
  // Affiliate program: payout settings, commissions and payouts (customers are not identified).
  const referrals = {
    account: await db.referralAccount.findUnique({ where: { userId: user.id }, select: { payoutMethod: true, iban: true, holderName: true } }),
    commissions: await db.referralCommission.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "asc" }, select: { amount: true, percent: true, availableAt: true, cancelledAt: true, createdAt: true } }),
    payouts: await db.referralPayout.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "asc" }, select: { method: true, amount: true, note: true, createdAt: true } }),
  };
  const body = JSON.stringify({ exportedAt: new Date(), ...data, invoices, referrals }, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="wsool-${data?.page?.username ?? "account"}.json"`,
      "cache-control": "no-store",
    },
  });
}
