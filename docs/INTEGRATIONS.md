# Integrations

## Razorpay

- Public booking checkout: `/api/razorpay/create-order`, `verify-payment`
- Subscriptions: `/api/tenant/billing`
- Webhook: `/api/razorpay/webhook` (HMAC verified in production)

Set keys per [ENVIRONMENT.md](./ENVIRONMENT.md). See archived [RAZORPAY_SETUP.md](./archive/RAZORPAY_SETUP.md) for legacy detail.

## Resend (email)

- Verification, password reset, welcome mail
- `RESEND_API_KEY`, `RESEND_FROM`, `APP_BASE_URL`

## Google OAuth (admin)

- Routes: `/api/auth/google/start`, `/api/auth/google/callback`
- Requires Google Cloud OAuth client + redirect URIs

## ElevenLabs webhooks (optional)

- `/api/webhooks/*` — requires `WEBHOOK_SECRET` when enabled
- See archived ElevenLabs docs in [archive/](./archive/)

## OpenRouter (AI chat)

- Server proxy: `/api/admin/ai-chat`
- `OPENROUTER_API_KEY` on Vercel only
