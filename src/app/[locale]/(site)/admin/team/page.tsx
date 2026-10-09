import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PERMISSIONS, type Permission } from "@/config/admin";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { TeamEditor, type Member } from "./TeamEditor";
import { AdminHeader } from "@/components/admin/AdminHeader";

async function Team() {
  await requireAdmin("owner");
  const members = await db.adminMember.findMany({ where: { role: { not: "owner" } }, orderBy: { createdAt: "asc" } });
  const owners = (process.env.OWNER_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return (
    <TeamEditor
      owners={owners}
      members={members.map((m) => ({
        id: m.id,
        email: m.email,
        role: m.role as Member["role"],
        permissions: (Array.isArray(m.permissions) ? m.permissions : []).filter((p): p is Permission => PERMISSIONS.includes(p as Permission)),
        active: m.active,
        linked: !!m.userId,
      }))}
    />
  );
}

export default async function TeamPage({ params }: PageProps<"/[locale]/admin/team">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("team")} subtitle={(await getTranslations("Admin.sub"))("team")} />
      <Suspense fallback={null}><Team /></Suspense>
    </div>
  );
}
