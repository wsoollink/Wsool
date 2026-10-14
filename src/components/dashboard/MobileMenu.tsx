"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { fromIntlLocale } from "@/i18n/config";
import { iconButton } from "@/components/ui/styles";
import { SidebarNav } from "./DashboardNav";

/**
 * Phones only: the ☰ button in each page header opens every dashboard
 * section in a drawer from the start side (right in Arabic, left in English).
 * Native <dialog>: focus stays inside, Esc closes. Tapping a section, the
 * dimmed backdrop or ✕ closes it too.
 */
export function MobileMenu({ card, footer, nav, home = "/dashboard" }: {
  card?: ReactNode;
  footer: ReactNode;
  /** Section list (default: the dashboard's). The drawer closes by itself when the page changes. */
  nav?: ReactNode;
  home?: string;
}) {
  const t = useTranslations("DashboardNav");
  const lang = fromIntlLocale(useLocale());
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  // Open on this page only: a new page (section link, browser back) closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (on: boolean) => setOpenOn(on ? pathname : null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The drawer itself takes focus, not its first link (the logo would show a focus ring).
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} aria-label={t("openMenu")} aria-haspopup="dialog" aria-expanded={open}
        className={`${iconButton} -ms-2 md:hidden`}
      >
        <Menu aria-hidden="true" size={20} />
      </button>
      <dialog
        ref={ref} aria-label={t("menu")} tabIndex={-1}
        onClose={() => setOpen(false)}
        onClick={(ev) => { if (ev.target === ev.currentTarget) setOpen(false); }}
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-[min(320px,86vw)] max-w-none border-e border-line bg-bg p-0 text-navy shadow-pop outline-none backdrop:bg-[rgba(2,25,65,0.4)] md:hidden"
      >
        <div className="flex h-full flex-col gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <Link href={home} className="inline-flex min-h-11 items-center px-2.5" aria-label={t("brand")}>
              <BrandLogo lang={lang === "en" ? "en" : "ar"} alt={t("brand")} className="h-7 w-auto" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("closeMenu")} className={iconButton}>
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          {/* One scrolling column (sections + footer), compact 40px rows, so nothing hides behind a fixed footer on short screens. */}
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 [&_a]:min-h-10 [&_button]:min-h-10 [&_p]:pt-2.5">
            {card}
            <nav aria-label={t("menu")}>
              {nav ?? <SidebarNav onNavigate={() => setOpen(false)} />}
            </nav>
            <div className="flex flex-col gap-0.5 border-t border-line pt-2">{footer}</div>
          </div>
        </div>
      </dialog>
    </>
  );
}
