# Razorpay Global Setup Guide

This guide is for enabling Razorpay in this app with international readiness.
Razorpay is the active provider now. Stripe placeholders exist in config but are
not enabled yet.

## 1) Razorpay Dashboard Setup (Do This First)

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Enable international payments for your account.
3. Complete KYC and cross-border compliance requirements.
4. Generate API keys in both **Test** and **Live** modes.
5. Create recurring plans (monthly/yearly) for SaaS billing if required.

## 2) Environment Variables

```bash
RAZORPAY_MODE=test                       # test | live
DEFAULT_PAYMENT_CURRENCY=INR            # checkout fallback (ISO-4217)

RAZORPAY_KEY_ID_TEST=rzp_test_xxxxx
RAZORPAY_KEY_SECRET_TEST=xxxxx
RAZORPAY_KEY_ID_LIVE=rzp_live_xxxxx
RAZORPAY_KEY_SECRET_LIVE=xxxxx

RAZORPAY_WEBHOOK_SECRET_TEST=xxxxx
RAZORPAY_WEBHOOK_SECRET_LIVE=xxxxx

# Lite branch optional credentials
RAZORPAY_KEY_ID_LIVE_LITE=rzp_live_xxxxx
RAZORPAY_KEY_SECRET_LIVE_LITE=xxxxx
```

## 3) Webhook Setup

Configure separate webhooks for Test and Live:

- URL: `https://<your-domain>/api/razorpay/webhook`
- Secret: use mode-specific secret from dashboard
- Events:
  - `payment.captured`
  - `payment.failed`
  - `order.paid`
  - `subscription.activated`
  - `subscription.cancelled`
  - `subscription.updated`
  - `invoice.paid`
  - `invoice.partially_paid`
  - `invoice.expired`

## 4) Platform Plan Mapping (SaaS Billing)

For tenant billing (`/settings/billing`):

1. Open `/platform/plans`.
2. Fill Razorpay Monthly and Yearly plan IDs (`plan_XXXX`) per app plan.
3. Save and verify checkout opens hosted subscription page.

Stripe plan fields are intentionally placeholder-only for now.

## 5) Operational Verification Checklist

1. Call `GET /api/admin/payment-config` (admin session) and confirm provider status.
2. Run `POST /api/admin/payment-config` with `{ "action": "test-credentials", "provider": "razorpay" }`.
3. Complete one test booking payment and verify:
   - `/public/payment/success` shows verified payment,
   - webhook is received and idempotent on replay.
4. Complete one tenant billing subscribe/cancel/resume cycle.
5. Switch to `RAZORPAY_MODE=live`, repeat with a low-value live transaction.

## 6) Security Notes

- Never expose `RAZORPAY_KEY_SECRET_*` in frontend code.
- Always verify webhook signatures on the raw payload.
- Keep Test and Live webhook URLs + secrets isolated.
- Use idempotency to safely process webhook retries.

