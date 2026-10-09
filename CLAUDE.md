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
- **Hosting**: Netlify (switched from Vercel: its phone verification never reached Saudi
  numbers, and its free plan is non-commercial). Config in `netlify.toml`. Domain `wsool.link`
  is on Cloudflare.
- **i18n**: `next-intl` (or equivalent) with `ar` (default, RTL) and `en` (LTR).

### Non-negotiable engineering rules
- **Never commit secrets.** All keys live in `.env.local` (git-ignored) and in Netlify env vars.
  Provide `.env.example` with empty values.
- Public creator pages must be **server-rendered** (SEO + link previews with Open Graph image).
- Enable **Row Level Security** on every Supabase table. A creator can only read/write their own rows.
  Public page data is read through a server-side query, never by exposing other users' rows.
- Validate every input on the server (zod).
- Mobile-first. Every screen must work at 360px wide. Text fields are at least 16px on touch screens
  (rule in `globals.css`), otherwise iPhone Safari zooms the page when a field is tapped.
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

Fonts: text = **Noto Kufi Arabic** (Google, free OFL license; Arabic + Latin, variable weight
100-900), chosen by the owner (Oct 2026) instead of the commercial GT America Arabic. Web file:
`src/styles/fonts/NotoKufiArabic-Variable.woff2` (loaded with `next/font/local` in
`src/styles/fonts.ts`); OG image and PDF use the static Regular/Bold TTFs in `assets/fonts/`.
Big numbers: the same font's **Black (900)** cut (owner, instead of Menda), forced whatever weight a
class asks for (`NotoKufiArabic-Black.woff2` / `.ttf`). Both sit behind the CSS variables
`--font-text` and `--font-numbers` so they can be swapped in one place. Emails use system fonts.

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
   - **Newsletter signup** on the marketing site (Arabic + English), a section just above the
     footer: email field + subscribe button + one line saying what subscribers will receive.
     - Double opt-in: send a confirmation email; add the address only after it is confirmed.
     - Unsubscribe link in every email.
     - Table `newsletter_subscribers` (email, lang, status, source, confirmed_at,
       unsubscribed_at), no duplicate emails.
     - Sent through Resend from `mail.wsool.link`.
     - Admin panel: subscriber count + CSV export.
   - **Footer social icons** on the marketing site (Arabic + English) for Wsool's own accounts:
     Instagram, TikTok, X, Snapchat, YouTube, Facebook (+ Threads and Telegram, added by the owner).
     Links are filled in `SOCIAL_LINKS` (`src/config/site.ts`); YouTube is empty for now (no icon).
     Component: `src/components/site/SocialLinks.tsx`, to be placed per the approved design.
     - Links live in one config file (site-config).
     - A platform with an empty link shows no icon.
     - Links open in a new tab; every icon has a descriptive accessible name for screen readers.
   - **Approved design** for both: the owner's marketing homepage design. Newsletter = a card
     just above the footer (mail icon, title, description, email field + button, error
     message, green success state). Social icons = a "Follow us" (تابعنا) row under the Wsool
     description in the footer. Match that design exactly when building them; ask the owner
     for the design file if it is not in the repo yet.

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
- Migrations reach Supabase on deploy: Netlify runs `npm run build:deploy` =
  `prisma migrate deploy && next build` (see `netlify.toml`).
- RLS migration (`prisma/migrations/*_rls`): RLS on every table, owner-only policies for
  `authenticated`, no access for `anon`. Every new table needs RLS + policies in its migration
  (helpers `owns_page()`, `owns_account()`, `owns_bundle()` exist).
- **The Data API is read-only** for `anon`/`authenticated` (INSERT/UPDATE/DELETE revoked in the
  `*_page_content` migration, also for future tables). All writes go through the server, which
  enforces ownership, verification rules and plan limits (otherwise a creator could self-verify
  or enable Pro settings via the public API).
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
- **Google sign-in**: `signInWithGoogle` (server action, PKCE) → Supabase → Google → `/api/auth/callback`
  (`exchangeCodeForSession`, then `ensureAccount` = same trial as email sign-up) → `/dashboard`. Errors go to
  `/login?error=google`. The button shows only when Google is enabled in Supabase
  (`googleSignInEnabled()` reads `/auth/v1/settings`, cached minutes), so no code change is needed to
  turn it on. Owner setup: Google Cloud OAuth client (redirect URI = the Supabase callback
  `https://<project>.supabase.co/auth/v1/callback`), then Supabase → Providers → Google, and every site
  origin's `/api/auth/callback` in Supabase's Redirect URLs. Same-email accounts are linked by Supabase.
