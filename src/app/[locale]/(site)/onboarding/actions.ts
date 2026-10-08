"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { normalizeUsername } from "@/config/usernames";
import { ensureAccount } from "@/lib/account";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { usernameError, type UsernameError } from "@/lib/username";

export type AvailabilityResult = { name: string; error: UsernameError | null };

/** Live availability check while the creator types. */
export async function checkUsername(raw: string): Promise<AvailabilityResult> {
  const user = await requireUser();
  const name = normalizeUsername(String(raw).slice(0, 40));
  return { name, error: await usernameError(name, user.id) };
}

export type ClaimState = { name?: string; error?: UsernameError | "failed" };

/** Claims the username and creates the creator's page (first time only). */
export async function claimUsername(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const user = await requireUser();
  const name = normalizeUsername(String(formData.get("username") ?? "").slice(0, 40));

  const error = await usernameError(name, user.id);
  if (error) return { name, error };

  await ensureAccount(user);
  const existing = await db.page.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (existing) redirect("/dashboard");

  try {
    await db.page.create({ data: { userId: user.id, username: name } });
  } catch (e) {
    // Someone else claimed it between the check and the insert.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { name, error: "taken" };
    return { name, error: "failed" };
  }
  redirect("/dashboard");
}
