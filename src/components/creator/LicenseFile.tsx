"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "./Modal";

/**
 * The license number as an underlined button (as in the design); it opens the
 * license file (PDF or image) on an A4-shaped white sheet.
 */
export function LicenseFile({ url, name, number }: { url: string; name: string; number: string }) {
  const t = useTranslations("CreatorPage");
  const [open, setOpen] = useState(false);
  const isPdf = /\.pdf($|\?)/i.test(url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("viewLicense", { name })}
        className="inline-flex min-h-11 items-center text-[var(--page-text)] underline underline-offset-[3px]"
      >
        <bdi dir="ltr">{number || t("viewFile")}</bdi>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={name} closeLabel={t("close")}>
        <div className="flex w-[min(440px,100%)] flex-col gap-3">
          <div className="mx-auto flex aspect-[1/1.414] max-h-[calc(100dvh-170px)] w-full items-center justify-center overflow-hidden rounded-[12px] bg-white">
            {isPdf ? (
              <iframe src={url} title={name} className="size-full bg-white" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded file, natural size
              <img src={url} alt={name} className="size-full object-contain" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-center text-white">
            <span className="font-bold">{name}</span>
            {number && <span dir="ltr" className="text-sm text-[#D5D8DE]">{number}</span>}
          </div>
        </div>
      </Modal>
    </>
  );
}
