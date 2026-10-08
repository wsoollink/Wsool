"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { NotFoundPage } from "@/components/marketing/Pages";
import { normalizeUsername, usernameFormatError } from "@/config/usernames";
import type { Locale } from "@/i18n/config";

// No creator with this username: the design's 404 with the name pre-filled
// in the claim box (when it's a valid, claimable name).
export default function CreatorNotFound() {
  const lang = useLocale().slice(0, 2) as Locale;
  const segment = decodeURIComponent(usePathname().replace(/^\/(?:ar|en)(?=\/|$)/, "").split("/")[1] ?? "");
  const name = normalizeUsername(segment);
  return <NotFoundPage lang={lang} username={usernameFormatError(name) ? "" : name} />;
}
