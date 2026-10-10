"use client";

import { notifySaved } from "@/lib/saved-event";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { setPublished } from "./actions";

/** Shows whether the public page is live and lets the creator publish or hide it. */
export function PublishCard({ username, published }: { username: string; published: boolean }) {
  const t = useTranslations("EditPage");
  const [isPublished, setIsPublished] = useState(published);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const result = await setPublished(!isPublished);
      if (result.ok) {
        notifySaved();
        setIsPublished(!isPublished);
        setError(null);
      } else setError(t(`errors.${result.error ?? "failed"}`));
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">{t("pageStatus")}</p>
          <p className={`text-sm ${isPublished ? "text-good" : "text-muted"}`}>{isPublished ? t("published") : t("hidden")}</p>
        </div>
        <span aria-hidden="true" className={`size-3 rounded-full ${isPublished ? "bg-good" : "bg-muted/40"}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={toggle} disabled={pending} aria-busy={pending} className={buttonClasses(isPublished ? "secondary" : "accent")}>
          {pending ? t("saving") : isPublished ? t("hide") : t("publish")}
        </button>
        <a href={`/${username}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
          {t("viewPage")} <ExternalLink aria-hidden="true" size={16} />
        </a>
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </Card>
  );
}
