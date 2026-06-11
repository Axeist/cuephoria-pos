# Getting started

## Prerequisites

- Node.js 18+
- npm
- Supabase project (Pro recommended for production)
- Vercel account for deployment

## Local setup

```bash
git clone <repo-url>
cd cuetronix
npm install
cp .env.example .env
```

Fill in `.env` — see [ENVIRONMENT.md](./ENVIRONMENT.md).

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Admin login

Use credentials from your Supabase `admin_users` table or create a user via platform signup flow.

## Build

```bash
npm run build
npm run preview
```

## Android (optional)

See [ANDROID.md](./ANDROID.md).

## Agent / AI development

Read [../AGENTS.md](../AGENTS.md) and [DEVELOPMENT.md](./DEVELOPMENT.md) before making changes.
