import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Building2, LayoutDashboard, ShieldCheck } from "lucide-react";
import { getAdmin } from "@/lib/admin";
import { getMembership } from "@/lib/agency";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Board = "creator" | "agency" | "admin";

/**
 * Links to the signed-in person's other dashboards (owner, Nov 2026): their own creator dashboard, their agency's
 * dashboard and the admin panel, whichever they have. Renders nothing when there is no other one.
 */
export async function DashboardSwitch({ current }: { current: Board }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [page, member, admin] = await Promise.all([
    current === "creator" ? null : db.page.findUnique({ where: { userId: user.id }, select: { id: true } }),
    current === "agency" ? null : getMembership(user),
    current === "admin" ? null : getAdmin(),
  ]);
  const t = await getTranslations("DashboardSwitch");
  const items = [
    page && { href: "/dashboard", label: t("creator"), Icon: LayoutDashboard },
    member && { href: "/agency", label: t("agency"), Icon: Building2 },
    admin && { href: "/admin", label: t("admin"), Icon: ShieldCheck },
  ].filter((x): x is { href: string; label: string; Icon: typeof Building2 } => !!x);
  if (!items.length) return null;
  return (
    <nav aria-label={t("label")} className="flex items-center gap-1">
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-label={label} title={label}
          className="inline-flex size-11 items-center justify-center gap-1.5 rounded-full border border-line bg-card text-[13px] font-bold shadow-card hover:bg-hover sm:w-auto sm:px-3.5 pointer-fine:h-9">
          <Icon aria-hidden="true" size={16} className="shrink-0 text-blue" />
          <span className="hidden whitespace-nowrap sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
