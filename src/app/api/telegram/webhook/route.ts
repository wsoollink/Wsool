import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { providerFor, saveLink } from "@/lib/connect";
import { channelProfile, CONNECT_WINDOW_MS, webhookSecret } from "@/lib/connect/telegram";
import { db } from "@/lib/db";

type ChatMemberUpdate = {
  my_chat_member?: {
    chat: { id: number; type: string; username?: string; title?: string };
    new_chat_member: { status: string };
  };
};

/**
 * Telegram tells the bot when it is added to / removed from a channel (src/lib/connect/telegram.ts). Added as admin to
 * a public channel whose @username matches an account that tapped "Connect" in the last 30 minutes → linked. Removed →
 * the link stops (the hourly job notifies the creator). Anything else: the bot leaves.
 */
export async function POST(req: NextRequest) {
  const provider = providerFor("telegram");
  const given = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(webhookSecret());
  if (!provider || given.length !== want.length || !timingSafeEqual(given, want)) return new NextResponse(null, { status: 401 });

  const update = (await req.json().catch(() => null)) as ChatMemberUpdate | null;
  const m = update?.my_chat_member;
  if (!m) return NextResponse.json({ ok: true });
  const chatId = String(m.chat.id);

  if (m.new_chat_member.status === "left" || m.new_chat_member.status === "kicked") {
    await db.platformConnection.updateMany({ where: { platform: "telegram", externalId: chatId, status: "active" }, data: { lastSyncAt: null } });
    return NextResponse.json({ ok: true });
  }
  if (m.new_chat_member.status !== "administrator") return NextResponse.json({ ok: true });

  const handle = m.chat.username?.toLowerCase();
  const candidates = handle && (m.chat.type === "channel" || m.chat.type === "supergroup")
    ? await db.socialAccount.findMany({
        where: {
          platform: "telegram", handle: { equals: handle, mode: "insensitive" },
          connectRequestedAt: { gt: new Date(Date.now() - CONNECT_WINDOW_MS) }, page: { deletedAt: null },
        },
        select: { id: true, pageId: true, page: { select: { username: true } } },
      })
    : [];
  const taken = await db.platformConnection.findUnique({ where: { platform_externalId: { platform: "telegram", externalId: chatId } }, select: { accountId: true } });
  // Exactly one account asked for this channel, and no other account holds it.
  const account = candidates.length === 1 && (!taken || taken.accountId === candidates[0].id) ? candidates[0] : null;
  if (!account) {
    if (!taken) await provider.revoke(chatId);
    return NextResponse.json({ ok: true });
  }
  const profile = await channelProfile(chatId).catch(() => null);
  if (!profile) return NextResponse.json({ ok: true });
  await saveLink(account, "telegram", profile, { refreshToken: chatId, scopes: "" }, null, null);
  return NextResponse.json({ ok: true });
}