- Supabase project: `wsool-eu` in Frankfurt (eu-central-1).
- Sandbox only: run the app with `NODE_USE_ENV_PROXY=1` (Node's fetch ignores HTTPS_PROXY
  otherwise) and the overrides in `.env.local`.

### Username claim (Phase 1, step 6)
- Rules live in `src/config/usernames.ts` (`usernameFormatError`, `normalizeUsername`, shared by
  browser and server); `src/lib/username.ts` adds the database checks (staff-reserved table,
  taken by another page). Usernames are lowercased as the creator types.
- `/onboarding` lets a signed-in user without a page claim a name (live availability check,
  then `claimUsername` creates the page). `/dashboard` sends users without a page there.
- Changing the name later: `nextUsernameChange()` enforces 30 days between changes. The first
  claim does not start the cooldown, so a creator can fix a typo once right away. The change
  form itself comes with the dashboard settings.

### Dashboard shell (Phase 1, step 7)
- Sections and tab bar are defined once in `src/config/dashboard.ts`. Layout:
  `src/app/[locale]/(site)/dashboard/layout.tsx` (header with bell, desktop sidebar, mobile
  bottom tab bar). The sidebar sits on the **start** side: right in Arabic, left in English.
- Every dashboard page gets the creator through `requireCreator()` (`src/lib/creator.ts`):
  signed out → `/login`, no page yet → `/onboarding`. Call it inside `<Suspense>`.
- Unbuilt sections render from `dashboard/[section]/page.tsx` (placeholder). Building a
  section = add its own folder (e.g. `dashboard/accounts/`), which takes priority.
- `usePathname()` may return the internal `/<locale>/...` path; nav strips it before matching.
- Bell unread dot is a TODO until the notifications table exists.

### Public creator page (Phase 2)
- Route: `src/app/[locale]/(creator)/[username]/` with its **own root layout**. `[locale]` is the
  visitor's language (site cookie, then device); `resolvePageLang()` picks it if the creator
  offers it, else the creator's primary language. `html lang/dir` follow that.
- Data: `getPublicPage(username)` in `src/lib/public-page.ts` (`"use cache"`, public fields only,
  tag `pageCacheTag(username)`, `cacheLife("hours")`). **Every edit to a creator's page data
  must call `revalidateTag(pageCacheTag(username))`** (Phase 3), also publish/unpublish,
  username change (old and new), plan changes and verification decisions.
- States: unknown/invalid name → creator not-found (invite to claim); unpublished or deleted →
  "not available" page with noindex; `/Ali` → 308 to `/ali`.
- Reserved names only block claiming; staff-made pages with reserved names still render.
- Demo page: `scripts/seed-demo.ts` creates `/demo` (reserved username) with sample data and
  assets in `public/demo/`. Local: `DATABASE_URL=<local> npx tsx scripts/seed-demo.ts`.
- Templates: `src/components/creator/theme.ts` turns template + accent + custom colors into CSS
  variables (`--page-bg`, `--page-surface` frosted card, `--page-solid` opaque box, `--page-soft`,
  `--page-text`, `--page-muted`, `--page-line`, `--page-accent`, `--page-on-accent`,
  `--page-grad-end` for `grad-num` big numbers, `--page-pill`, `--page-panel`). Colors, grid + glow
  background and layout follow the owner's design artifact "وصول — صفحة الصانع" (Oct 2026).
  Shared class strings live in `src/components/creator/styles.ts` (never export plain values from a
  "use client" file to server components: they arrive as references). Custom = 1-2 hex colors + light/dark, palette derived
  automatically. Contrast guards (`src/lib/color.ts`) keep text >= 7:1 and accent >= 4.5:1.
