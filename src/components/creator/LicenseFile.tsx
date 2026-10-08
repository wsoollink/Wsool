"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Modal } from "./Modal";

/** Opens a license file (PDF or image) in a pop-up. */
export function LicenseFile({ url, name }: { url: string; name: string }) {
  const t = useTranslations("CreatorPage");
  const [open, setOpen] = useState(false);
  const isPdf = /\.pdf($|\?)/i.test(url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 shrink-0 items-center gap-1 font-medium text-[var(--page-accent)]"
      >
        <FileText aria-hidden="true" size={16} /> {t("viewFile")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={name} closeLabel={t("close")}>
        {isPdf ? (
          <iframe src={url} title={name} className="h-[70dvh] w-full rounded-[12px] bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded file, natural size
          <img src={url} alt={name} className="max-h-[70dvh] w-full rounded-[12px] object-contain" />
        )}
      </Modal>
    </>
  );
}
