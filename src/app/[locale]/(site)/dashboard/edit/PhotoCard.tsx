"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { savePhoto } from "./actions";

/** Hero photo: pick, shrink, upload straight to storage, then save on the page. */
export function PhotoCard({ photoUrl }: { photoUrl: string | null }) {
  const t = useTranslations("EditPage");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(photoUrl);
  const [status, setStatus] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});

  async function onPick(file: File | undefined) {
    if (!file) return;
    setStatus({ busy: true });
    const uploaded = await uploadFile("photo", await shrinkImage(file));
    if ("error" in uploaded) return setStatus({ error: t(`uploadErrors.${uploaded.error}`) });
    const saved = await savePhoto(uploaded.path);
    if (!saved.ok) return setStatus({ error: t("uploadErrors.failed") });
    setUrl(saved.url ?? null);
    setStatus({ ok: true });
    if (input.current) input.current.value = "";
  }

  async function onRemove() {
    setStatus({ busy: true });
    const saved = await savePhoto(null);
    if (!saved.ok) return setStatus({ error: t("uploadErrors.failed") });
    setUrl(null);
    setStatus({ ok: true });
  }

  return (
    <Card className="flex items-center gap-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-[20px] bg-bg">
        {url ? (
          <Image src={url} alt={t("photo")} fill unoptimized sizes="96px" className="object-cover" />
        ) : (
          <span className="brand-gradient flex size-full items-center justify-center text-white"><Camera aria-hidden="true" /></span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-bold">{t("photo")}</p>
        <p className="text-xs text-muted">{t("photoHint")}</p>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={inputId} className={`${buttonClasses("secondary")} cursor-pointer ${status.busy ? "pointer-events-none opacity-50" : ""}`}>
            {status.busy ? t("uploading") : url ? t("changePhoto") : t("addPhoto")}
          </label>
          <input
            ref={input} id={inputId} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only"
            disabled={status.busy} onChange={(e) => onPick(e.target.files?.[0])}
          />
          {url && (
            <button type="button" onClick={onRemove} disabled={status.busy} aria-label={t("removePhoto")} className={buttonClasses("secondary", "px-3")}>
              <Trash2 aria-hidden="true" size={18} />
            </button>
          )}
        </div>
        <p role="status" aria-live="polite" className={`text-sm ${status.error ? "text-bad" : "text-good"}`}>
          {status.error ?? (status.ok ? t("saved") : "")}
        </p>
      </div>
    </Card>
  );
}
