# Wsool (وصول) — Project guide for Claude Code

Read this file fully before any task. It is the source of truth for product decisions.
The owner (Ibrahim) is not a professional developer: explain what you did in short, clear
**Arabic (Saudi dialect is fine)**, one step at a time, and ask before anything destructive.

---

## 1. What we are building

Wsool is a media-kit platform for content creators. Each creator gets a public page at
`wsool.link/<username>` showing their profile, verified follower numbers, brands they worked
with, past work, ad rates, and direct contact (WhatsApp + email). Brands open the link the
creator shares. There is **no brand directory** in v1.

Surfaces:
1. **Public creator page** — `wsool.link/<username>` (8 templates, Arabic + English).
2. **Creator dashboard** — `wsool.link/dashboard/...` (11 sections, Arabic + English).
3. **Sign-up & onboarding** — 7 steps.
4. **Marketing site** — home + pricing (Arabic + English).
5. **Admin panel** — `wsool.link/admin/...` (owner + staff with permissions).
6. **PDF media kit** — generated from the creator's data, in their template.
7. **Transactional emails** — 15 emails (via Resend).

---

## 2. Tech stack (decided)

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Supabase**: Postgres, Auth, Storage, scheduled jobs
- **Prisma** as ORM against the Supabase Postgres
- **Resend** for transactional email, sent from `mail.wsool.link` (never from the personal mailbox)
- **Payments**: Saudi gateway, provider not final (Moyasar or Tap). Build behind a
  `PaymentProvider` interface so the provider can be swapped. Must support mada, Apple Pay,
  international cards, and recurring billing.
- **Hosting**: Vercel. Domain `wsool.link` is on Cloudflare.
- **i18n**: `next-intl` (or equivalent) with `ar` (default, RTL) and `en` (LTR).

### Non-negotiable engineering rules
- **Never commit secrets.** All keys live in `.env.local` (git-ignored) and in Vercel env vars.
  Provide `.env.example` with empty values.
- Public creator pages must be **server-rendered** (SEO + link previews with Open Graph image).
- Enable **Row Level Security** on every Supabase table. A creator can only read/write their own rows.
  Public page data is read through a server-side query, never by exposing other users' rows.
- Validate every input on the server (zod).
- Mobile-first. Every screen must work at 360px wide.
- Accessibility: real `<button>`/`<a>`, labels on inputs, visible focus, 44px touch targets.
- Small commits with clear messages. Run the app and fix errors before saying a step is done.

---

## 3. Language & formatting rules

- Arabic is the primary language, RTL. English is LTR.
- **All numbers everywhere use Western digits 0–9**, also in Arabic (no ٠١٢٣).
- Platform names always in English (TikTok, Instagram, X, YouTube, Snapchat, Threads, Telegram, Facebook, LinkedIn).
- Creator page opens in the visitor's device language if the creator enabled it; otherwise the creator's primary language.
- Creators write their own English content. **No auto-translation.**
- Currency: Arabic site prices in SAR, English site in USD. The dashboard shows the currency the creator subscribed in.

---

## 4. Brand & design tokens

Logos: Arabic and English logo files (owner will add to `/public/brand/`).

| Token | Value | Use |
| --- | --- | --- |
| navy | `#021941` | text, dark buttons |
| blue | `#0060E6` | interactive accent (passes contrast) |
| logo blue | `#0A6CFF` | decorative only, gradients |
| cyan | `#22B8F0` | gradient partner |
| muted | `#56607A` | secondary text |
| bg | `#F4F6FA` / `#F6F8FC` | app / marketing background |
| line | `rgba(2,25,65,0.09)` | borders |
| good / warn / bad | `#12805C` / `#B45309` / `#C0362C` | status |

Fonts: **GT America Arabic** (text) and **Menda** (big numbers). These are **commercial fonts and
the web license is not purchased yet.** Until the owner confirms the license, use a free fallback
(e.g. IBM Plex Sans Arabic for text, a bold display font for numbers) behind CSS variables
`--font-text` and `--font-numbers` so they can be swapped in one place.

Dashboard style: light, white cards (radius 18–24px), soft borders, pill-shaped primary buttons.

---

## 5. Creator page (public)

Order (mobile): hero square photo fading into background · name + verified badge · specialty
(accent color) · bio · city/country · licenses (only if any) · total followers (animated count-up)
· social icons row · tags (3 per row, max 18 chars, no wrap) · monthly views box · platform cards
grid (tap → audience pop-up if data exists) · brand logos (auto-scrolling marquee) · past work
(auto-scrolling row, tap → portrait video pop-up) · **ad rates** · contact (WhatsApp + email)
· footer "صنعت بـ❤️ وصول" (hideable on Pro).
Desktop: left sticky sidebar with photo, info and contact; main column with the rest.

