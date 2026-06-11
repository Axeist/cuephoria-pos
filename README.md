# Cuetronix

Multi-tenant point of sale, booking, and venue management SaaS for gaming cafes and entertainment venues.

## Features

- POS checkout, stations, products, customers
- Online booking + Razorpay payments
- Multi-location / multi-tenant (Cuetronix)
- Staff HR (attendance, shifts, payroll)
- Workspace roles and permissions (RBAC)
- Platform admin console

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) and [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | PR compliance & smoke tests |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase deploy |
| [docs/ONBOARDING_CLIENT.md](docs/ONBOARDING_CLIENT.md) | New tenant checklist |
| [SECURITY.md](SECURITY.md) | Security reporting |
| [AGENTS.md](AGENTS.md) | AI agent instructions |

## Stack

- React + Vite + TypeScript + Tailwind
- Supabase (Postgres)
- Vercel Serverless (`/api/*` Edge + Node)
- Razorpay, Resend

## License

Proprietary — see [LICENSE](LICENSE). All rights reserved.

## Security

Report issues to the address in [SECURITY.md](SECURITY.md).
