import { z } from "zod";
import { countryOf, deviceOf, isBot, MAX_EVENTS_PER_VISITOR_DAY, referrerHost, today, visitorHash } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLATFORMS } from "@/config/platforms";

const body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("view"), username: z.string().max(20), lang: z.enum(["ar", "en"]), referrer: z.string().max(500).nullable() }),
  z.object({
    type: z.literal("click"), username: z.string().max(20),
    kind: z.enum(["whatsapp", "email", "social", "work"]),
    platform: z.enum(PLATFORMS as [string, ...string[]]).nullable(),
  }),
]);

/**
 * Counts a visit or a tap on a public creator page (sent with sendBeacon).
 * Bots, the page owner's own visits and refresh spam are ignored. Always
 * answers 204 so it never shows errors on the public page.
 */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done;
  let parsed;
  try {
    parsed = body.safeParse(JSON.parse(await req.text()));
  } catch {
    return done;
  }
  if (!parsed.success) return done;
  const data = parsed.data;

  const page = await db.page.findUnique({ where: { username: data.username.toLowerCase() }, select: { id: true, userId: true, isPublished: true, deletedAt: true } });
  if (!page || !page.isPublished || page.deletedAt) return done;
  // The creator looking at their own page doesn't count.
  if (req.headers.get("cookie")?.includes("sb-") && (await getCurrentUser())?.id === page.userId) return done;

  const day = today();
  const ip = req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const hash = visitorHash(ip, ua, page.id, day);
  const [views, clicks] = await Promise.all([
    db.pageView.count({ where: { pageId: page.id, visitorHash: hash, day } }),
    db.contactClick.count({ where: { pageId: page.id, visitorHash: hash, day } }),
  ]);
  if (views + clicks >= MAX_EVENTS_PER_VISITOR_DAY) return done;

  if (data.type === "view") {
    await db.pageView.create({
      data: {
        pageId: page.id, day, visitorHash: hash, lang: data.lang, device: deviceOf(ua),
        country: countryOf(req.headers), referrer: referrerHost(data.referrer, new URL(req.url).hostname),
      },
    });
  } else {
    await db.contactClick.create({
      data: { pageId: page.id, day, visitorHash: hash, kind: data.kind, platform: data.platform as never },
    });
  }
  return done;
}
