"use server";

import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { MAX_CATEGORIES } from "@/config/categories";
import { db } from "@/lib/db";

const name = z.string().trim().min(1).max(40);
const listSchema = z
  .array(z.object({ id: z.uuid().nullable(), nameAr: name, nameEn: name }))
  .max(MAX_CATEGORIES)
  .refine((items) => new Set(items.map((i) => i.nameAr)).size === items.length && new Set(items.map((i) => i.nameEn.toLowerCase())).size === items.length, "duplicate");

export type SaveResult = { ok?: boolean; error?: "invalid" | "duplicate" | "failed"; items?: { id: string; nameAr: string; nameEn: string }[] };

/**
 * Replaces the category list (owner only): existing ids are renamed and
 * reordered, new rows created, missing ones deleted (creators lose that pick).
 */
export async function saveCategoryList(input: { id: string | null; nameAr: string; nameEn: string }[]): Promise<SaveResult> {
  const admin = await requireAdmin("owner");
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.message === "duplicate") ? "duplicate" : "invalid" };
  const items = parsed.data;
  try {
    const saved = await db.$transaction(async (tx) => {
      const current = await tx.category.findMany({ select: { id: true } });
      const keep = new Set(items.map((i) => i.id).filter((id): id is string => !!id));
      if ([...keep].some((id) => !current.some((c) => c.id === id))) throw new Error("unknown id");
      const removed = current.filter((c) => !keep.has(c.id)).map((c) => c.id);
      if (removed.length) await tx.category.deleteMany({ where: { id: { in: removed } } });
      const out = [];
      for (const [sort, i] of items.entries()) {
        const data = { nameAr: i.nameAr, nameEn: i.nameEn, sort };
        out.push(i.id ? await tx.category.update({ where: { id: i.id }, data }) : await tx.category.create({ data }));
      }
      await audit(admin, "category.update", undefined, { added: items.filter((i) => !i.id).length, removed: removed.length, count: items.length }, tx);
      return out;
    });
    return { ok: true, items: saved.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })) };
  } catch {
    return { error: "failed" };
  }
}
