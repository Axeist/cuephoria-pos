# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Production (`main`) | Yes |
| Preview deployments | Best-effort |

## Reporting a vulnerability

Email **security@cuephoria.in** (replace with your operational address).

Include steps to reproduce, impact assessment, and affected URLs.

We aim to acknowledge within 3 business days.

## Security model (summary)

- **Tenant admin:** HttpOnly session cookie + workspace RBAC
- **Platform admin:** Separate cookie and secret
- **Data:** Multi-tenant; org/location scoping on server APIs
- **Payments:** Razorpay HMAC webhooks; server-side amount validation (when `SECURITY_STRICT_PRICING=1`)

## Out of scope / prototype

The following are **not** hardened for production external use:

- Customer portal login (`/customer/login`)
- Cafe partner login (`/api/cafe/*`)

Do not expose these to untrusted users until dedicated security work is completed.

## Development compliance

Contributors and Cursor agents must follow:

- [DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- [AGENTS.md](./AGENTS.md)
- `.cursor/rules/production-safety.mdc`

## Sub-processors

Production deployments may use: Supabase, Vercel, Razorpay, Resend, OpenRouter (AI), Google OAuth.

See in-app Privacy Policy for customer-facing disclosure.
