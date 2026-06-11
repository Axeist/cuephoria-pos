# Deployment

## Stack

- **Frontend + API:** Vercel (Hobby — catch-all `/api/*` dispatchers)
- **Database:** Supabase Pro
- **Payments:** Razorpay
- **Email:** Resend

## Pre-deploy checklist

- [ ] All env vars set in Vercel (Production + Preview)
- [ ] Supabase migrations applied in order
- [ ] `ADMIN_SESSION_SECRET` is a long random string
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never in client env
- [ ] Razorpay webhook URL: `https://<domain>/api/razorpay/webhook`
- [ ] Preview deploy smoke test passed

## Supabase migrations

Apply via Supabase CLI or SQL editor:

```bash
supabase db push
```

Critical migrations include workspace RBAC (`20260810170000_workspace_rbac.sql`) and staff HR foundation.

## Vercel

1. Connect GitHub repo
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables from [ENVIRONMENT.md](./ENVIRONMENT.md)

## Post-deploy smoke test

See [DEVELOPMENT.md](./DEVELOPMENT.md) and [ONBOARDING_CLIENT.md](./ONBOARDING_CLIENT.md).

## Rollback

- **App:** Redeploy previous Vercel deployment
- **Security flags:** Set `SECURITY_STRICT_PRICING=0`, `VITE_RBAC_ENFORCE_ROUTES=0`
- **Database:** Use companion rollback notes in migration files; never edit applied migrations

## Historical runbook

Detailed multi-tenant rollout notes were archived in [archive/CUETRONIX_ROLLOUT.md](./archive/CUETRONIX_ROLLOUT.md).
