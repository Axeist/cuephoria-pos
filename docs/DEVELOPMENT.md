# Development guide

## Local setup

```bash
npm install
cp .env.example .env   # fill in Supabase + secrets
npm run dev
```

See [ENVIRONMENT.md](./ENVIRONMENT.md) for all variables.

## Production mindset

Clients are live. Every PR should answer:

1. **What live flow could break?** (POS, booking checkout, staff login, payroll, reports)
2. **How do we roll back?** (git revert or env flag)
3. **Was Preview smoke-tested?**

## Premediation template (copy into PR)

```
### Impact
- Flows affected:
- Direct supabase.from() in changed paths:

### Failure modes
- If X fails:

### Mitigation
- Log-only / flag:
- Fallback path:

### Rollback
- Revert OR set env:

### Smoke test (Preview)
- [ ] Admin login
- [ ] POS checkout
- [ ] Station session
- [ ] Booking page load
- [ ] Customer/cafe login pages load (unchanged)
```

## PR compliance checklist

- [ ] Scope minimal; no unrelated refactors
- [ ] Customer/cafe auth files untouched
- [ ] New destructive UI uses `usePermission` / `can()`
- [ ] New admin mutations use `/api/admin/*` + permission check when applicable
- [ ] New permission keys added to catalog + migration seed
- [ ] New migrations are new files only (never edit applied migrations)
- [ ] No secrets in client env (`VITE_*` service role)
- [ ] `npm run build` passes

## Deploy process

1. Merge to main → Vercel Preview URL
2. Run smoke test on Preview (`PREVIEW_URL=https://… npm run smoke:preview`)
3. Promote to production
4. For security flags: start with log-only / `0`, enable after soak

**Avoid Friday production deploys** for security or RLS changes.

## Deferred (do not start without plan update)

- Slice 11 core ops RLS replacement — `coreOps` / `/api/admin/ops` proxy is ready, but
  POS + public booking + customer dashboard still write ops tables via anon. Tighten only
  after those surfaces are proxied (see SECURITY_ROLLOUT.md).
- Customer portal auth hardening
- Cafe partner auth hardening
- `staff_*` deny-all RLS — portal + requests + payroll proxied; still blocked by the Staff
  Management admin module (directory/attendance/shifts/notifications) on anon.

## Security shipped

- CSRF on mutating `/api/admin/*` — use `adminFetch` from `@/services/adminFetch`
- Staff HR admin proxy — `/api/admin/staff-hr` (requests + payroll)
- Staff self-service portal proxy — `/api/admin/staff-portal` (clock-in/out, breaks, all request types)
- Core ops proxy (ready for incremental Slice 11 migration) — `/api/admin/ops` + `coreOps`
- Staff HR/payroll RPCs revoked from anon — `20260811140000_security_revoke_staff_hr_rpc_anon.sql`
- Rollout runbook — [SECURITY_ROLLOUT.md](./SECURITY_ROLLOUT.md)

## Key paths

| Area | Location |
|------|----------|
| Admin API dispatcher | `api/admin/[action].ts` |
| Handlers | `src/server/handlers/admin/` |
| Permissions | `src/context/PermissionsContext.tsx` |
| Catalog | `src/server/constants/permissionCatalog.ts` |
| Org scope | `src/server/orgContext.ts` |
