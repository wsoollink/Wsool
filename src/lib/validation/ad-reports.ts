import { z } from "zod";

/** Ad report input (creator dashboard and agency tab). */
export const reportItemsSchema = z.array(z.object({ url: z.string().trim().min(5).max(500), accountId: z.uuid() })).min(1).max(20);
export const newReportSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  lang: z.enum(["ar", "en"]),
  items: reportItemsSchema,
});
