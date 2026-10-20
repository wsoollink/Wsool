"use server";

import { updateTag } from "next/cache";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildDemoPage, DEMO_USERNAME } from "@/lib/demo-page";
import { pageCacheTag } from "@/lib/public-page";

/** Owner only: rebuilds wsool.link/demo with the sample data in src/lib/demo-page.ts. */
export async function refreshDemoPage(): Promise<{ ok?: boolean; error?: "failed" }> {
  const admin = await requireAdmin("owner");
  try {
    await buildDemoPage(db);
    await audit(admin, "demo.refresh");
    updateTag(pageCacheTag(DEMO_USERNAME));
    return { ok: true };
  } catch (err) {
    console.error("[demo]", err);
    return { error: "failed" };
  }
}
