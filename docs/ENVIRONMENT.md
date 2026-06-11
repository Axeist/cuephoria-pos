# Environment variables

Copy `.env.example` to `.env` for local development. **Never commit `.env`.**

Production values go in **Vercel → Project → Settings → Environment Variables**.

## Client (VITE_* — exposed to browser)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Optional | Project ref |
| `VITE_GEMINI_API_KEY` | Optional | Legacy; prefer server OpenRouter proxy |
| `VITE_RBAC_ENFORCE_ROUTES` | Optional | `1` enforce (default), `0` off, `log` log-only |

## Server (never use VITE_ prefix)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role — server only |
| `SUPABASE_URL` | Yes | Same as VITE URL (server-side) |
| `ADMIN_SESSION_SECRET` | Yes | HMAC secret for admin session cookie |
| `PLATFORM_SESSION_SECRET` | Platform | Platform admin session |
| `OPENROUTER_API_KEY` | AI feature | Server-side AI proxy |
| `RESEND_API_KEY` | Email | Transactional email |
| `RESEND_FROM` | Email | From address |
| `APP_BASE_URL` | Yes | Public app URL for email links |

## Payments (Razorpay)

| Variable | Description |
|----------|-------------|
| `RAZORPAY_MODE` | `test` or `live` |
| `RAZORPAY_KEY_ID_TEST` / `_LIVE` | API keys |
| `RAZORPAY_KEY_SECRET_TEST` / `_LIVE` | API secrets |
| `RAZORPAY_WEBHOOK_SECRET_TEST` / `_LIVE` | Webhook HMAC |

## Security flags

| Variable | Default | Description |
|----------|---------|-------------|
| `SECURITY_STRICT_PRICING` | `0` | `1` = reject booking/payment amount mismatches |
| `WEBHOOK_SECRET` | unset | Required for `/api/webhooks/*` when set |
| `WEBHOOK_AUTH_DISABLED` | `0` | `1` = local dev only, skip webhook auth |
| `CSRF_DISABLED` | `0` | `1` = local dev only, skip admin CSRF checks |
| `RBAC_ENFORCE_ROUTES` | server N/A | Use `VITE_RBAC_ENFORCE_ROUTES` on client |

## Rollout recommendation

1. Deploy with flags off / log-only
2. Monitor logs 48–72 hours
3. Enable `SECURITY_STRICT_PRICING=1` and `VITE_RBAC_ENFORCE_ROUTES=1` in production
