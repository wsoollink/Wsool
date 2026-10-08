"use server";

import { z } from "zod";
import { EXPENSE_CATEGORIES, INVESTOR_SECTIONS, RECURRENCES } from "@/config/finance";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { hashPassword, hashToken, newToken } from "@/lib/investor";
import { siteOrigin } from "@/lib/site-url";

const expenseSchema = z.object({
  date: z.iso.date(),
  endDate: z.iso.date().nullable(),
  amount: z.number().positive().max(100_000_000),
  currency: z.enum(["SAR", "USD"]),
  category: z.enum(EXPENSE_CATEGORIES),
  recurrence: z.enum(RECURRENCES),
  description: z.string().trim().max(200),
});

export async function addExpense(input: z.input<typeof expenseSchema>) {
  const admin = await requireAdmin("revenue.view");
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const e = parsed.data;
  await db.$transaction(async (tx) => {
    const row = await tx.expense.create({
      data: { date: new Date(e.date), endDate: e.endDate ? new Date(e.endDate) : null, amount: e.amount, currency: e.currency, category: e.category, recurrence: e.recurrence, description: e.description, createdBy: admin.userId },
    });
    await audit(admin, "expense.add", { type: "expense", id: row.id }, { ...e }, tx);
  });
  return { ok: true };
}

export async function deleteExpense(id: string) {
  const admin = await requireAdmin("revenue.view");
  const row = await db.expense.findUnique({ where: { id: String(id) } });
  if (!row) return { ok: false };
  await db.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: row.id } });
    await audit(admin, "expense.delete", { type: "expense", id: row.id }, { amount: Number(row.amount), currency: row.currency, category: row.category, description: row.description }, tx);
  });
  return { ok: true };
}

const linkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  sections: z.array(z.enum(INVESTOR_SECTIONS)).min(1),
  months: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  expiresInDays: z.number().int().min(1).max(365),
  password: z.string().max(100),
});

/** Owner only. Returns the link once; only a hash of its token is stored. */
export async function createInvestorLink(input: z.input<typeof linkSchema>) {
  const admin = await requireAdmin("owner");
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const v = parsed.data;
  const token = newToken();
  await db.$transaction(async (tx) => {
    const row = await tx.investorLink.create({
      data: {
        tokenHash: hashToken(token), label: v.label, sections: [...new Set(v.sections)], months: v.months,
        expiresAt: new Date(Date.now() + v.expiresInDays * 86_400_000),
        passwordHash: v.password ? hashPassword(v.password) : null, createdBy: admin.userId,
      },
    });
    await audit(admin, "investor_link.create", { type: "investor_link", id: row.id }, { label: v.label, sections: v.sections, months: v.months, expiresInDays: v.expiresInDays, password: !!v.password }, tx);
  });
  return { ok: true as const, url: `${siteOrigin()}/invest/${token}` };
}

export async function revokeInvestorLink(id: string) {
  const admin = await requireAdmin("owner");
  const row = await db.investorLink.findUnique({ where: { id: String(id) } });
  if (!row || row.revokedAt) return { ok: false };
  await db.$transaction(async (tx) => {
    await tx.investorLink.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    await audit(admin, "investor_link.revoke", { type: "investor_link", id: row.id }, { label: row.label }, tx);
  });
  return { ok: true };
}
