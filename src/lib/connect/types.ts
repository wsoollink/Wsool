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

/** Audience shares in the same shape as `audience_data` (whole percents, each group ≤ 100). Cities aren't touched. */
export type Audience = {
  gender: { label: "female" | "male"; percent: number }[];
  ages: { label: string; percent: number }[];
  countries: { label: string; percent: number }[];
};

/** One platform's sign-in (OAuth) and readers. Add a platform = one file like ./youtube.ts + an entry in PROVIDERS. */
export type Provider = {
  platform: Platform;
  /** Its keys are set (else the Connect button stays hidden). */
  configured: () => boolean;
  authUrl: (state: string, redirectUri: string) => string;
  exchange: (code: string, redirectUri: string) => Promise<{ accessToken: string; refreshToken: string; scopes: string } | null>;
  /** A fresh access token; throws RevokedError when the platform refuses the saved one. */
  refresh: (refreshToken: string) => Promise<string>;
  profile: (accessToken: string) => Promise<ProviderProfile | null>;
  audience?: (accessToken: string) => Promise<Audience | null>;
  revoke: (refreshToken: string) => Promise<void>;
};
