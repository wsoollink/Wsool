import { audit, can, getAdmin } from "@/lib/admin";
import { csvResponse } from "@/lib/csv";
import { referrerRows } from "@/lib/referrals";

/** CSV of affiliate balances for bank transfers (staff with referrals.manage). Each export is audited. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin || !can(admin, "referrals.manage")) return new Response("Not found", { status: 404 });
  const rows = await referrerRows();
  await audit(admin, "referral.export", undefined, { count: rows.length });
  return csvResponse(
    "commissions",
    "username,email,method,iban,holder_name,signups,pending_sar,payable_sar,paid_out_sar,earned_sar",
    rows.map((r) => [
      r.username ?? "", r.email, r.method, r.iban ?? "", r.holderName ?? "", String(r.signups),
      r.pending.toFixed(2), r.available.toFixed(2), r.paidOut.toFixed(2), r.earned.toFixed(2),
    ]),
  );
}
