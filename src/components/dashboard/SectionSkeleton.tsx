import { getTranslations } from "next-intl/server";

/**
 * Placeholder cards shown the moment a dashboard section opens, while its data
 * loads (Suspense fallback), so a tap never looks like nothing happened.
 */
export async function SectionSkeleton() {
  const t = await getTranslations("DashboardNav");
  const bar = "rounded-full bg-navy/[0.07]";
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
      <span className="sr-only">{t("loading")}</span>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-3 rounded-[14px] border border-line bg-card p-5 shadow-card">
          <div className={`${bar} h-4 w-1/3`} />
          <div className={`${bar} h-3 w-2/3`} />
          <div className="mt-1 h-11 rounded-[10px] bg-navy/[0.05]" />
          <div className="h-11 rounded-[10px] bg-navy/[0.05]" />
        </div>
      ))}
    </div>
  );
}
