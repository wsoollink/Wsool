# Wsool (وصول)

Media-kit platform for content creators. See `CLAUDE.md` for product decisions.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Then open http://localhost:3000

## Deploy

Netlify builds the production branch on every push (`netlify.toml`): it applies pending
Prisma migrations to Supabase, then builds Next.js with Netlify's adapter. Environment
variables live in Netlify (Project configuration → Environment variables); see `.env.example`.
