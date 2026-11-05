"use server";

import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { setList } from "@/lib/newsletter";

/** Marks all of the signed-in creator's notifications as read. */
export async function markAllRead() {
  const { user } = await requireCreator();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}

/**
 * Optional emails on/off. Account, billing and verification emails always go out.
 * "Wsool news" = the creators newsletter list (the account email is on it unless switched off).
 */
export async function saveEmailSettings(reminders: boolean, productNews: boolean) {
  const { user, page } = await requireCreator();
  const data = { emailReminders: !!reminders, emailProductNews: !!productNews };
  await db.notificationSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  await setList(user.email, "creators", !!productNews, page.primaryLang);
  return { ok: true };
}

/** Marks one of the signed-in creator's notifications as read. */
export async function markRead(id: string) {
  const { user } = await requireCreator();
  await db.notification.updateMany({ where: { id: String(id), userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}
