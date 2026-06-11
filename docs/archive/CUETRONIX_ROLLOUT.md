# Cuetronix — Production Rollout Runbook

Single source of truth for pushing the multi-tenant SaaS transformation to a
live Cuephoria workspace with **zero disruption to daily operations**.

Read this top-to-bottom before your first deploy. Every step is ordered so
your live POS, bookings, and cafe flows continue uninterrupted.

---

## 0. Pre-flight (do once, before anything is pushed)

### Environment variables

Set all of these in Vercel → Project Settings → Environment Variables
(or equivalent on your host). All keys should be scoped to **Production**
and **Preview** unless noted.

| Variable | Purpose | Required |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL (server) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server only — never expose) | ✅ |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side Supabase | ✅ |
| `RAZORPAY_MODE` | `test` or `live` | ✅ |
| `RAZORPAY_KEY_ID_LIVE` / `RAZORPAY_KEY_SECRET_LIVE` | Live API keys | ✅ (live) |
| `RAZORPAY_KEY_ID_TEST` / `RAZORPAY_KEY_SECRET_TEST` | Test API keys | ✅ (test) |
| `RAZORPAY_WEBHOOK_SECRET_LIVE` / `RAZORPAY_WEBHOOK_SECRET_TEST` | HMAC secret for subscription + booking webhooks | ✅ |
| `ADMIN_SESSION_SECRET` | HMAC secret for admin session cookie (already set in your env) | ✅ |

> Keep the existing `_LITE` variants in place — nothing we shipped changes
> the Lite branch's own Razorpay credentials.

### Razorpay dashboard

1. Create **plans** for each Cuetronix tier (Starter, Growth, Scale) on both
   monthly and yearly cycles. Copy the resulting `plan_XXXX…` IDs.
2. Webhook endpoint: `https://<your-domain>/api/razorpay/webhook`
   - Enable events: `subscription.activated`, `subscription.charged`,
     `subscription.completed`, `subscription.updated`, `subscription.cancelled`,
     `subscription.paused`, `subscription.resumed`, `invoice.paid`,
     `invoice.partially_paid`, `invoice.expired`, `payment.captured`,
     `payment.failed`.
   - Use the same `RAZORPAY_WEBHOOK_SECRET_*` value.

---

## 1. Migration push order (staged)

All migrations are idempotent; safe to re-run. Push in this exact order.

### Already live in your DB (from prior slices)

- `20260423100000_slice0_multi_tenant_foundation.sql`
- `20260424100000_slice4_admin_users_password_hash.sql`
- `20260425100000_hotfix_auto_fill_organization_id.sql`
- `20260426100000_slice5_password_version.sql`
- `20260427100000_slice6_organization_branding.sql`

### Step A — Billing + branding + 2FA (push together, in order)

1. `20260428100000_slice8_billing_invoices.sql`
2. `20260429100000_slice9_tenant_branding_bucket.sql`
   - **Note:** on hardened Supabase projects, this file's storage policy
     statements will emit `NOTICE` lines saying they were skipped due to
     `insufficient_privilege`. That is expected and safe — reads work via
     `public = true` and writes go through service-role only.
3. `20260430100000_slice10_admin_user_totp.sql`

Deploy the app code in the same release. Verify (see §3).

### Step B — Staged RLS (`20260501100000_slice11_ops_rls_staged.sql`)

**When to push:** after Step A is stable in production for at least one full
business day, and you have verified bookings / POS / cafe still flow.

**What it does:** flips RLS on for ten operational tables
(`stations, categories, products, customers, bills, bill_items, bookings,
sessions, expenses, invoices`) with **permissive** placeholder policies that
preserve today's behaviour exactly. Nothing changes for your users.

**Why it's safe:** the permissive policies `USING (true) WITH CHECK (true)`
let every existing anon/service query through. Zero behaviour delta. The
value is that RLS is now "armed" — future tightening becomes a one-file
migration.

