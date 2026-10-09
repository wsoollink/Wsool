"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_NAMES } from "@/config/platforms";
import { Modal } from "./Modal";

type Props = { brand: string; type: string; videoUrl: string; thumbUrl: string | null; platform?: Platform | null };

function Play({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,5 19,12 8,19" fill="#FFFFFF" /></svg>
  );
}

/** Past work tile (portrait, as in the design); opens the video pop-up when there is a video. */
export function WorkItem({ brand, type, videoUrl, thumbUrl, platform }: Props) {
  const t = useTranslations("CreatorPage");
  const [open, setOpen] = useState(false);
  const caption = [type, platform ? PLATFORM_NAMES[platform] : ""].filter(Boolean).join(" · ");
  const title = [brand, caption].filter(Boolean).join(" · ");

  const tile = (
    <span className="relative flex h-[284px] items-center justify-center overflow-hidden rounded-[14px] bg-[#1B1F27] md:h-[338px]">
      {thumbUrl && <Image src={thumbUrl} alt="" fill unoptimized sizes="190px" className="object-cover" />}
      {videoUrl && (
        <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Play size={18} />
        </span>
      )}
    </span>
  );

  return (
    <li className="flex w-40 shrink-0 flex-col gap-2 md:w-[190px]">
      {videoUrl ? (
        <button type="button" onClick={() => setOpen(true)} data-track={platform ? `work:${platform}` : "work"} aria-haspopup="dialog" aria-label={t("playVideo", { title })} className="block rounded-[14px] text-start">
          {tile}
        </button>
      ) : (
        tile
      )}
      {brand && <p className="truncate text-sm font-semibold">{brand}</p>}
      {caption && <p className="truncate text-xs text-[var(--page-muted)]">{caption}</p>}
      {videoUrl && (
        <Modal open={open} onClose={() => setOpen(false)} title={title} closeLabel={t("close")}>
          <div className="flex w-[min(360px,100%)] flex-col gap-3">
            <video src={videoUrl} poster={thumbUrl ?? undefined} controls autoPlay playsInline className="mx-auto aspect-[9/16] max-h-[calc(100dvh-170px)] w-full rounded-[18px] bg-[#1B1F27] object-contain" />
            <div className="flex flex-col gap-0.5 text-center text-white">
              {brand && <span className="font-bold">{brand}</span>}
              {caption && <span className="text-[13px] text-[#D5D8DE]">{caption}</span>}
            </div>
          </div>
        </Modal>
      )}
    </li>
  );
}
