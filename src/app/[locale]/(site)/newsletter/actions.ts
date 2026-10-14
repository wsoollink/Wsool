"use server";

import { confirm, unsubscribe, verifyLink } from "@/lib/newsletter";

export type LinkOutcome = "confirmed" | "unsubscribed" | "invalid";

/**
 * Runs a newsletter email link after the person pressed the button (not on
 * page load, so mail scanners that open links don't confirm or unsubscribe).
 */
export async function runNewsletterLink(kind: "confirm" | "unsubscribe", id: string, token: string): Promise<LinkOutcome> {
  if (kind !== "confirm" && kind !== "unsubscribe") return "invalid";
  if (!/^[0-9a-f-]{36}$/.test(String(id)) || !verifyLink(kind, String(id), String(token))) return "invalid";
  if (kind === "unsubscribe") return (await unsubscribe(id)) ? "unsubscribed" : "invalid";
  const status = await confirm(id);
  return status === "confirmed" ? "confirmed" : status === "unsubscribed" ? "unsubscribed" : "invalid";
}
