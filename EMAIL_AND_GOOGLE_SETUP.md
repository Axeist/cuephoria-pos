# Email (Resend) + Google Sign-in — Setup Guide

> Written for non-developers. You won't need to touch code. Just follow the
> steps in order. Each section ends with a **✅ What success looks like**
> checklist so you know when to move on.

---

## 0. Before you start — 5 minute safety check

1. **Rotate the Resend API key you pasted in chat.** It's exposed and must
   be treated as compromised.
   - Go to <https://resend.com/api-keys>
   - Delete the old key (click the `…` menu → **Delete**)
   - Click **Create API Key** → name it `Cuetronix production`
   - Copy the new key — it starts with `re_…` — and keep it somewhere safe
     for the next step.

2. **Make sure you have access to:**
   - Your Vercel project dashboard (that's where env vars live)
   - Your Supabase project dashboard (to run the migration)
   - A Google account you can use to create an OAuth app

✅ **What success looks like:** Old Resend key deleted, new key copied.

---

## 1. Run the database migration

This adds the columns and tables the app needs for email + Google.

1. Open **Supabase → SQL Editor → New query**.
2. Open the file `supabase/migrations/20260504100000_slice14_email_and_google.sql`
   in your repo. Copy everything.
3. Paste it into the Supabase SQL editor and click **Run**.
4. You should see `Success. No rows returned`.

✅ **What success looks like:** No error. Then run this quick sanity check:

```sql
select column_name from information_schema.columns
 where table_schema='public' and table_name='admin_users'
   and column_name in ('email','google_sub','email_verified_at');
```

You should see all three column names listed.

---

## 2. Set up Resend (sends emails)

### 2a. Verify a sender domain

You can only send from a domain you control. If you don't have one yet,
Resend lets you test with `onboarding@resend.dev`, but every email will
have a "sent via Resend" notice and they'll go to spam. **Strongly
recommended to verify your own domain once live.**

1. In Resend, click **Domains → Add Domain**.
2. Enter something like `cuetronix.app` (or whatever domain you own).
3. Resend will show you DNS records (MX / TXT / DKIM). Copy each one into
   your DNS provider (GoDaddy, Cloudflare, Namecheap — wherever your
   domain lives). Click **Verify DNS records** in Resend when done. This
   usually takes 5–30 minutes.

### 2b. Pick your "from" address

Once the domain is green-checked, decide the email you want users to
receive messages from. Example: `hello@cuetronix.app` or
`noreply@cuetronix.app`. The format we need is:

```
Cuetronix <hello@cuetronix.app>
```

(display name first, then the email in angle brackets)

### 2c. Add env vars to Vercel

In Vercel → your project → **Settings → Environment Variables**, add
three new entries. For **Environment** select **Production, Preview, and
Development** (all three) unless you have a reason otherwise.

| Name              | Value                                    |
| ----------------- | ---------------------------------------- |
| `RESEND_API_KEY`  | the new `re_…` key from step 0           |
| `RESEND_FROM`     | `Cuetronix <hello@yourdomain.com>`       |
| `APP_BASE_URL`    | `https://your-live-domain.com` (no trailing slash) |

Optional but recommended:

| Name              | Value                                    |
| ----------------- | ---------------------------------------- |
| `RESEND_REPLY_TO` | `support@yourdomain.com` (where replies go) |

Click **Save** on each, then redeploy (Vercel → **Deployments → ⋯ →
Redeploy**).

✅ **What success looks like:** Create a test workspace at
`https://your-live-domain.com/signup` with a real personal email. You
should receive a "Welcome to Cuetronix" email within 30 seconds. If you
don't:

- Check Resend → **Logs** — any entry will tell you exactly why.
- Check your spam folder.
- Most common issue: `RESEND_FROM` uses a domain that isn't verified yet.

---

## 3. Set up Google Sign-in

This takes ~10 minutes the first time.

### 3a. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/>.
2. Top-left dropdown → **New Project** → name it `Cuetronix` → **Create**.
3. Make sure the new project is selected in the top dropdown.

### 3b. Configure the OAuth consent screen

1. Left menu → **APIs & Services → OAuth consent screen**.
2. Choose **External** → **Create**.
3. Fill in:
   - App name: `Cuetronix`
   - User support email: your email
   - App logo: (optional — your Cuetronix logo)
   - App domain → Application home page: `https://your-live-domain.com`
   - App domain → Application privacy policy: `https://your-live-domain.com/privacy`
   - App domain → Application terms of service: `https://your-live-domain.com/terms`
   - Authorized domains: add your domain (e.g. `cuetronix.app`)
   - Developer contact email: your email
4. **Save and continue**.
5. **Scopes screen** → click **Add or remove scopes** → check the three
   basic ones: `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile`. **Update** → **Save and continue**.
6. **Test users** screen → add your own Gmail as a test user, then
   **Save and continue**.
7. Back to summary → click **Publish app** when you're ready for real
   customers. You can leave it in "Testing" mode until then — it'll only
   work for the test users you added.

### 3c. Create OAuth credentials

1. Left menu → **APIs & Services → Credentials → Create credentials →
   OAuth client ID**.
2. Application type: **Web application**.
3. Name: `Cuetronix Web`.
4. **Authorized JavaScript origins** → add:
   - `https://your-live-domain.com`
   - `http://localhost:5173` (for local dev — skip if you never run locally)
5. **Authorized redirect URIs** → add:
   - `https://your-live-domain.com/api/auth/google/callback`
   - `http://localhost:5173/api/auth/google/callback` (local dev only)
6. Click **Create**. A popup shows your **Client ID** and **Client
   secret**. Copy both.

### 3d. Add Google env vars to Vercel

Back in Vercel → **Settings → Environment Variables**:

| Name                          | Value                                           |
| ----------------------------- | ----------------------------------------------- |
| `GOOGLE_OAUTH_CLIENT_ID`      | the Client ID from step 3c (ends in `.apps.googleusercontent.com`) |
| `GOOGLE_OAUTH_CLIENT_SECRET`  | the Client secret from step 3c                  |
| `GOOGLE_OAUTH_REDIRECT_URI`   | `https://your-live-domain.com/api/auth/google/callback` |

Save each, then **redeploy** the project.

✅ **What success looks like:**

1. Visit `https://your-live-domain.com/signup`.
2. Click **Continue with Google** — you should see the standard Google
   account picker.
3. Pick an account that does *not* already have a Cuetronix workspace.
4. You land on the `/signup/google` page pre-filled with your name.
5. Pick a workspace name → **Create workspace** → you're taken straight
   to the onboarding wizard with no password step.

Then:

1. Log out.
2. Go to `/login` → click **Continue with Google** → pick the same
   account → you're back in your dashboard.

If it fails:

- Error banner says **"Google sign-in isn't configured yet"** → the env
  vars didn't save or the deploy didn't pick them up. Redeploy.
- Error banner says **"invalid_state"** or **"expired_state"** → you
  took longer than 10 min between clicking the button and finishing at
  Google. Just retry.
- Google shows **"redirect_uri_mismatch"** → the URI in step 3c doesn't
  *exactly* match `GOOGLE_OAUTH_REDIRECT_URI`. Double-check trailing
  slashes and https vs http.

---

## 4. What's now live in the app

### Email flows

| When it happens                           | What the user gets                      |
| ----------------------------------------- | --------------------------------------- |
| User finishes **/signup** form            | Welcome + verification link             |
| User clicks **Settings → Security → Send verification** | Fresh verification link (valid 24h) |
| User clicks **Forgot your password?** on `/login` | Reset link (valid 30 min)       |
| Razorpay reports `invoice.paid` to our webhook | Payment receipt with invoice ID    |

All of these are **best-effort** — if Resend is down, the user still
gets through signup / login. Every send is logged in the
`email_events` table (Supabase → Table Editor → `email_events`) so you
can verify what went out.

### Google Sign-in flows

- **New user with no workspace yet:** clicks "Continue with Google" on
  `/signup` → picks a workspace name → trial starts. No password
  required.
- **Existing user with matching email:** clicks "Continue with Google"
  on `/login` → we silently link their Google account to their existing
  workspace → they're in.
- **Existing user with *no* Google link, wants to add one:** next time
  they log in with Google using the same email, we'll attach it.
- **Someone clicks Google sign-in but has no account:** they see a
  friendly "no workspace found — start one below" toast on the login
  page.

---

## 5. Daily operations — what you need to watch

Nothing operational should change for your live shop at Cuephoria. But
here's a short daily/weekly checklist:

**Daily (takes 30 seconds):**
- Resend dashboard → **Logs** → scan for any red "Failed" entries. A
  bounce usually means a customer mistyped their email at signup.

**Weekly:**
- Supabase → **Table Editor → email_events** → sort by `created_at
  desc` → scan for `status = failed` rows. Each row includes the
  error message.

**When something looks wrong:**
- Customer says "I never got the welcome email" → open `email_events`,
  filter `to_email = theiremail@…` — you'll see the exact provider ID
  and can search for it in Resend's logs.
- Customer says "Google sign-in not working" → check `GOOGLE_OAUTH_*`
  env vars are still set (Vercel sometimes strips them when cloning
  environments).

---

## 6. One-line summary for your team

> "Cuetronix now sends welcome, verification, password-reset, and
> payment receipts through Resend, and lets owners sign up or log in
> with Google. If anything looks weird, check the `email_events`
> table and Resend's dashboard — that covers 95% of issues."

---

## 7. Rollback (if you ever need it)

These changes are *additive*. To fully roll back:

1. Remove the four envs: `RESEND_API_KEY`, `RESEND_FROM`,
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `GOOGLE_OAUTH_REDIRECT_URI`. The app will gracefully degrade: email
   sends will no-op (and log `resend_not_configured`), and the Google
   button will show "Google sign-in isn't configured yet."
2. If you want the DB columns gone too (not recommended — they're
   harmless):
   ```sql
   drop table if exists public.email_events;
   drop table if exists public.admin_user_email_tokens;
   alter table public.admin_users
     drop column if exists email,
     drop column if exists email_verified_at,
     drop column if exists google_sub,
     drop column if exists avatar_url,
     drop column if exists display_name;
   ```

---

**You're set.** Ping your developer if any of the step-specific error
messages above appear and the remedy doesn't work; all the interesting
failure paths are logged in `email_events` with a precise reason.
