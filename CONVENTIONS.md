# Build Conventions (read me before building UI)

Portable frontend / UX / product conventions. Drop this file into any project and
have the assistant read it first, then build to these standards from the start so
they don't have to be retrofitted later. Not a web page - it lives at the repo
root, is never served or indexed, and is for the build assistant + developers.

To make the assistant auto-read it: copy this file to the project root and either
rename it `CLAUDE.md`, add a line `See CONVENTIONS.md` to an existing `CLAUDE.md`,
or paste the key rules into `~/.claude/CLAUDE.md` for every project globally.

---

## 1. Text casing

**Editorial Title Case for all UI chrome.** Buttons, links-styled-as-buttons,
nav bars, dropdown menus, tabs, page titles (`<h1>`), and card/section/panel
headings use editorial Title Case:

- Capitalise the first and last word always, and every "major" word.
- Keep small joining words lowercase **when they're not first/last**: `a, an,
  the, and, as, at, but, by, for, from, in, into, nor, of, on, onto, or, per,
  the, to, via, vs, with`.
- Examples: "Post a Tattoo Request", "Sign Up as an Artist", "Get in Touch",
  "Log In", "My Requests", "Account Settings", "Switch to Customer Mode".
- NOT "Post A Tattoo Request" (CSS `text-transform: capitalize` is wrong - it
  capitalises small words). NOT "My requests" (sentence case).

**Sentence case (NOT title case) for:** body copy, descriptions/subtitles,
form help text, toasts/inline messages, empty states, marketing hero headlines
("Get free quotes from tattoo artists near you"), SEO landing-page `<h1>`s
("Find tattoo artists in London" reads better naturally and is better for
search), blog/guide article titles, and greetings ("Hi {name}").

**Implementation (do it at the source, the right way):**
- Provide one helper, e.g. `toTitleCase(str)`, implementing the rules above.
  Keep a separate naive `titleCase` for machine data if you need it; don't
  conflate them.
- Apply it at **render** for data-driven labels: nav link arrays, a shared
  `SubmitButton` (title-case its string children), menu item arrays. This keeps
  the **source text and `aria-label` natural** for screen readers + SEO, and
  makes every future label correct automatically.
- For hardcoded one-off labels, just write them in correct Title Case.
- Never use CSS `text-transform: capitalize` for this (it can't lowercase small
  words and it transforms acronyms).

## 2. Navigation & menus

- **One menu per mobile header.** Do not ship two separate disclosure menus (a
  nav hamburger AND an avatar/account dropdown) on mobile - consolidate into a
  single hamburger that holds nav links + account links + sign-out. Keep the
  notification bell (and other high-frequency quick actions) as their own icon,
  not inside the menu.
- Mobile header layout: logo on the far left; quick-action icon(s) then the
  hamburger on the far right.
- Below the nav breakpoint, hide the inline links and show the hamburger; above
  it, show inline links and hide the hamburger. Desktop should be unchanged.
- Don't duplicate the same header markup across many pages - extract a shared
  nav component and pass the links in as data.

## 3. Buttons & CTAs

- Full-width buttons must center their label (`text-align: center`); an
  `inline-block`/`inline-flex` button stretched to full width otherwise sits
  left-aligned.
- Keep a single shared button component (or a small set of button classes) so
  styling + the title-casing helper are applied in one place.

## 4. Layout & spacing

- Use **one** spacing mechanism between stacked sections - either a flex/grid
  `gap` OR per-item margins, not both. Combining a container `gap` with child
  `margin-bottom` produces uneven gaps (the item with the margin gets `gap +
  margin`). Symptom: "the space under one card is bigger than the others."
- Small stat/metric tiles should sit side-by-side on mobile (a 2-up grid), not
  stack into tall single columns that waste vertical space.

## 5. Images

- Use the framework's optimised image component (e.g. Next.js `<Image>`) for
  content/portfolio imagery on public/SEO pages: it resizes, serves modern
  formats, lazy-loads, and reserves space (no layout shift).
- Remote image hosts must be allowlisted in config (e.g.
  `images.remotePatterns`) or the optimiser throws.
- Keep raw `<img>` only for: SVGs, transient blob-URL upload previews, and
  signed-URL internal images where optimisation adds little.

## 6. Accessibility

- Casing/transform changes are **presentation only** - never mangle the real
  text that assistive tech reads. Title-case for display; keep the source/`alt`/
  `aria-label` natural.
- Every form control has a real `<label>` (placeholder is not a label).
- Toggles/disclosures set `aria-expanded`; custom tabs set `aria-selected`;
  icon-only buttons have `aria-label`.

## 7. SEO

- Unique `<title>` + meta description + canonical per page; `metadataBase` set.
- A default social share image (1200x630) + `twitter: summary_large_image`.
- Sitemap generated from the DB for dynamic URLs; exclude private/dashboard
  routes; `noindex` thin/empty programmatic pages (and keep them out of the
  sitemap) to avoid doorway-page penalties.
- Filtered/faceted list URLs: `noindex, follow` with a stable canonical to the
  unfiltered page.

## 8. Email

- Marketing-style emails (digests, reminders, newsletters) need a one-click
  unsubscribe: a `List-Unsubscribe` header + a footer link, and they must honour
  the user's stored notification preferences. Transactional emails should honour
  prefs too where it makes sense.
- HTML-escape any user-set content (names, titles) interpolated into email HTML.
- Centralise the site base URL in one module with a production-safe fallback; no
  `localhost` fallbacks that can leak into prod emails/canonicals.

## 9. Security / data

- Re-check auth (and any suspension/ban flag) inside **every mutating server
  action** - middleware that only guards navigation is not enough; client-side
  inserts are governed by row-level security, so enforce there too.
- Cron/webhook endpoints fail **closed**: refuse (401) when the shared secret is
  unset or wrong, never run unauthenticated.
- Provide account self-service: change email (with re-confirmation), change
  password, delete account, and a GDPR "download my data" export.

## 10. Copy style

- **No em dashes (`-`/`—`) anywhere** - in UI copy, code, comments, commits, or
  docs. Use a hyphen, a colon, or rephrase.
- Be honest in product copy: don't promise behaviour that isn't built (e.g.
  "artists will be notified as they join" only if a re-match actually runs).
- Routine states (rate caps, validation) show an inline message, never the
  generic crash/error page.

---

## How to apply on a new project
1. Copy this file to the repo root (optionally as `CLAUDE.md`).
2. Add the `toTitleCase` helper and wire it into the nav components + shared
   `SubmitButton` on day one.
3. Build all chrome (nav, buttons, titles, headings) in editorial Title Case
   from the start - don't rely on a later sweep.
