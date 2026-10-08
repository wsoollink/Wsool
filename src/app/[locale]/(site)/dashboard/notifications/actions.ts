"use server";

import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";

/** Marks all of the signed-in creator's notifications as read. */
export async function markAllRead() {
  const { user } = await requireCreator();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}

/** Optional emails on/off. Account, billing and verification emails always go out. */
export async function saveEmailSettings(reminders: boolean, productNews: boolean) {
  const { user } = await requireCreator();
  const data = { emailReminders: !!reminders, emailProductNews: !!productNews };
  await db.notificationSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  return { ok: true };
}
