import { apiLang, authed, json, preflight } from "@/lib/mobile/api";
import { db } from "@/lib/db";
import { notificationText } from "@/lib/notify";

/** The bell: latest 50 notifications, texts in the app language (?lang=). */
export const GET = authed(async ({ user, req }) => {
  const lang = apiLang(req);
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return json({
    items: items
      .map((n) => {
        const text = notificationText(n.type, n.data, lang);
        return text && { id: n.id, type: n.type, title: text.title, body: text.body, href: text.href, read: !!n.readAt, createdAt: n.createdAt.toISOString() };
      })
      .filter(Boolean),
  });
});
export const OPTIONS = preflight;
