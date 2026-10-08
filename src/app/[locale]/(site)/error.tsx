"use client";

import { useEffect } from "react";
import { ServerErrorPage } from "@/components/marketing/Pages";

// Something broke while rendering a site page: the design's server-error state.
export default function SiteError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { console.error(error); }, [error]);
  const lang = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar";
  return <ServerErrorPage lang={lang} />;
}