**8 templates**: White, Black (glass), Sand, Pink, Black & Gold, Vivid, Green, **Custom**
(creator picks 1–2 colors + light/dark; palette is derived automatically, with contrast guards).
Templates are fixed: there is **no visitor light/dark toggle**.
Creator can also pick an accent color and the number font (wide bold vs same as text).

**Licenses**: a flexible list. Each item = free-text name (e.g. "رخصة موثوق") + number + optional
file (opens in a pop-up). Section hidden if empty.

**Ad rates**: per platform, the creator adds their own rate types (name + price, add/delete).
Optional **bundle**: chosen platforms + its own rate types; show "instead of X" and savings %
only when the same type name exists on every included platform. Toggles: show on page,
show in PDF, currency, VAT included or not. Hidden → show "الأسعار عند التواصل".

---

## 6. Plans, trial, pricing

- **Free** and **Pro**. Pro = **SAR 49/month or SAR 490/year** (USD 13 / 130 on the English site).
  Prices are fixed in every country and **include VAT**.
- Every new account automatically gets a **14-day Pro trial, no card**. Reminder emails at
  day 10, day 13, and day 14. If not subscribed, the page drops to Free; **no data is deleted**.
- Free limits: 6 past works, White and Black templates, no verified badge, no analytics,
  no PDF, Wsool footer shown. (Feature split will be reviewed by the owner; keep limits in one config file.)

---

## 7. Verification

- Creator uploads a screenshot of each account page showing the username and follower count.
- Staff review in the admin panel within 48h: three checkboxes must be ticked to approve;
  rejecting requires a reason from a preset list (sent to the creator by email + notification).
- Verification is valid **90 days**; reminder 7 days before expiry.
- Statuses: none, in review, verified, expiring soon, rejected.

---

## 8. Dashboard sections

Home · Edit page · Accounts & numbers · Brands & work · **Ad rates** · Contact · Verification ·
Appearance · Analytics · Subscription · Notifications (bell with unread dot in every header).
Mobile: bottom tab bar (Home, My page, Accounts, Analytics, More). Desktop: left sidebar.
Subscription page also holds **self-service account deletion**: download data → type username
to confirm → page hidden immediately → 30-day undo window → permanent deletion and link released.

---

## 9. Admin panel

Pages: Overview · Verification queue · Users · Subscriptions & payments · **Finance** · Team & permissions.
- Owner has all permissions and cannot be edited.
- Staff roles (presets): Verifier, Support, Finance, Custom. Permissions toggled per member:
  view/decide verifications, view/edit users, extend trial, suspend accounts, view revenue, refund.
  Only the owner can invite members, change permissions, or change platform settings.
- Every admin action is written to an **audit log** (who, what, when).
- Finance: revenue (auto from subscriptions), expenses (manual, categories, recurring), P&L,
  unit economics (MRR growth, ARPU, churn, LTV, CAC), and a **read-only investor link**
  (choose sections + period, expiry, optional password, no personal user data, PDF export).

---

## 10. Data model (starting point — refine as needed)

users · pages (username, primary_lang, en_enabled, template, custom_colors, accent,
number_font, hide_branding, is_published, deleted_at) · page_translations (lang, full_name,
specialty, bio, city, country) · tags · licenses (name, number, file_url, sort) ·
social_accounts (platform, handle, url, followers, followers_updated_at, verification_status,
verified_until, sort) · audience_data (account_id, gender, ages, countries, cities, updated_at) ·
monthly_views (month, views) · brand_logos (logo_url, name, sort) · portfolio_items
(+ translations: brand, type, platform, video_url, thumb_url, sort) · rate_settings (show_on_page,
show_in_pdf, currency, vat_included) · rates (account_id, name, price, sort) · rate_bundles +
bundle_platforms + bundle_rates · verification_requests (account_id, screenshot_url, status,
reason, reviewed_by, reviewed_at) · subscriptions (plan, cycle, currency, status, trial_ends_at,
current_period_end, provider_ids) · invoices · page_views · contact_clicks · notifications ·
notification_settings · admin_members (role, permissions json, active) · audit_log ·
expenses · investor_links · reserved_usernames.

Username rules: lowercase a–z, 0–9, dot, underscore, 3–20 chars, not reserved
(admin, dashboard, api, wsool, login, signup, pricing, help, support, …). Changeable once every 30 days.

---

## 11. Build phases (do them in order)

1. **Foundation**: project setup, i18n + RTL, design tokens, Supabase + Prisma, auth
   (email OTP + Google; Apple later), username claim, dashboard shell.
2. **Creator page**: public page with 8 templates, both languages, 404 / hidden-page states, OG image.
3. **Dashboard editing**: edit page, accounts, brands & work, ad rates, contact, appearance.
4. **Verification + admin**: uploads, review queue, users, team & permissions, audit log.
5. **Payments**: provider interface, trial logic, subscriptions, invoices, billing emails.
6. **Launch pieces**: analytics, PDF media kit, all emails & notifications, marketing site, finance.

