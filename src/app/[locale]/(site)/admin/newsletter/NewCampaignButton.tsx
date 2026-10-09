"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { createCampaign } from "./actions";

/** Creates a draft, then opens its editor with a normal client navigation. */
export function NewCampaignButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button" disabled={pending} aria-busy={pending}
      onClick={() => startTransition(async () => router.push(`/admin/newsletter/edit?id=${(await createCampaign()).id}`))}
      className={buttonClasses("primary", "gap-2")}
    >
      <Plus aria-hidden="true" size={18} /> {label}
    </button>
  );
}
