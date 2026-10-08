import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * The signed-in creator and their page. Signed-out visitors go to login,
 * users without a page go to onboarding. Use in every dashboard page.
 */
export const requireCreator = cache(async () => {
  const user = await requireUser();
  const page = await db.page.findUnique({ where: { userId: user.id } });
  if (!page) redirect("/onboarding");
  return { user, page };
});
