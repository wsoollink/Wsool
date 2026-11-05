"use server";

import { confirm, unsubscribe, verifyLink } from "@/lib/newsletter";

export type LinkOutcome = "confirmed" | "unsubscribed" | "invalid";

/**
 * Runs a newsletter email link after the person pressed the button (not on
 * page load, so mail scanners that open links don't confirm or unsubscribe).
 * `list` is the link's `l` (empty on links sent before the lists existed).
 */
export async function runNewsletterLink(kind: "confirm" | "unsubscribe", id: string, token: string, list: string): Promise<LinkOutcome> {
  if (kind !== "confirm" && kind !== "unsubscribe") return "invalid";
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return "invalid";
  if (kind === "unsubscribe") {
    const scope = verifyLink("unsubscribe", String(id), String(token), String(list ?? ""));
    return scope && (await unsubscribe(id, scope)) ? "unsubscribed" : "invalid";
  }
  const target = verifyLink("confirm", String(id), String(token), String(list ?? ""));
  if (!target) return "invalid";
  const status = await confirm(id, target);
  return status === "confirmed" ? "confirmed" : status === "unsubscribed" ? "unsubscribed" : "invalid";
}
