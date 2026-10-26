import "server-only";
import { createHash } from "node:crypto";
import { RevokedError } from "./errors";
import type { Provider, ProviderProfile } from "./types";

/**
 * Telegram (owner, Oct 2026): there is no "sign in with Telegram" for channels, so ownership is proven by the creator
 * adding Wsool's bot as an admin of their channel (only the owner or an admin can). Flow: "Connect" stamps
 * `social_accounts.connect_requested_at` and opens t.me/<bot>?startchannel; Telegram then sends the bot a
 * `my_chat_member` update (webhook /api/telegram/webhook), and the channel is linked to the one account that asked in
 * the last 30 minutes with the same @username. The stored "token" is the chat id; subscribers are read daily with
 * getChatMemberCount. Removing the bot stops the link. Credentials: TELEGRAM_BOT_TOKEN (from @BotFather). Tests:
 * TELEGRAM_API_FAKE.
 */
const fake = process.env.TELEGRAM_API_FAKE?.replace(/\/$/, "");
const TIMEOUT = 10_000;
export const CONNECT_WINDOW_MS = 30 * 60_000;

const botToken = () => process.env.TELEGRAM_BOT_TOKEN || null;

type Result<T> = { ok: boolean; result?: T; description?: string; error_code?: number };

export async function bot<T>(method: string, params: Record<string, unknown> = {}): Promise<Result<T>> {
  const base = fake ?? "https://api.telegram.org";
  const res = await fetch(`${base}/bot${botToken()}/${method}`, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await res.json().catch(() => ({ ok: false }))) as Result<T>;
}

/** The secret Telegram sends back in X-Telegram-Bot-Api-Secret-Token (derived from the bot token). */
export const webhookSecret = () => createHash("sha256").update(`wsool-telegram:${botToken()}`).digest("base64url").slice(0, 48);

let username: string | null = null;
async function botUsername() {
  if (!username) username = (await bot<{ username: string }>("getMe")).result?.username ?? null;
  return username;
}

/** Points the bot's webhook at this site (run by the hourly job; no-op when already set). */
export async function ensureTelegramWebhook(origin: string) {
  if (!botToken()) return;
  const url = `${origin}/api/telegram/webhook`;
  const info = await bot<{ url?: string; allowed_updates?: string[] }>("getWebhookInfo");
  if (info.result?.url === url && info.result.allowed_updates?.includes("my_chat_member")) return;
  await bot("setWebhook", { url, secret_token: webhookSecret(), allowed_updates: ["my_chat_member"], drop_pending_updates: false });
}

/** A channel the bot can see: title, @username and subscribers. Kicked / deleted = RevokedError. */
export async function channelProfile(chatId: string): Promise<ProviderProfile | null> {
  const chat = await bot<{ id: number; title?: string; username?: string; type: string }>("getChat", { chat_id: chatId });
  if (!chat.ok) {
    if (chat.error_code === 403 || chat.error_code === 400) throw new RevokedError();
    throw new Error(`telegram ${chat.error_code ?? "?"}`);
  }
  const count = await bot<number>("getChatMemberCount", { chat_id: chatId });
  const handle = chat.result?.username ?? null;
  if (!chat.result || !handle) return null;
  return {
    externalId: String(chat.result.id),
    name: chat.result.title ?? handle,
    handle,
    url: `https://t.me/${handle}`,
    followers: count.ok && typeof count.result === "number" ? count.result : null,
  };
}

/**
 * "Check the link": when Telegram sent no update (the bot was already an admin, so re-adding it changed nothing),
 * ask Telegram directly whether the bot is an admin of @handle. Only for an account that tapped "Connect" in the
 * last 30 minutes; a channel linked to another account is refused. The bot leaves channels nobody asked for, so
 * an unlinked channel where it is still admin was added by that channel's admin.
 */
export async function botIsAdmin(handle: string): Promise<string | null> {
  const me = (await bot<{ id: number }>("getMe")).result?.id;
  const chat = await bot<{ id: number; type: string }>("getChat", { chat_id: `@${handle}` });
  if (!me || !chat.ok || !chat.result) return null;
  const member = await bot<{ status: string }>("getChatMember", { chat_id: chat.result.id, user_id: me });
  return member.result?.status === "administrator" ? String(chat.result.id) : null;
}

export const telegram: Provider = {
  platform: "telegram",
  configured: () => !!botToken(),
  bot: true,

  // Not an OAuth platform: "Connect" opens the bot's "add to channel" screen instead.
  authUrl: () => "",
  exchange: async () => null,
  async botLink() {
    const name = await botUsername();
    return name ? `https://t.me/${name}?startchannel&admin=invite_users` : null;
  },

  // The stored "token" is the channel id: nothing to refresh.
  refresh: async (chatId) => ({ accessToken: chatId }),
  profile: (chatId) => channelProfile(chatId),

  async revoke(chatId) {
    // Unlinking = the bot leaves the channel.
    await bot("leaveChat", { chat_id: chatId }).catch(() => {});
  },
};
