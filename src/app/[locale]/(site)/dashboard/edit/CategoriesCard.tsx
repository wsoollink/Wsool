"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { categoryName, MAX_PAGE_CATEGORIES, type CategoryItem } from "@/config/categories";
import { saveCategories } from "./actions";

/** Pick up to MAX_PAGE_CATEGORIES from the owner's list (used by Wsool's team, not shown on the page). */
export function CategoriesCard({ categories, initial }: { categories: CategoryItem[]; initial: string[] }) {
  const t = useTranslations("EditPage");
  const lang = useLocale().startsWith("en") ? "en" : "ar";
  const [picked, setPicked] = useState(initial);
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();
  const full = picked.length >= MAX_PAGE_CATEGORIES;

  const toggle = (id: string) => {
    setStatus("");
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PAGE_CATEGORIES ? p : [...p, id]));
  };
  const save = () => startTransition(async () => setStatus((await saveCategories(picked)).ok ? "saved" : "failed"));

  if (categories.length === 0) return null;
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("categories")}</h2>
        <p className="text-xs text-muted">{t("categoriesHint", { max: MAX_PAGE_CATEGORIES })}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const on = picked.includes(c.id);
          return (
            <li key={c.id}>
              <button
                type="button" aria-pressed={on} disabled={!on && full} onClick={() => toggle(c.id)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors disabled:opacity-40 ${on ? "bg-blue text-white" : "bg-navy/5 text-navy hover:bg-navy/10"}`}
              >
                {on && <Check aria-hidden="true" size={16} />}
                {categoryName(c, lang)}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "failed" ? "text-bad" : "text-good"}`}>
          {status === "saved" ? t("saved") : status === "failed" ? t("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </Card>
  );
}
