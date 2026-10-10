"use client";

import { notifySaved } from "@/lib/saved-event";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { savePhoto, savePhotoShape } from "./actions";

type Shape = "full" | "circle";
const fade = "[mask-image:linear-gradient(to_bottom,#000_50%,transparent_100%)]";

/** Hero photo: pick, shrink, upload straight to storage, then save; plus its shape (full or circle), saved on tap. */
export function PhotoCard({ photoUrl, shape: initialShape }: { photoUrl: string | null; shape: Shape }) {
  const t = useTranslations("EditPage");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(photoUrl);
  const [status, setStatus] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});
  const [shape, setShape] = useState<Shape>(initialShape);

  async function onShape(next: Shape) {
    if (next === shape) return;
    const before = shape;
    setShape(next);
    setStatus({ busy: true });
    const saved = await savePhotoShape(next);
    if (!saved.ok) { setShape(before); return setStatus({ error: t("uploadErrors.failed") }); }
    setStatus({ ok: true });
    notifySaved();
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setStatus({ busy: true });
    const uploaded = await uploadFile("photo", await shrinkImage(file));
    if ("error" in uploaded) return setStatus({ error: t(`uploadErrors.${uploaded.error}`) });
    const saved = await savePhoto(uploaded.path);
    if (!saved.ok) return setStatus({ error: t("uploadErrors.failed") });
    setUrl(saved.url ?? null);
    setStatus({ ok: true });
    notifySaved();
    if (input.current) input.current.value = "";
  }

  async function onRemove() {
    setStatus({ busy: true });
    const saved = await savePhoto(null);
    if (!saved.ok) return setStatus({ error: t("uploadErrors.failed") });
    setUrl(null);
    setStatus({ ok: true });
    notifySaved();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
      {/* The photo as it will look: square fading down (full) or round. */}
      <div className={`relative size-24 shrink-0 overflow-hidden bg-bg ${shape === "circle" ? "rounded-full" : "rounded-[20px]"}`}>
        {url ? (
          <Image src={url} alt={t("photo")} fill unoptimized sizes="96px" className={`object-cover ${shape === "full" ? fade : ""}`} />
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
      </div>
      <fieldset className="flex flex-col gap-2 border-t border-navy/8 pt-4">
        <legend className="mb-2 text-[13px] font-bold">{t("photoShape")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["full", "circle"] as const).map((s) => (
            <button
              key={s} type="button" aria-pressed={shape === s} disabled={status.busy} onClick={() => onShape(s)}
              className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[14px] border bg-white/72 p-2 ${shape === s ? "border-blue ring-2 ring-blue/25" : "border-navy/8"}`}
            >
              {/* Small drawing of each layout, with the creator's own photo when there is one. */}
              <span aria-hidden="true" className="relative flex h-12 w-16 justify-center overflow-hidden rounded-lg bg-navy/5">
                {s === "full"
                  ? (url ? <Image src={url} alt="" fill unoptimized sizes="64px" className={`object-cover ${fade}`} /> : <span className={`size-full bg-blue/60 ${fade}`} />)
                  : <span className="relative mt-1.5 size-9 overflow-hidden rounded-full bg-blue/60">{url && <Image src={url} alt="" fill unoptimized sizes="36px" className="object-cover" />}</span>}
              </span>
              <span className="text-xs font-bold">{t(`shape.${s}`)}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}
