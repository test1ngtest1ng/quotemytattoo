# Setup - what I need from you (one-time)

The app is built to run on **Supabase** (database/login/storage) and **Resend** (emails). Both have
free tiers. You create the accounts, copy a few keys into `.env.local`, and I handle the rest.
Takes ~10-15 minutes.

---

## 1. Supabase (database, login, file storage)

1. Go to **https://supabase.com** → sign up (free).
2. Click **New project**.
   - **Name:** `quotemytattoo`
   - **Database password:** generate a strong one and **save it somewhere safe**.
   - **Region:** choose **London (eu-west-2)** - important for UK/GDPR.
   - Plan: **Free**.
3. Wait ~2 minutes for it to provision.
4. Go to **Project Settings** (gear icon) → **API**. Copy these three values:
   - **Project URL** → goes in `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click reveal) → goes in `SUPABASE_SERVICE_ROLE_KEY` *(keep secret)*

---

## 2. Resend (sending emails)

1. Go to **https://resend.com** → sign up (free).
2. **API Keys** → **Create API Key** → copy it → goes in `RESEND_API_KEY`.
3. For now you can leave `EMAIL_FROM` as is - to send from your own domain later, add and verify it
   under **Domains** in Resend. (Until a domain is verified, Resend can only send test emails to your
   own address - that's fine for development.)

---

## 3. Put the keys in the project

1. In the project folder, copy `.env.local.example` to `.env.local`.
2. Paste in the values from steps 1 and 2.
3. Tell me when it's done - I'll run the database setup (migrations) and we'll test the full flow.

> `.env.local` is git-ignored and never committed. The `service_role` and `RESEND_API_KEY` are
> secret - don't share them publicly.

---

## 4. Later (not needed yet)
- **Vercel** (hosting/deploy) - we'll connect this when we're ready to put it online.
- **Stripe** - only when we introduce paid memberships.
