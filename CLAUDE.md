@AGENTS.md

# Quote My Tattoo

A tattoo **marketplace** (MyBuilder-style): customers post tattoo requests, matched artists are
notified and respond with quotes + chat, customers compare profiles/reviews and hire. Long-term it
becomes an "operating system for tattoo studios" (CRM, bookings, payments, splits, compliance) - but
those are **later phases and explicitly out of the current MVP**.

Full plan: `~/.claude/plans/users-mohammedrahman-downloads-quotemyt-indexed-comet.md`.

## Stack
- **Next.js 16** (App Router, TypeScript) + **Tailwind v4**, deployed on **Vercel**.
- **Supabase** (Postgres + Auth + Storage + Realtime + RLS) - London/EU region. Clients in
  `src/lib/supabase/` (`client.ts` browser, `server.ts` server, `middleware.ts` session refresh).
- **Resend** for transactional email (lead/quote/message notifications).
- **Stripe** is later - schema is billing-ready but no payments now.

## Key product rules
- **Free for everyone at launch**, but billing-ready. **Founding Member** programme: first 100
  artists + first 100 studios, or until **31 Dec 2026** (whichever first) → lifetime 50% off.
- **Reviews** at launch (trust layer).
- **Matched + notified** leads: match on **style overlap AND location** (studio location +
  optional travel areas - destination-first, not travel-radius).
- Accounts: customers, artists, **basic studios** (studios invite artists by email).
- Artist onboarding (MyBuilder-adapted): account → styles (≤5) → soft/manual ID → self-declared
  credential **badges** (Insured / Licensed / Hygiene / First-aid) → profile (bio, ≤10 portfolio
  images, IG+TikTok links + manual embeds) → Founding Member step. **No payment step.**
- **Lead gating**: artists can respond only once their profile is complete.
- Social: links + manual post embeds only (no auto-feeds at launch - saves storage).

## Conventions
- Heed `AGENTS.md`: this is Next.js 16 - check `node_modules/next/dist/docs/` before using APIs that
  may have changed.
- Porting the `design-reference/` mockups: convert styling to **Tailwind**, rewrite markup to **SEO
  best practice** (semantic tags, single h1, metadata, alt text, JSON-LD), optimise images with
  `next/image`. Preserve the visual design.
- SEO is first-class: SSG for static keyword pages; SSR/ISR for DB-driven pages that must rank
  (artist profiles, city pages); sitemap + robots + structured data.
- RLS on every table from day one.

## Status
Foundation in progress. Needs the user to create the Supabase + Resend accounts and fill
`.env.local` (see `SUPABASE_SETUP.md`).
