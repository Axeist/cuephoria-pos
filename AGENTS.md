# Agent instructions — Cuetronix

Multi-tenant venue POS and booking SaaS (**live production clients**).

## Read first

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — compliance checklist, premediation, smoke tests
- [docs/SECURITY.md](docs/SECURITY.md) — security model and reporting
- [.cursor/rules/](.cursor/rules/) — Cursor rules (always apply `production-safety.mdc`)

## Hard constraints

1. **Do not break live clients** — additive changes, env flags, Preview before prod
2. **Do not touch** customer login or cafe login (prototypes)
3. **Do not tighten** Slice 11 ops RLS or `cafe_*` without explicit task
4. **Minimize diff scope** — fix only what the task requires

## Architecture

- **Browser** → `/api/*` (session cookie + service role) for auth, team, roles, bookings API
- **Browser** → Supabase publishable key for most POS reads/writes (legacy; new mutations → server API)
- **Permissions** → `PermissionsContext`, keys in `src/server/constants/permissionCatalog.ts`

## Before submitting work

- [ ] `npm run build` passes
- [ ] Smoke test paths in `docs/DEVELOPMENT.md` considered
- [ ] Rollback documented if auth/RLS/pricing changed
- [ ] New env vars in `.env.example` + `docs/ENVIRONMENT.md`