**Rollback:** if anything acts up, disable RLS on any affected table:

```sql
ALTER TABLE public.<table_name> DISABLE ROW LEVEL SECURITY;
```

### Step C — Drop legacy plaintext password (`20260502100000_slice12_drop_legacy_password.sql`)

**When to push:**

1. Every owner / admin in every organization has logged in at least once
   since Slice 4 went live. The lazy migration rehashes them onto PBKDF2.
2. Open `/platform/users` (or call `/api/platform/password-migration-status`).
   The widget must report **`plaintextRemaining: 0`** across all orgs.
3. You have a recent Supabase backup (Supabase makes daily ones — grab a
   snapshot right before pushing).

**What it does:** drops `admin_users.password`. The migration is **guarded**:
it will `RAISE EXCEPTION` and refuse to run if any plaintext password still
exists, so you cannot accidentally lock anyone out.

**Rollback:** if you need to reverse within the same day, restore the
`admin_users` table from the pre-push backup. Post-rollback, users can
still log in because `password_hash` was the source of truth for weeks
before the column was removed.

### Step D — Self-service signup + onboarding (`20260503100000_slice13_signup_and_onboarding.sql`)

**When to push:** any time after Step A. Cuephoria and other pre-existing
organisations are backfilled as already-onboarded, so the wizard will
never interrupt the live operation.

**What it does:** adds two nullable columns to `organizations`:

- `business_type` — self-reported by new tenants during onboarding.
- `onboarding_completed_at` — NULL for fresh tenants, auto-stamped to
  `now()` for every existing organisation so they skip the wizard.

It also seeds the `starter` plan defensively (no-op if it already exists
from Slice 0).

**App surfaces shipped in the same release:**

- `POST /api/tenant/signup` — creates a trial workspace in one call.
- `POST /api/tenant/onboarding` — per-step and finalise writes.
- `/signup` — marketing-grade signup page with live slug + strength meter.
- `/onboarding` — 5-step first-run wizard (profile → brand → business →
  preview → launch). Gates every owner/admin of a new tenant until they
  finish. Existing Cuephoria staff are never redirected.

**Rollback:** purely additive. To remove:

```sql
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS onboarding_completed_at,
  DROP COLUMN IF EXISTS business_type;
```

---

## 2. App deploy — what ships with Step A

New routes the user can access after Step A:

| Route | Who | What |
| --- | --- | --- |
| `/settings/billing` | Tenant owner/admin | Plan picker, subscribe via Razorpay, cancel/resume, invoice history |
| `/settings/organization` | Tenant owner/admin | Branding drag-drop upload |
| `/account/security` | Any admin user | TOTP enrollment wizard, backup codes, regenerate/disable |
| `/platform` | Platform superadmin | Plan↔Razorpay map, org billing force-set, password-migration status |

New API endpoints:

- `GET/POST /api/tenant/billing` (edge) — list plans + subscribe/cancel/resume
- `POST /api/tenant/branding-upload` (edge) — validated logo/favicon upload
- `GET/POST /api/admin/totp` (edge) — TOTP enroll / verify / regenerate / disable
- `POST /api/platform/plan-razorpay-map` (edge) — platform-only plan mapping
- `POST /api/razorpay/webhook` (node, extended) — routes subscription events
  out-of-band from the existing booking webhook so live traffic is untouched

Touched endpoints (backward-compatible):

- `POST /api/admin/login` — now accepts optional `totpCode` / `backupCode`,
  and replies with `{ requireTotp: true }` when 2FA is enrolled.
  Non-enrolled users see zero change.

---

## 3. Post-deploy verification (each step)

### After Step A

- [ ] Live POS flow: create a bill, confirm payment. No regression.
- [ ] Live bookings: create + check-in. No regression.
- [ ] `/settings/billing` loads; invoice list renders; plan picker shows
      every plan mapped in the Razorpay dashboard.
- [ ] Subscribe to any non-live plan in **test mode**. Razorpay hosted
      checkout opens via `shortUrl`. Complete it.
