import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

type Props = {
  title: ReactNode;
  /** Section key: its subtitle comes from messages DashboardHeader. */
  section?: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  /** Buttons at the end of the title row (wrap under the title on phones). */
  actions?: ReactNode;
};

/** Page title row (the menu, bell and language live in the layout's top bar). */
export async function PageHeader({ title, section, subtitle, leading, actions }: Props) {
  const sub = await getTranslations("DashboardHeader");
  if (!subtitle && section && sub.has(section)) subtitle = sub(section);
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[21px] leading-tight font-bold tracking-[-0.01em] md:text-2xl">{title}</h1>
          {subtitle && <p className="text-[13.5px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
