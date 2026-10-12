"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_NAMES } from "@/config/platforms";
import { parseWorkLink } from "@/lib/work-link";
import { Modal } from "./Modal";

type Props = { brand: string; type: string; videoUrl: string | null; linkUrl?: string | null; thumbUrl: string | null; platform?: Platform | null };

function Play({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,5 19,12 8,19" fill="#FFFFFF" /></svg>
  );
}

/**
 * Past work tile (portrait, as in the design); opens the video pop-up when
 * there is a video, or the post's own player (TikTok / Instagram / YouTube)
 * with a link to open it in the app.
 */
export function WorkItem({ brand, type, videoUrl, linkUrl, thumbUrl, platform }: Props) {
  const t = useTranslations("CreatorPage");
  const [open, setOpen] = useState(false);
  const link = linkUrl ? parseWorkLink(linkUrl) : null;
  const playable = !!videoUrl || !!link;
  const caption = [type, platform ? PLATFORM_NAMES[platform] : ""].filter(Boolean).join(" · ");
  const title = [brand, caption].filter(Boolean).join(" · ");

  const tile = (
    <span className="relative flex h-[284px] items-center justify-center overflow-hidden rounded-[14px] bg-[#1B1F27] md:h-[338px]">
      {thumbUrl && <Image src={thumbUrl} alt="" fill unoptimized sizes="190px" className="object-cover" />}
      {playable && (
        <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Play size={18} />
        </span>
      )}
    </span>
  );

  return (
    <li className="flex w-40 shrink-0 flex-col gap-2 md:w-[190px]">
      {playable ? (
        <button type="button" onClick={() => setOpen(true)} data-track={platform ? `work:${platform}` : "work"} aria-haspopup="dialog" aria-label={t("playVideo", { title })} className="block rounded-[14px] text-start">
          {tile}
        </button>
      ) : (
        tile
      )}
      {brand && <p className="truncate text-sm font-semibold">{brand}</p>}
      {caption && <p className="truncate text-xs text-[var(--page-muted)]">{caption}</p>}
      {playable && (
        <Modal open={open} onClose={() => setOpen(false)} title={title} closeLabel={t("close")}>
          <div className={`flex flex-col gap-3 ${link && !link.portrait ? "w-[min(720px,100%)]" : "w-[min(360px,100%)]"}`}>
            {videoUrl ? (
              <video src={videoUrl} poster={thumbUrl ?? undefined} controls autoPlay playsInline className="mx-auto aspect-[9/16] max-h-[calc(100dvh-170px)] w-full rounded-[18px] bg-[#1B1F27] object-contain" />
            ) : link && open ? (
              // The player loads only while the pop-up is open (no third-party requests before a tap).
              <iframe
                src={link.embed} title={title || PLATFORM_NAMES[link.platform]}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className={`mx-auto w-full rounded-[18px] bg-[#1B1F27] ${link.portrait ? "aspect-[9/16] max-h-[calc(100dvh-210px)]" : "aspect-video"}`}
              />
            ) : null}
            {link && (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="mx-auto inline-flex min-h-11 items-center rounded-full bg-white/15 px-5 text-sm font-semibold text-white hover:bg-white/25">
                {t("openOn", { platform: PLATFORM_NAMES[link.platform] })}
              </a>
            )}
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
