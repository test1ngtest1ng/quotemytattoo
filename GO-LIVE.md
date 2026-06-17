# Go-live checklist — Quote My Tattoo

Operational steps required before / at production launch on Vercel
(quotemytattoo.co.uk). These are **ops tasks** (dashboards, DNS, secrets) — the
code is handled separately. Tick each off before announcing the site.

## Supabase (production project)
- [ ] Run **all migrations through 0024** in the prod SQL editor (incl. 0018 notifications, 0019 booked_by, 0020 target_artist, 0021 last_active, 0022 review_images, 0023 suspended-message RLS, 0024 publish_on_verify for the guest-first request flow).
- [ ] Confirm **RLS is enabled** on every table.
- [ ] **Auth → Email Templates:** switch the reset + confirm templates to the **token_hash** format, otherwise reset/confirm links "expire immediately".
- [ ] **Auth → URL config:** set **Site URL** + redirect allow-list to the production domain (`https://quotemytattoo.co.uk`).
- [ ] Create the **storage buckets** if migrations didn't (the 0022 SQL creates `review-images`; `chat-images`, `request-images`, `portfolio` from earlier migrations). Confirm all exist with the right public/private flag.

## Resend (email)
- [ ] **Verify the `quotemytattoo.co.uk` domain** (add the DNS records Resend gives you).
- [ ] Set **`EMAIL_FROM`** to a verified address (e.g. `Quote My Tattoo <hello@quotemytattoo.co.uk>`) so mail isn't from `onboarding@resend.dev`.

## Vercel (project settings)
- [ ] Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://quotemytattoo.co.uk`, `RESEND_API_KEY`, `EMAIL_FROM`, **`CRON_SECRET`** (a strong random string).
- [ ] Confirm the boot-time env warning (`src/lib/env.ts`) logs nothing missing in the deploy logs.
- [ ] Confirm the **3 crons** are registered and run (they fail closed with 401 if `CRON_SECRET` is unset): `expire-requests` (daily 3am), `review-prompts` (daily 10am), `lead-digest` (Mon 9am).

## DNS
- [ ] Point `quotemytattoo.co.uk` (apex + `www`) at Vercel.

## Security
- [ ] Change the temporary admin password for `info@inspiredstudios.co.uk`.

## Post-deploy smoke tests (on the live domain)
- [ ] Sign up + confirm email → lands on the right dashboard.
- [ ] Password reset email → link works (not "expired").
- [ ] Post a request → matched artists get the "new lead" email.
- [ ] Send a quote → customer gets the in-app notification + email.
- [ ] Accept a quote → contact reveal + notification + email on both sides.
- [ ] Mark booked → request closes, verified-review unlocks.
- [ ] **Leave a review with a photo → it appears on the artist's public profile.** (review-photo upload round-trip — not yet exercised in dev; needs a real completed connection.)
- [ ] Directory search by name + location/radius returns sensible results.
- [ ] Check `/sitemap.xml` and `/robots.txt` resolve and point at the prod domain.

## Code fixes from the pre-launch review (2026-06-17)
Findings from a 3-angle review (production-readiness, SEO, feature/UX). No hard
blockers — the app is production-ready — but these are worth doing before / soon
after launch. Deferred Phase-2 items are excluded.

### Strongly recommended before launch
- [x] **Email opt-out (UK PECR / legal).** DONE. Tokenized one-click unsubscribe (`src/lib/unsubscribe.ts` + `/api/unsubscribe`) with `List-Unsubscribe` + `List-Unsubscribe-Post` headers and footer links on the digest + review-prompt emails. All seven senders now honor `notification_settings` via `emailAllowed` (`src/lib/notification-prefs.ts`). Account toggles rebuilt to the real email categories (email-only, SMS removed, audience-aware), `updateNotifications` now merges instead of overwriting.
- [x] **Open-request cap shouldn't crash the wizard.** DONE. The 10-open cap + insert failure now redirect to `/new-request?error=` with an inline banner instead of throwing to the crash page.
- [x] **Suspended-user action gating.** DONE for content actions: `requireActiveUser()` re-checks `app_metadata.suspended` in createRequest, sendQuote, shareContact, leaveReview, artistReplyToReview. REMAINING: chat message sends are a client-side insert (RLS) — fully blocking a suspended user from messaging needs an RLS policy change (a migration checking a suspended flag); proxy.ts still bounces them on navigation.
- [x] **Add `loading.tsx` skeletons** — DONE for `/dashboard`, `/artist/leads`, `/requests/[id]`, `/my-requests`, `/artists` (shared `PageSkeleton`).
- [x] **SEO quick wins** — DONE. Default `next/og` OG image (`opengraph-image.tsx`) + Twitter `summary_large_image`; sitemap now lists only populated city×style combos; empty combos render `noindex` (both verified in browser).

