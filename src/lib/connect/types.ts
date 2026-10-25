import type { Platform } from "@/generated/prisma/enums";

/** What a connected platform tells us about the creator's own account. */
export type ProviderProfile = {
  /** The platform's id for the account (unique per platform). */
  externalId: string;
  name: string | null;
  /** Username without "@", when the platform has one. */
  handle: string | null;
  url: string;
  /** null when the platform hides the number. */
  followers: number | null;
};

/**
 * Audience shares in the same shape as `audience_data` (whole percents, each group ≤ 100), in the platform's own
 * groups and order (YouTube: 13-17 … 65+). Cities only when the platform names them; otherwise the creator's stay.
 */
export type Audience = {
  gender: { label: "female" | "male"; percent: number }[];
  ages: { label: string; percent: number }[];
  countries: { label: string; percent: number }[];
  cities?: { label: string; percent: number }[];
};

/** One platform's sign-in (OAuth) and readers. Add a platform = one file like ./youtube.ts + an entry in PROVIDERS. */
export type Provider = {
  platform: Platform;
  /** Its keys are set (else the Connect button stays hidden). */
  configured: () => boolean;
  authUrl: (state: string, redirectUri: string) => string;
  exchange: (code: string, redirectUri: string) => Promise<{ accessToken: string; refreshToken: string; scopes: string } | null>;
  /** A fresh access token (+ a new refresh token when the platform rotates it); throws RevokedError when refused. */
  refresh: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>;
  /** The account on the platform; `account` = the Wsool account being linked (externalId once linked). null = not found. */
  profile: (accessToken: string, account: { url: string; externalId: string | null }) => Promise<ProviderProfile | null>;
  /** Error shown when profile() finds nothing (default no_channel). */
  notFound?: "no_channel" | "no_server";
  audience?: (accessToken: string) => Promise<Audience | null>;
  /** Views of the last complete month (`month` = its first day, UTC), for the monthly views box. */
  monthlyViews?: (accessToken: string) => Promise<{ month: Date; views: number } | null>;
  revoke: (refreshToken: string) => Promise<void>;
};
