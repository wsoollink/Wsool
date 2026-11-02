import { z } from "zod";

/** Private view settings (owner, Nov 2026): page password + private links per company. Shared by web and app. */
export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 64;
/** How long a new private link works (0 = until revoked). */
export const LINK_DAYS = [0, 7, 30, 90] as const;

export const pagePasswordSchema = z.string().trim().min(PASSWORD_MIN).max(PASSWORD_MAX);

export const privateLinkSchema = z.object({
  name: z.string().trim().min(1).max(60),
  days: z.union(LINK_DAYS.map((d) => z.literal(d)) as unknown as [z.ZodLiteral<0>, z.ZodLiteral<7>, z.ZodLiteral<30>, z.ZodLiteral<90>]),
});
