# Quotes page - snapshot before the "leaner" redesign (17 Jun 2026)

These are copies of the request-detail ("quotes") page as it was **before** we
restructured it into the leaner, state-aware layout (see
`mockups/quotes-page.html`, the "Current (today)" view).

Kept here as a quick eyeball reference / safety net. The real, authoritative
history is git - these `.bak` files are just convenience.

## What's here
| Backup file | Restores to |
|---|---|
| `RequestDetailView.tsx.bak` | `src/components/requests/RequestDetailView.tsx` |
| `account-detail.css.bak` | `src/styles/account-detail.css` |
| `requests-id-page.tsx.bak` | `src/app/requests/[id]/page.tsx` |

The `.bak` extension is deliberate so TypeScript / Next never compile these
copies.

## How to revert
Copy a file back to its original path and drop the `.bak`, e.g.:

```bash
cp "mockups/previous-states/quotes-page-2026-06-17/RequestDetailView.tsx.bak" \
   "src/components/requests/RequestDetailView.tsx"
```

Or, cleaner, use git to restore the same files to this commit.

## State captured
Includes everything up to and including: the "Accept quote" model, booking
captured at close (`finishRequest`), Title-Cased titles, smaller reference
images, meta-row dividers, and Dashboard-first nav.
