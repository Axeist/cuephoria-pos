# Security rollout runbook

Production checklist after deploying security hardening. **Customer login** and **cafe login** are unchanged (prototype scope).

## 1. Deploy verification

```bash
PREVIEW_URL=https://your-preview.vercel.app npm run smoke:preview
```

Manual: admin login, Google OAuth, POS checkout, Reports analytics, station migrate, Staff HR tabs.

## 2. Supabase migrations (in order)

| Migration | When | Risk |
|-----------|------|------|
| `20260811120000_security_rls_rbac_hr.sql` | After deploy soak | Low — RBAC tables only |
| `20260811130000_security_rpc_revoke_anon.sql` | After analytics/migrate verified via `/api/admin/*` | Medium — revokes anon RPC |
| `20260811140000_security_revoke_staff_hr_rpc_anon.sql` | After staff HR requests/payroll + portal dialogs verified via proxies | Medium — revokes anon EXECUTE on 7 staff HR/payroll RPCs |

### Gated deny-all flips (NOT yet shipped — would break live flows)

These are intentionally **not** committed as migration files because applying them
today breaks live browser flows that still read/write these tables with the anon
publishable key. Each is unblocked only after its remaining surface is proxied.

**`staff_*` deny-all** — blocked. Self-service portal (hook + 4 request dialogs),
`useStaffRequests`, and `usePayroll` are now proxied. **Still on anon:** the Staff
Management admin module — `StaffDirectory`, `EditStaffDialog`, `AttendanceManagement`,
`AttendanceCalendarView`, `AdminRegularizationDialog`, `ShiftRosterPanel`, and staff
notifications (`staffNotificationDb`, `BookingNotificationContext`). Proxy these
through `/api/admin/staff-hr` (extend `staffHrOps`) before any `staff_*` deny-all.

**Slice 11 ops deny-all (`products`, `bills`, `stations`, `sessions`, …)** — blocked.
`coreOps` proxy + `/api/admin/ops` are shipped and ready, but these tables are still
read/written with anon by: POS (`POSContext`, `useBills`), station/session actions
(`useStationsData`, `session-actions/*`), **public booking** (`PublicBooking`,
`PublicStations`, `publicBookingAvailability`, `BookingPage`) and the **customer
dashboard prototype** (`CustomerDashboard*`). Public + customer pages have no admin
session and cannot use `/api/admin/ops`; tightening requires dedicated public/customer
read endpoints first. Until then, the Slice 11 staged `allow_all` policies stay.

## 3. Environment flags (Vercel)

| Variable | Rollout |
|----------|---------|
| `VITE_RBAC_ENFORCE_ROUTES` | `log` → soak 48–72h → `1` |
| `SECURITY_STRICT_PRICING` | `0` → soak → `1` |
| `WEBHOOK_SECRET` | Set if using ElevenLabs/webhooks |
| `CSRF_DISABLED` | **Never in production** (local dev only) |

## 4. What shipped in code

- **CSRF:** HttpOnly `cuetronix_csrf` cookie + `X-CSRF-Token` header on mutating `/api/admin/*`
- **Staff HR admin:** `/api/admin/staff-hr` proxy (requests approve/reject, payroll generate/revert/deductions/allowances)
- **Staff self-service portal:** `/api/admin/staff-portal` proxy — clock in/out, breaks, leave/regularization/overtime/double-shift requests (no longer hits anon Supabase)
- **Core ops proxy (ready):** `/api/admin/ops` + `coreOps` — service-role + RBAC scoped access to ops tables, for incremental Slice 11 migration
- **No client fallbacks** for delete/analytics/migrate/PIN (server path only)
- **RBAC gates:** location-settings, booking-settings GET
- **CSP:** enforced + report-only headers

## 5. Rollback

1. Revert git commit
2. Set `VITE_RBAC_ENFORCE_ROUTES=0`, `SECURITY_STRICT_PRICING=0`
3. RLS/RPC migrations: use rollback SQL in migration file headers
