"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { saveLogo } from "./actions";

/** The creator's own logo, shown in the PDF media kit only (saved as PNG to keep transparency). */
export function LogoCard({ logoUrl }: { logoUrl: string | null }) {
  const t = useTranslations("EditPage");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(logoUrl);
  const [status, setStatus] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});

  async function onPick(file: File | undefined) {
    if (!file) return;
    setStatus({ busy: true });
    const uploaded = await uploadFile("logo", await shrinkImage(file, 800, 0.9, "image/png"));
    if ("error" in uploaded) return setStatus({ error: t(`uploadErrors.${uploaded.error}`) });
    const saved = await saveLogo(uploaded.path);
    if (!saved.ok) return setStatus({ error: t("uploadErrors.failed") });
    setUrl(saved.url ?? null);
    setStatus({ ok: true });
    if (input.current) input.current.value = "";
  }

  async function onRemove() {
    setStatus({ busy: true });
    const saved = await saveLogo(null);
    if (!saved.ok) return setStatus({ error: t("uploadErrors.failed") });
    setUrl(null);
    setStatus({ ok: true });
  }

  return (
    <Card className="flex items-center gap-4">
      {/* Checkerboard behind the logo so a transparent background is visible. */}
      <div className="relative size-24 shrink-0 overflow-hidden rounded-[20px] bg-[repeating-conic-gradient(#eef1f6_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] ring-1 ring-navy/8">
        {url ? (
          <Image src={url} alt={t("logo")} fill unoptimized sizes="96px" className="object-contain p-2" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted"><ImageIcon aria-hidden="true" /></span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-bold">{t("logo")}</p>
        <p className="text-xs text-muted">{t("logoHint")}</p>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={inputId} className={`${buttonClasses("secondary")} cursor-pointer ${status.busy ? "pointer-events-none opacity-50" : ""}`}>
            {status.busy ? t("uploading") : url ? t("changeLogo") : t("addLogo")}
          </label>
          <input
            ref={input} id={inputId} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
            disabled={status.busy} onChange={(e) => onPick(e.target.files?.[0])}
          />
          {url && (
            <button type="button" onClick={onRemove} disabled={status.busy} aria-label={t("removeLogo")} className={buttonClasses("secondary", "px-3")}>
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