- [ ] Webhook log in Supabase (`audit_log` table) shows
      `subscription.created` and subsequently `invoice.paid` (if the plan
      charged immediately).
- [ ] `/account/security` → enroll TOTP on your personal admin account.
      Scan QR, verify, copy backup codes. Log out. Log back in — TOTP
      challenge appears after correct password and completes login.
- [ ] Upload a logo via `/settings/organization`. The `organizations.branding`
      JSON is updated; logo renders on `/branded-login/<slug>`.

### After Step B (Staged RLS)

- [ ] POS, bookings, cafe, reports all still function exactly as before.
      If anything misbehaves, it almost certainly means a `supabase`
      client is using the anon key without going through a policy-allowed
      path — roll back the specific table with `DISABLE ROW LEVEL SECURITY`
      and file a ticket.
- [ ] `SELECT relrowsecurity FROM pg_class WHERE relname = 'bills';`
      returns `t` (true).

### After Step C (Drop legacy password)

- [ ] `SELECT column_name FROM information_schema.columns
       WHERE table_name='admin_users' AND column_name='password';`
      returns zero rows.
- [ ] Every admin can still log in (the source of truth has been
      `password_hash` for weeks; this is a no-op from their POV).

---

## 4. Operational notes

### Internal organizations never get billed

Cuephoria Main + Lite are seeded with `is_internal = true`. The tenant
billing API refuses to create a Razorpay subscription for any internal org —
you cannot accidentally turn your own operations into a paid tenant. Platform
admins can still force-set a plan on them for feature gating purposes.

### Webhooks are idempotent

Subscription and invoice webhook handlers upsert by provider IDs, so Razorpay
retries are safe. The existing booking webhook logic is untouched.

### Edge vs Node runtime

- Booking + subscription **webhooks** run on Node (need `crypto.createHmac`
  + `timingSafeEqual` for strict HMAC).
- Every other new API endpoint runs on **Vercel Edge** for low latency.

### TOTP edge-safe

`src/server/totp.ts` uses Web Crypto only — runs on any edge runtime.
Backup codes are PBKDF2-SHA256 hashed, matching the password format.

### Emergency toggles

- Disable 2FA for a locked-out user (platform admin only):

  ```sql
  DELETE FROM public.admin_user_totp WHERE admin_user_id = '<uuid>';
  DELETE FROM public.admin_user_totp_backup_codes WHERE admin_user_id = '<uuid>';
  ```

- Cancel a tenant's Razorpay subscription server-side:

  ```sql
  UPDATE public.subscriptions
     SET status = 'cancelled', cancel_requested_at = now()
   WHERE organization_id = '<uuid>';
  ```

  Also cancel in the Razorpay dashboard to stop future invoices.

---

## 5. Status — what's shipped

All slices are code-complete, type-checked, lint-clean, and
idempotent-safe to re-run.

| Slice | Scope | Status |
| --- | --- | --- |
| 0 | Multi-tenant foundation | ✅ already live |
| 4 | Password hashing (PBKDF2) | ✅ already live |
| 5 | Password version + lazy migration | ✅ already live |
| 6 | Organization branding schema | ✅ already live |
| 8 | Razorpay subscriptions + invoices | ✅ ready to push |
| 9 | Tenant branding bucket | ✅ ready to push |
| 10 | TOTP 2FA for owners/admins | ✅ ready to push |
| 11 | Staged RLS (permissive policies) | ⏳ push after Step A is stable |
| 12 | Drop legacy plaintext password | ⏳ push after all users migrated |
| 13 | Self-service signup + onboarding wizard | ✅ ready to push |
| 14 | Resend emails + Google Sign-in | ✅ ready to push — see `EMAIL_AND_GOOGLE_SETUP.md` |

Ship Step A with confidence — your daily operations will not notice the
change, while every new tenant you onboard tomorrow gets the full Cuetronix
experience.
