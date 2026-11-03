"use client";

import { useSearchParams } from "next/navigation";
import { NEXT_PARAM, safeNextPath } from "@/lib/next-path";

/** Carries ?next= from the login URL into the sign-in forms (checked again on the server). */
export function NextField() {
  const next = safeNextPath(useSearchParams().get(NEXT_PARAM));
  return next ? <input type="hidden" name={NEXT_PARAM} value={next} /> : null;
}
