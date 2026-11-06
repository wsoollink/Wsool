"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { createArticle, importStarters } from "./actions";

/** "New article" (Arabic / English) and "Add starter articles": create drafts, then open the editor. */
export function AcademyButtons({ labels }: { labels: { newAr: string; newEn: string; starters: string; added: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const create = (lang: "ar" | "en") => start(async () => router.push(`/admin/academy/edit?id=${(await createArticle(lang)).id}`));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => create("ar")} className={buttonClasses("primary", "gap-2")}><Plus aria-hidden="true" size={18} /> {labels.newAr}</button>
      <button type="button" disabled={pending} onClick={() => create("en")} className={buttonClasses("secondary", "gap-2")}><Plus aria-hidden="true" size={18} /> {labels.newEn}</button>
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await importStarters(); setNote(labels.added.replace("{n}", String(r.added))); router.refresh(); })} className={buttonClasses("secondary", "gap-2")}>
        <Download aria-hidden="true" size={16} /> {labels.starters}
      </button>
      {note && <p role="status" className="text-sm font-bold text-good">{note}</p>}
    </div>
  );
}
