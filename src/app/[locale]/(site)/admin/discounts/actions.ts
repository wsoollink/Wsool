"use server";

import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { DISCOUNT_BATCH_MAX, DISCOUNT_DAYS, DISCOUNT_FREE, DISCOUNT_MAX, DISCOUNT_MIN, generateCode } from "@/lib/discounts";

const createSchema = z.object({
  // 5-90 off the first payment, or 100 = a free Pro period of `freeCycle`.
  percent: z.coerce.number().int().refine((n) => (n >= DISCOUNT_MIN && n <= DISCOUNT_MAX) || n === DISCOUNT_FREE),
  freeCycle: z.enum(["monthly", "yearly"]).optional(),
  // Creators (Pro) or agencies (their plan); an agency 100% code gives `freePlan` for `freeCycle`.
  audience: z.enum(["creators", "agencies"]).default("creators"),
  freePlan: z.enum(["starter", "growth"]).optional(),
  rows: z
    .array(z.object({
      note: z.string().trim().max(120).default(""),
      email: z.string().trim().toLowerCase().max(254).pipe(z.union([z.literal(""), z.email()])).default(""),
    }))
    .min(1).max(DISCOUNT_BATCH_MAX),
}).refine((v) => (v.percent === DISCOUNT_FREE) === !!v.freeCycle)
  .refine((v) => (v.percent === DISCOUNT_FREE && v.audience === "agencies") === !!v.freePlan);

export type CreateResult = { codes?: { code: string; note: string; email: string }[]; error?: "invalid" | "failed" };

/** Makes one code per row (who it's for, optional email lock), valid DISCOUNT_DAYS days. Audited. */
export async function createCodes(input: z.input<typeof createSchema>): Promise<CreateResult> {
  const admin = await requireAdmin("discounts.manage");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { percent, rows } = parsed.data;
  const freeCycle = percent === DISCOUNT_FREE ? parsed.data.freeCycle! : null;
  const { audience } = parsed.data;
  const freePlan = percent === DISCOUNT_FREE && audience === "agencies" ? parsed.data.freePlan! : null;
  const expiresAt = new Date(Date.now() + DISCOUNT_DAYS * 86_400_000);

  // Fresh codes that don't exist yet (collisions are rare; checked anyway).
  const codes = new Set<string>();
  while (codes.size < rows.length) codes.add(generateCode());
  const taken = new Set((await db.discountCode.findMany({ where: { code: { in: [...codes] } }, select: { code: true } })).map((c) => c.code));
  for (const c of taken) { codes.delete(c); let next; do next = generateCode(); while (codes.has(next)); codes.add(next); }

  const list = [...codes];
  const data = rows.map((r, i) => ({ code: list[i], percent, freeCycle, audience, freePlan, note: r.note, email: r.email || null, createdBy: admin.userId, expiresAt }));
  try {
    await db.$transaction(async (tx) => {
      await tx.discountCode.createMany({ data });
      await audit(admin, "discount.create", undefined, { count: data.length, percent, free: freeCycle ?? "", audience }, tx);
    });
  } catch {
    return { error: "failed" };
  }
  return { codes: data.map((d) => ({ code: d.code, note: d.note, email: d.email ?? "" })) };
}

/** Cancels a code that hasn't been used yet. Audited. */
export async function revokeCode(id: string): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAdmin("discounts.manage");
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  const done = await db.$transaction(async (tx) => {
    const row = await tx.discountCode.findUnique({ where: { id }, select: { code: true } });
    const res = await tx.discountCode.updateMany({ where: { id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!row || !res.count) return false;
    await audit(admin, "discount.revoke", { type: "discount_code", id }, { code: row.code }, tx);
    return true;
  });
  return done ? { ok: true } : { error: "invalid" };
}

/**
 * Deletes revoked codes for good: one (id) or all of them (null). Used codes
 * are never deleted (their invoices point at them). Audited.
 */
export async function deleteRevoked(id: string | null): Promise<{ ok?: boolean; count?: number; error?: string }> {
  const admin = await requireAdmin("discounts.manage");
  if (id !== null && !z.uuid().safeParse(id).success) return { error: "invalid" };
  const where = { revokedAt: { not: null }, usedAt: null, invoiceId: null, ...(id ? { id } : {}) };
  const count = await db.$transaction(async (tx) => {
    const rows = await tx.discountCode.findMany({ where, select: { code: true } });
    if (!rows.length) return 0;
    await tx.discountCode.deleteMany({ where });
    await audit(admin, "discount.delete", undefined, { count: rows.length, code: rows.length === 1 ? rows[0].code : "" }, tx);
    return rows.length;
  });
  return count ? { ok: true, count } : { error: "invalid" };
}

/**
 * Deletes the chosen codes for good (the table's checkboxes). Used codes and codes in an open
 * checkout are skipped (their invoices point at them). Audited.
 */
export async function deleteCodes(ids: string[]): Promise<{ count?: number; skipped?: number; error?: string }> {
  const admin = await requireAdmin("discounts.manage");
  const parsed = z.array(z.uuid()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { error: "invalid" };
  const wanted = [...new Set(parsed.data)];
  const count = await db.$transaction(async (tx) => {
    const open = await tx.invoice.findMany({ where: { discountCodeId: { in: wanted }, status: "pending" }, select: { discountCodeId: true } });
    const busy = open.map((o) => o.discountCodeId).filter((x): x is string => !!x);
    const where = { id: { in: wanted.filter((id) => !busy.includes(id)) }, usedAt: null, invoiceId: null };
    const rows = await tx.discountCode.findMany({ where, select: { code: true } });
    if (!rows.length) return 0;
    await tx.discountCode.deleteMany({ where });
    await audit(admin, "discount.delete", undefined, { count: rows.length, code: rows.length === 1 ? rows[0].code : "" }, tx);
    return rows.length;
  });
  return { count, skipped: wanted.length - count };
}