Before starting each phase: write a short plan in Arabic and wait for the owner's "تمام".

---

## 12. Decisions added by the owner (Phase 1)

1. **Creator URL has no language prefix.** It is always `wsool.link/<username>` (never `/ar/...`
   or `/en/...`). The creator page language comes from the creator's settings + the visitor's
   device language (section 3). Other surfaces (marketing, dashboard, admin, auth) must use a
   locale scheme that never collides with `/<username>`: language is stored in a cookie /
   detected from `Accept-Language`, not in the path, and every top-level route segment is a
   reserved username.
2. **Ownership checks on the server.** Prisma connects as a privileged role and bypasses RLS,
   so RLS is a second line of defense only. Every server action / route handler that touches
   creator data must: get the signed-in user from the Supabase session on the server (never
   trust a user id from the client), then scope every query by that user's id
   (`where: { userId }` / ownership check before update/delete) through shared helpers.
   Client code never talks to tables directly with the service key.
3. **Usernames are case-insensitive.** Stored and compared lowercased (unique index on the
   lowercased value). Reserved list includes every top-level site route (dashboard, admin, api,
   pricing, login, signup, auth, settings, …) and must be updated whenever a route is added.
4. **OTP emails** go through Resend (custom SMTP in Supabase Auth, sender on
   `mail.wsool.link`, domain verified in Resend, region eu-west-1). Done in Phase 1, step 5.

### How i18n routing is implemented (Phase 1, step 2)
- `src/proxy.ts` reads the `NEXT_LOCALE` cookie, then `Accept-Language`, else `ar`, and
  **rewrites** (never redirects) `/x` → `/<locale>/x`. Public URLs never show a prefix;
  typing `/ar/...` or `/en/...` gives 404, so `ar` and `en` are reserved usernames.
- Site pages live in `src/app/[locale]/(site)/` with their own root layout (`lang`/`dir`).
  Creator pages will get a separate root layout in Phase 2 so their language follows the
  creator's settings, not the site cookie.
- next-intl's locale is `ar-u-nu-latn` for Arabic so every formatted number/date uses 0–9.
  Use the `[locale]` route param (`"ar" | "en"`) for logic; `toIntlLocale()` for `Intl`.
- The proxy skips paths ending in asset extensions (`.png`, `.json`, `.pdf`, …). Usernames may
  contain dots, so username validation must reject names ending in those extensions.

### Database workflow (Phase 1, step 4)
- Prisma 7 (`prisma.config.ts`, client generated to `src/generated/prisma`, git-ignored;
  `postinstall` runs `prisma generate`). Server code imports `db` from `src/lib/db.ts`
  (`server-only`, `@prisma/adapter-pg` over `DATABASE_URL`).
- **Claude cloud sessions cannot open a Postgres connection to Supabase** (the sandbox proxy
  only passes HTTPS). HTTPS to Supabase (Auth, Storage, REST) works when the environment's
  network allowlist has `*.supabase.co` / `*.supabase.com`.
- So develop against the local Postgres 16 in the sandbox:
  `service postgresql start`, then apply `prisma/local-supabase-stub.sql` to `template1`
  (fake `auth.uid()` + `anon`/`authenticated` roles, local only), create db `wsool`, and run
  Prisma with `DIRECT_URL`/`DATABASE_URL` set to the local db on the command line (real env
  vars point at Supabase).
- Migrations reach Supabase on deploy: Vercel runs `vercel-build` =
  `prisma migrate deploy && next build`.
- RLS migration (`prisma/migrations/*_rls`): RLS on every table, owner-only policies for
  `authenticated`, no access for `anon`. Every new table needs RLS + policies in its migration.
- Reserved usernames: `src/config/usernames.ts` (code, all site routes) + `reserved_usernames`
  table (extra names staff add).

### Auth (Phase 1, step 5)
- Email OTP via Supabase (`src/app/[locale]/(site)/login`). Server actions call
  `signInWithOtp` / `verifyOtp`; first sign-in creates the `users` row + 14-day trial
  (`src/lib/account.ts`, `TRIAL_DAYS` in `src/config/plans.ts`).
- `src/lib/auth.ts`: `getCurrentUser()` / `requireUser()` read the verified JWT claims
  (`getClaims`). They are the only source of a user id for queries.
- `src/proxy.ts` refreshes the Supabase session cookie only when an `sb-` cookie exists.
- Supabase email templates "Magic Link" (returning users) and "Confirm signup" (new users)
  hold one bilingual body (Arabic, code, English) with `{{ .Token }}`. Free projects can only
  edit templates with custom SMTP, which is why Resend is connected. The OTP is 8 digits
  (the form accepts 6-10).
- Supabase project: `wsool-eu` in Frankfurt (eu-central-1).
- Sandbox only: run the app with `NODE_USE_ENV_PROXY=1` (Node's fetch ignores HTTPS_PROXY
  otherwise) and the overrides in `.env.local`.
