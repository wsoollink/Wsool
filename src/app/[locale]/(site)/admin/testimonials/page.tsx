import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { MAX_TESTIMONIALS } from "@/lib/testimonials";
import { TestimonialsEditor } from "./TestimonialsEditor";

/** Owner only: testimonials shown under the FAQ on the home page (creators) and /agencies (agencies). */
async function Editors() {
  await requireAdmin("owner");
  const rows = await db.testimonial.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
  const pick = (audience: "creators" | "agencies") => rows.filter((r) => r.audience === audience).map((r) => ({
    id: r.id, name: r.name, nameEn: r.nameEn, role: r.role, roleEn: r.roleEn, quote: r.quote, quoteEn: r.quoteEn,
    photoUrl: r.photoUrl, visible: r.visible,
  }));
  return (
    <>
      <TestimonialsEditor audience="creators" initial={pick("creators")} max={MAX_TESTIMONIALS} />
      <TestimonialsEditor audience="agencies" initial={pick("agencies")} max={MAX_TESTIMONIALS} />
    </>
  );
}

export default async function TestimonialsPage({ params }: PageProps<"/[locale]/admin/testimonials">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("testimonials")} subtitle={(await getTranslations("Admin.sub"))("testimonials")} />
      <Suspense fallback={null}><Editors /></Suspense>
    </div>
  );
}