### Remaining from this review
- [x] **Chat-message suspension:** DONE — migration **0023_suspended_message_block.sql** adds a `suspended` check to the messages-insert RLS policy. **User must run 0023.**
- [ ] **Marketing PECR note:** `newsletter_email`/`offers_email` toggles exist but have no sender yet. When a newsletter/offers sender is built, treat those as **opt-IN** (require an explicit `true`), not the default-on `emailAllowed` behavior used for transactional categories.

### Future improvements (deferred by decision)
- [ ] **User-to-user blocking** (safety): reporting exists but a harassed user can't stop the other party messaging. **Deferred on purpose** — revisit only if abuse appears; reporting + admin moderation are the current stopgap.

### Worth doing
- [x] **Zero-match requests are orphaned** — DONE: `matchOpenRequestsToArtist` re-runs matching when an artist first completes their profile (in `createArtistProfile`, one-time), surfacing missed open requests with one summary notification + email.
- [x] **Change-email self-service** — DONE: `changeEmail` action (auth.updateUser + confirm link) + editable form in the manage tab; `profiles.email` self-heals on account load after confirmation.
- [x] **Thin city×style pages** — DONE: sitemap lists only populated combos; empty combos render `noindex` (verified).
- [x] **GDPR data export** — DONE: `/api/export/me` returns a JSON attachment of all the user's data; "Download my data" link in the manage tab (verified 17-section JSON).
- [x] **Customer "decline a quote"** — DONE: `declineQuote`/`undeclineQuote`; declined quotes grey out + drop from the comparison. Note: **silent** (artist is NOT emailed — decline emails are demoralising/noisy).
- [x] **Pre-expiry email** — DONE: `/api/cron/expiry-reminder` (Mon-Sun 8am) emails + notifies the customer ~3 days before a request auto-closes. **Needs `CRON_SECRET`.**

### Polish
- [~] Migrate images to `next/image` — DONE for public portfolio imagery (artist-profile gallery + review thumbnails; `next.config.ts` allowlists the Supabase host; verified images serve via `/_next/image`). Still raw `<img>` on internal app pages (leads/chat/requests — signed URLs, not SEO) and the "Image:" placeholders on guides/city pages.
- [x] Studio profile JSON-LD: `BreadcrumbList` added (DONE). (review/aggregateRating still optional.)
- [x] Expand `robots.ts` disallow — DONE (`/admin`, `/account`, `/saved`, `/my-requests`, `/requests`, `/artist/`, `/studio/`; trailing slashes keep public `/artists` + `/studios` crawlable).
- [x] HTML-escape user-set names in email HTML — DONE (lead/quote/digest/review-prompt bodies).
- [ ] a11y: label the chat input; add `aria-selected`/`aria-pressed` to custom tab/role=button controls.
- [ ] Confirm or remove possibly-dead code: `confirmBooked` (connections.ts). (`updateNotifications` key mismatch already fixed.)
- [ ] Pre-existing lint: `Date.now()` in render bodies trips `react-hooks/purity` on studio + city/style pages (works fine; not build-breaking — same pattern across pages).

## Notes
- Billing is intentionally **off** (free for everyone). `src/lib/pricing.ts` `billingLive=false` — no Stripe yet.
- Anti-spam rate limiting is **best-effort in-memory** (per serverless instance) — effectively a no-op across Vercel instances. The real defenses are the honeypot, the timing check, and the DB-backed "10 open requests" cap. Revisit with a DB-backed limiter or Turnstile if abuse appears.