- Free/Pro limits live in `FREE_LIMITS` (`src/config/plans.ts`) and are applied in
  `getPublicPage`: Free pages fall back to White if their template isn't free, show at most
  6 past works, no verified badge, and always show the Wsool footer.
- Template previews (local only): `npx tsx scripts/seed-demo.ts t.sand sand`, or
  `... t.custom custom "#e63946,#1d3557:light"`, or add `free` as the last argument.
- Interactions (client components in `src/components/creator/`): `CountUp` (server renders the
  final number; animates once in view), `Marquee` (CSS, duplicated track, pauses on hover/focus,
  RTL-aware), `Modal` (native `<dialog>`), `PlatformCard` (audience pop-up), `WorkItem` (portrait
  video pop-up), `LicenseFile` (PDF/image pop-up). All respect `prefers-reduced-motion`.
- Videos: store MP4 (H.264) for Safari/iOS. The sandbox's test Chromium can't decode H.264, so
  video playback can only be checked there with a WebM copy.
- Video files (`.mp4/.webm/.mov/.m4v`) are assets: excluded in the proxy matcher and blocked as
  username endings.
- Link preview (OG) image: route handler `src/app/[locale]/(creator)/[username]/og/route.tsx`,
  public URL `/<username>/og` (not the `opengraph-image` file convention, whose URL would carry
  the internal `/<locale>` prefix). Metadata sets `og:image`/`twitter:image` and `metadataBase`
  from `siteOrigin()` (`NEXT_PUBLIC_SITE_URL`, else Netlify's `URL`). CDN-cached for a day.
- **Arabic in OG images**: next/og (Satori) mis-measures Arabic, breaking word spacing. Text is
  shaped with fontkit and drawn as SVG outlines (`src/lib/og-text.ts`, right-to-left with line
  wrapping). Fonts live in `assets/fonts/` (OFL) and are listed in `outputFileTracingIncludes`.
  Satori also crashes on `backgroundImage: undefined`; only pass it when set.

### Dashboard editing (Phase 3)
- Server actions live next to each section (e.g. `dashboard/edit/actions.ts`): `requireCreator()`,
  zod validation (`src/lib/validation/`), writes scoped to `page.id` from the session, then
  `updateTag(pageCacheTag(page.username))` so the public page shows the change immediately.
- **Forms**: React 19 resets uncontrolled fields after a form `action`, wiping what the creator
  typed when validation fails. Submit through `onSubmit` + `startTransition(() => action(data))`
  (see `ProfileForm`), or keep the inputs controlled.
- In bilingual forms the labels follow the dashboard language; only inputs get the content
  language's `dir`/`lang`.
- Publishing requires a name in the primary language (`setPublished`).
- **Uploads** (Supabase Storage, public bucket `media`, created by the `*_storage_media`
  migration): the browser asks `requestUpload(kind, type, size)` for a one-time signed URL; the
  server checks type/size (`src/config/uploads.ts`) and picks the path
  `media/<userId>/<kind>/<uuid>.<ext>`; the browser uploads straight to Supabase
  (`src/lib/upload-client.ts`, photos shrunk to JPEG first); then the section's save action
  checks `isOwnUploadedFile()` before storing `publicFileUrl(path)`. Replaced/removed files are
  deleted with `removeFiles()`. No storage write policies exist for anon/authenticated.
  SVG is never accepted (it can carry scripts).
- Sandbox test browsers can't reach Supabase directly; relay `*.supabase.co` requests through
  Node in the test (`page.route` + `fetch` with `NODE_USE_ENV_PROXY=1`).
- Tags (`saveTags`, per language, max 12, 18 chars) and licenses (`saveLicenses`, max 10) are
  saved as whole lists (delete + recreate). A license file must be a fresh upload in the
  creator's own folder or a file one of their licenses already had; unused files are deleted.
- **Netlify credits**: the owner upgraded to the **Personal plan** (Oct 2026; was Free = 300
  credits/month). Each production deploy costs credits (15 on Free), branch deploys are free. Production branch is `main` (updated only when the owner approves);
  `claude/new-session-r5ze7y` gets free branch deploys. Avoid needless production deploys.
- **Accounts & numbers** (`dashboard/accounts/`): `saveAccounts` updates accounts in place by id
  (rates/audience stay attached), creates new ones, deletes missing ones. Profile URLs are built
  on the server from platform + handle (`profileUrl()`, no free-form links); pasted links/`@` are
  cleaned by `normalizeHandle()`. Changing platform, handle or followers of a verified/in-review
  account resets it to `none`. Monthly views = one row per month (first day, UTC); empty hides
  the box. Audience = gender, fixed age groups, top 5 countries (ISO codes) and cities, each group
  <= 100%. Number inputs go through `digitsOnly()` (turns ٠-٩ into 0-9).
- **Brands & work** (`dashboard/work/`): `saveBrands` / `saveWorks` replace whole lists. Files use
  `{ path, url }` refs: a fresh upload in the creator's own folder, or a URL their rows already had;
  unused files are deleted. Logos are shrunk to WebP (keeps transparency); a new video gets a cover
  grabbed from its first second in the browser (`videoCover()`), replaceable by the creator. The
  dashboard keeps all works; Free pages show the first `FREE_LIMITS.portfolioItems` (warned in the UI).
  `hasPro()` in `src/config/plans.ts` is the one place that decides Pro vs Free.
- **Ad rates** (`dashboard/rates/`): `saveRateSettings` (upsert), `saveRates(accountId, rates)` per
  account (ownership checked), `saveBundles` (whole list; every account id must be the creator's,
  2+ platforms, 1+ rate). Without saved settings the public page uses defaults (shown, VAT included,
  SAR, or USD when the primary language is English). Prices accept Arabic digits and "٫"
  (`decimalInput()`), 2 decimals. The bundle editor previews "instead of X, save Y%" with
  `bundleComparison()`, the same function the public page uses.
- **Contact** (`dashboard/contact/`): `saveContact` stores WhatsApp as international digits
  (`normalizeWhatsapp()`: strips `+`/`00`/spaces, Arabic digits, Saudi `05…` → `9665…`; DB check
  `^[0-9]{8,15}$`) and the email lowercased; empty = hidden on the page. The public WhatsApp button
  opens the chat with a prefilled "found you on Wsool: wsool.link/<username>" message.
- **Appearance** (`dashboard/appearance/`): `saveAppearance` saves template, custom colors (kept
  when switching away from Custom), accent (null = template's), number font, hide branding. Free
  users can't save Pro templates or hide the footer (`FREE_LIMITS`, checked on the server; the UI
  locks them). Live preview = `Preview.tsx` using the same `pageTheme()` as the public page.
- **Trial end and the page cache**: `getPublicPage` shortens its cache life when a trial ends
  within the hour, so the page drops to Free within 5 minutes of the trial ending (5 min is the
  floor: shorter "use cache" lifetimes make Next.js treat the page as dynamic and fail).
  Admin/payment plan changes must still call `updateTag(pageCacheTag(username))`.

### Verification + admin (Phase 4)
- Migration `*_admin_verification`: `verification_requests` (snapshot of platform/handle/followers,
  one pending per account), `admin_members`, `audit_log`, `users.suspended_at`, private storage
  bucket `verification`. Creators can only SELECT their own requests; staff tables have RLS with
  no policies (server only).
- Upload kinds carry their bucket (`src/config/uploads.ts`); screenshots go to the private bucket
  and staff see them through 10-minute signed URLs (`signedVerificationUrl`).
- Creator side (`dashboard/verification/`): `submitVerification` / `cancelVerification`. A renewal
  keeps a still-valid verification until it's decided. Changing an account (Accounts section)
  cancels its pending request. Rules and statuses: `src/config/verification.ts`
  (`verificationDisplay()`: none, in_review, verified, expiring = last 7 days, expired, rejected).
- **Admin access** (`src/lib/admin.ts`): the owner = whoever signs in with `OWNER_EMAIL` (env var,
  comma-separated). Members are invited by email (Team page) and linked on first visit.
  `requireAdmin(permission?)` returns 404 to non-staff. Permissions/presets/sections:
  `src/config/admin.ts`. Only the owner sees Team and Activity log.
- **Every admin action calls `audit()`** inside the same transaction as the change.
- Decisions use `updateMany where status = pending` so two staff can't decide the same request.
- Suspended accounts: `requireCreator()` sends them to `/suspended`; `getPublicPage` hides the page.
- next-intl reads dots in keys as nesting: message keys for dotted ids (`user.suspend`,
  `verifications.view`) are nested objects.
- Emails/notifications for decisions and invitations are TODO(phase 6).

### Payments (Phase 5)
- Provider interface: `src/lib/payments/types.ts`; active provider from `PAYMENT_PROVIDER`
  (`src/lib/payments/index.ts`). Only `mock` exists (owner hasn't picked Moyasar/Tap): signed
  fake payment ids, tokens `mock_tok_ok` / `mock_tok_fail`. **Test providers are staff-only**
  (checkout refuses non-staff), so leaving `mock` on never gives Pro for free. Unset = payments off.
- Adding the real provider: implement `PaymentProvider` next to `mock.ts`, register it in
  `paymentProvider()`, set `PAYMENT_PROVIDER` + its keys. Nothing else changes.
- Flow (`src/lib/billing.ts`): `startCheckout` creates a pending invoice with the price from
  `PRICES` (`src/config/plans.ts`, VAT included, `vatPart()`), the browser pays, then
  `/billing/return` (route handler, full-page redirect target) and `/api/payments/webhook` both
  read the payment **from the provider** and call `settleCheckout` (checks invoice id, amount,
  currency; idempotent). The paid period starts after any trial/paid time left.
- Invoice numbers come from the `invoice_number_seq` sequence when paid (`WS-001001`...).
  Seller details for invoices: `src/config/site.ts` (owner must fill VAT/CR numbers).
- Hourly job: Netlify scheduled function `netlify/functions/billing-cron.mts` → POST
  `/api/cron/billing` with `CRON_SECRET`: renewals with the saved token, retries after 1 and 3
  days (past_due keeps Pro), then Free; ends cancelled plans and trials; purges accounts deleted
  more than 30 days ago (`src/lib/account-deletion.ts`).
- Route handlers and jobs can't call `updateTag`: use `expirePage(username)` (revalidateTag with
  expire 0). Server actions keep `updateTag(pageCacheTag(...))`.
- Account deletion lives on the Subscription page: JSON export (`/api/account/export`, no payment
  token), type username → `pages.deleted_at` (page hidden, auto-renew off), undo within 30 days.
- `subscriptions.payment_token` is not readable through the Data API (column grants).
- Billing emails (receipt, renewal, failed payment, trial reminders) are TODO(phase 6).

### Launch pieces (Phase 6)
- **Analytics**: tables `page_views` / `contact_clicks` (migration `*_analytics`, RLS read-own).
  The public page's `Tracker` (client) sends a view beacon and taps on elements with
  `data-track="whatsapp|email|social:<platform>|work:<platform>"` to `/api/track`. No IP/UA is
  stored: a daily salted `visitorHash` counts unique visitors; bots, the owner's own visits and
  more than 20 events per visitor/page/day are ignored. Country from `cf-ipcountry` / `x-nf-geo`.
  Report: `src/lib/analytics-report.ts`; dashboard `dashboard/analytics/` (Pro only, 7/30/90 days,
  bar chart with hover + table view). Data is collected for Free pages too.
- **Notifications & emails**: `notify(userId, type, data, { dedupeKey })` (`src/lib/notify.ts`) adds a
  row to `notifications` (the bell) and emails it in the creator's page language through Resend
  (`src/lib/email/send.ts`, `RESEND_API_KEY`, from `noreply@mail.wsool.link`; without the key it
  only logs `[email:dry-run]`). Types and texts: `NOTIFICATIONS` + `messages/*.json` → `Notify`.
  Reminder types respect `notification_settings.email_reminders`. Layout: `src/lib/email/layout.ts`
  (table-based, RTL). Preview all emails: `npx tsx --require ./scripts/no-server-only.cjs
  scripts/preview-emails.ts <dir>`. `notify` uses `use-intl/core` (works outside requests).
- Reminders run in the hourly job (`src/lib/reminders.ts`): trial day 10/13, yearly renewal 7 days
  before, verification expiring (7 days) and expired (status → none, page cache expired).
- Bell dot: `UnreadDot` (server, in Suspense in each page header); notifications are marked read
  per item or with "mark all as read" (`markRead` / `markAllRead`), not on opening the page. All dashboard sections are built (no placeholder route).
- **PDF media kit**: `/<username>/pdf` (route handler, Pro pages only, `?lang=` one of the page's
  languages, `&download` for attachment) → `buildMediaKit()` (`src/lib/pdf/media-kit.ts`, pdf-lib,
  A4, template colors, identity, totals, platforms, logos, rates if `showInPdf`, contact + QR
  code). Text is drawn as outlines with `textPaths()` (`src/lib/og-text.ts`); characters missing
  from the Arabic subset font (".", ":") fall back to the Latin font per run, and ❤ is drawn as a
  path. WebP logos are converted with sharp when available, else the brand name is shown.
  Dashboard home has the download buttons.
- **Finance** (`admin/finance/`, permission `revenue.view`): `financeReport(months)`
  (`src/lib/finance.ts`) — revenue from paid invoices without VAT, in SAR (USD × 3.75), expenses
  (table `expenses`, one-off/monthly/yearly with optional end date), P&L per month, MRR (yearly
  invoices spread over 12 months while their period covers the month), customers, churn (3-month
  average), ARPU, LTV = ARPU / churn, CAC = marketing spend / new paying customers (3 months).
  `FinanceView` renders it for the admin page and investor links.
- **Investor links** (owner only): table `investor_links` stores only the token hash, chosen
  sections (`INVESTOR_SECTIONS`), period, expiry, optional scrypt password. Public page
  `/invest/<token>` (noindex, no personal data, Print/PDF); password unlock = httpOnly cookie
  with an HMAC of the link id. Every expense/link change is in the audit log.
- **Marketing site** (home, pricing, 404, hidden page, 500) is generated from the owner's design:
  `design/marketing/*.dc.html` (desktop + mobile, ar + en) → `python3 scripts/design-to-tsx.py` →
  `src/components/marketing/generated/` (views, texts, CSS; never edit by hand). Design links
  (`LINKS`), buttons (`BUTTONS`) and holes (`v.*`) are wired in the script and in
  `useMarketing.ts`; computed texts (claim messages, FAQ, prices from `PRICES`) in `content.ts`.
  Page wrappers: `src/components/marketing/Pages.tsx`. Hand fixes go in `marketing.css`.
  Owner wording (Oct 2026): "ملفك الإعلامي" instead of "ميديا كِت", "تقنع أي شركة", paid plan badge "الاحترافية".
  Text changes are made in the `design/marketing/*.dc.html` files, then the script is re-run.
- Home "claim your link": live check (`checkLink`), then cookie `wsool_claim` → `/login`;
  onboarding pre-fills that name.
- **Newsletter** (`src/lib/newsletter.ts`, table `newsletter_subscribers`): double opt-in, HMAC
  links (no stored token) for `/newsletter/confirm` and `/newsletter/unsubscribe`, one-click
  `List-Unsubscribe` POST at `/api/newsletter/unsubscribe`, one confirmation per address per 10 min.
  Admin overview shows the confirmed count; CSV at `/api/admin/newsletter` (`users.view`, audited).
- **Sending the newsletter** (`admin/newsletter/`, editor at `/admin/newsletter/edit?id=`; no server-action
  redirects (they showed a blank page on Netlify): actions return data and the client navigates;
  permission `newsletter.send`): tables
  `newsletter_campaigns` (subject/body/button per language, status draft → sending → sent, counts) and
  `newsletter_deliveries` (one row per campaign × subscriber, written **before** sending, so a resumed
  or double-clicked send never emails anyone twice). Each subscriber gets their language's version, or
  the other one if theirs is empty (`versionFor`). Body = plain text, blank line = new paragraph, links
  become clickable (`rich()` in `src/lib/email/layout.ts`). The editor previews the real email, sends
  a `[TEST]` to the signed-in staff member, then the browser calls `sendBatches` in a loop (about 300
  emails per call through Resend's batch API, `sendBatch()` in `src/lib/email/send.ts`) with a progress
  bar; an interrupted send shows "Resume", failed batches can be retried. Every email has the
  subscriber's own unsubscribe link + one-click `List-Unsubscribe`. Logic: `src/lib/newsletter-campaign.ts`.
  Local tests can point `RESEND_API_BASE` at a fake server.
- **Admin design pass**: `AdminHeader` (title, subtitle, creator search → `/admin/users?q=`; the
  search part is in its own `<Suspense>` because it reads the session). Sidebar badge = pending
  account + license requests. Overview: 6 tiles, 30-day signups, navy queue card, funnel, activity.
  Users: table with filters `?f=all|paid|trial|free` (+ counts) and `?q=` (name, username, email).
  Verification queue: master/detail (`?id=`), only the open request gets a signed screenshot URL;
  approve/reject side by side, reject asks for the reason. Team: list + detail, permissions grouped
  by `PERMISSION_GROUPS` (`src/config/admin.ts`). Invoices CSV: `/api/admin/invoices` (`revenue.view`,
  audited); CSV helper `src/lib/csv.ts`. Audit entries are shown as sentences by `auditSentences()`
  (`src/lib/audit-text.ts`, messages `Admin.sentence.<action>`): **every new audit action needs a
  sentence in both languages**.
- **Terms / Privacy** (`/terms`, `/privacy`): text in `src/content/legal.ts` (from the owner's doc,
  adjusted to the real stack), rendered by `src/components/legal/LegalPage.tsx`. Blanks (entity,
  registration, payment gateway, effective date) come from `LEGAL` in `src/config/site.ts`; empty
  ones show as [placeholders]. Login shows "by continuing you agree…" with both links.
  Update the text whenever a provider or data practice changes.

### Design pass (Oct 2026, owner decisions)
- The built screens are being matched to the owner's design artifacts ("صفحة الصانع", "لوحة التحكم",
  "لوحة الإدارة"), in that order. Where a design conflicts with this file, this file wins (44px touch
  targets, sticky desktop sidebar, uploaded videos, server-built profile links, SAR finance, link expiry).
- Monthly views stay **before** the platform cards (owner).
- Buttons: pill shape (section 4), primary color per the dashboard design (owner left it to Claude).
- Owner said yes to these design-only features: license verification, a "why are you cancelling?"
  survey, AED + KWD rate currencies, a **single** ad-rate bundle, preset accent colors (Custom
  template keeps its free color pickers).
- Creator page: language switch sets the `NEXT_LOCALE` cookie and reloads; share uses
  `navigator.share` or copies the link (`PageActions.tsx`).
- Dashboard shell (design pass): `app-backdrop` background, frosted `Card` (radius 18), blue primary
  buttons (still pills), 48px inputs, `Switch` (`src/components/ui/Switch.tsx`, role=switch), and a
  `PageHeader` per page (title + subtitle from `DashboardHeader` messages, bell, language pill).
  Sections with one save for everything use `SaveBar` (fixed above the tab bar on phones).
- Ad rates: one bundle per page (`MAX_BUNDLES = 1`; the public page shows only the first), rate
  currencies SAR/USD/AED/KWD (`RateCurrency` enum, separate from the subscription `Currency`).
- Accent color: presets only (`ACCENT_SWATCHES`, light + dark variant chosen by `pageTheme`).
- Cancelling auto-renew can carry a reason (`CANCEL_REASONS`, table `cancellation_feedback`).
- Licenses can be verified: `licenses.verification_status` (+ reason, dates); creators send from the
  Verification page, staff decide in the queue's Licenses tab (`decideLicense`, audited, notified);
  saving the license list keeps the status of unchanged licenses.
- Contact: `pages.whatsapp_visible` / `email_visible` hide a channel without deleting it.
