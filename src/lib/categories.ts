import "server-only";
import { db } from "@/lib/db";

/** The owner's category list, in display order. */
export const listCategories = () =>
  db.category.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: { id: true, nameAr: true, nameEn: true } });
