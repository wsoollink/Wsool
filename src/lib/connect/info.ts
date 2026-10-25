import type { ConnectionStatus } from "@/generated/prisma/enums";

/** What the dashboard and the app show about an account's link (no tokens). */
export type ConnectionInfo = { status: ConnectionStatus; lastSyncAt: string | null; name: string | null } | null;

export const CONNECTION_SELECT = { select: { status: true, lastSyncAt: true, externalName: true } } as const;

export const connectionInfo = (c: { status: ConnectionStatus; lastSyncAt: Date | null; externalName: string | null } | null): ConnectionInfo =>
  c ? { status: c.status, lastSyncAt: c.lastSyncAt?.toISOString() ?? null, name: c.externalName } : null;
