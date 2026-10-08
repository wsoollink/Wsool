"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_NAMES } from "@/config/platforms";
import { Modal } from "./Modal";
import { PlatformIcon } from "./PlatformIcon";

type Props = { brand: string; type: string; videoUrl: string; thumbUrl: string | null; platform?: Platform | null };

const card = "rounded-[20px] border border-[var(--page-line)] bg-[var(--page-surface)]";

/** Past work tile; opens the portrait video pop-up when there is a video. */
export function WorkItem({ brand, type, videoUrl, thumbUrl, platform }: Props) {
  const t = useTranslations("CreatorPage");
  const [open, setOpen] = useState(false);
  const title = [brand, type].filter(Boolean).join(" · ");

  const tile = (
    <span className={`${card} relative block aspect-[9/16] overflow-hidden`}>
      {thumbUrl && <Image src={thumbUrl} alt="" fill unoptimized sizes="144px" className="object-cover" />}
      {platform && (
        <span className="absolute start-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/45 text-white" title={PLATFORM_NAMES[platform]}>
          <PlatformIcon platform={platform} size={14} />
        </span>
      )}
      {videoUrl && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-black/45 text-white">
            <Play aria-hidden="true" size={20} className="fill-white" />
          </span>
        </span>
      )}
    </span>
  );

  return (
    <li className="flex w-36 shrink-0 flex-col gap-2">
      {videoUrl ? (
        <button type="button" onClick={() => setOpen(true)} data-track={platform ? `work:${platform}` : "work"} aria-haspopup="dialog" aria-label={t("playVideo", { title })} className="block rounded-[20px]">
          {tile}
        </button>
      ) : (
        tile
      )}
      <p className="truncate text-sm font-medium">{brand}</p>
      <p className="truncate text-xs text-[var(--page-muted)]">{type}</p>
      {videoUrl && (
        <Modal open={open} onClose={() => setOpen(false)} title={title} closeLabel={t("close")} size="portrait">
          <video src={videoUrl} poster={thumbUrl ?? undefined} controls autoPlay playsInline className="aspect-[9/16] w-full rounded-[16px] bg-black" />
        </Modal>
      )}
    </li>
  );
}
