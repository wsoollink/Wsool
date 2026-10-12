"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { fromIntlLocale } from "@/i18n/config";
import { SidebarNav } from "./DashboardNav";

/**
 * Phones only: the ☰ button in each page header opens every dashboard
 * section in a drawer from the start side (right in Arabic, left in English).
 * Native <dialog>: focus stays inside, Esc closes. Tapping a section, the
 * dimmed backdrop or ✕ closes it too.
 */
export function MobileMenu({ footer }: { footer: ReactNode }) {
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
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-navy/8 bg-white/72 shadow-card backdrop-blur-[14px] md:hidden"
      >
        <Menu aria-hidden="true" size={20} />
      </button>
      <dialog
        ref={ref} aria-label={t("menu")} tabIndex={-1}
        onClose={() => setOpen(false)}
        onClick={(ev) => { if (ev.target === ev.currentTarget) setOpen(false); }}
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-[min(320px,86vw)] max-w-none bg-white p-0 text-navy shadow-xl outline-none backdrop:bg-navy/40 md:hidden"
      >
        <div className="flex h-full flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center px-3" aria-label={t("brand")}>
              <Image src={lang === "en" ? "/brand/logo-en.png" : "/brand/logo-ar.png"} alt={t("brand")} width={96} height={32} className="h-8 w-auto" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("closeMenu")} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-navy/5">
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <nav aria-label={t("menu")} className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav compact onNavigate={() => setOpen(false)} />
          </nav>
          <div className="flex flex-col border-t border-navy/8 pt-2">{footer}</div>
        </div>
      </dialog>
    </>
  );
}
