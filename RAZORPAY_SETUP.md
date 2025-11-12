# Razorpay Integration Setup

This document describes the environment variables needed for Razorpay payment integration.

## Environment Variables

### Test Mode (Default)
```bash
# Set mode to test (or omit for default test mode)
RAZORPAY_MODE=test

# Test API Keys (from Razorpay Dashboard -> Settings -> API Keys)
RAZORPAY_KEY_ID_TEST=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET_TEST=xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Webhook secret for test mode
RAZORPAY_WEBHOOK_SECRET_TEST=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Live Mode (Production)
```bash
# Set mode to live for production
RAZORPAY_MODE=live

# Live API Keys (from Razorpay Dashboard -> Settings -> API Keys - Switch to Live Mode)
RAZORPAY_KEY_ID_LIVE=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET_LIVE=xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Webhook secret for live mode
RAZORPAY_WEBHOOK_SECRET_LIVE=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Alternative: Single Key Configuration
If you prefer to use the same variable names for both test and live (switching via RAZORPAY_MODE):

```bash
RAZORPAY_MODE=test  # or "live"
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx  # or rzp_live_xxxxxxxxxxxxx for live
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

## How to Get Your API Keys

1. **Test Mode Keys:**
   - Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
   - Go to **Settings** → **API Keys**
   - Click **Generate Key** (if you don't have one)
   - Copy the **Key ID** and **Key Secret**
   - These are your test keys (start with `rzp_test_`)

2. **Live Mode Keys:**
   - In Razorpay Dashboard, switch to **Live Mode** (top right)
   - Go to **Settings** → **API Keys**
   - Click **Generate Key** (if you don't have one)
   - Copy the **Key ID** and **Key Secret**
   - These are your live keys (start with `rzp_live_`)

## Webhook Setup (Optional but Recommended)

1. In Razorpay Dashboard, go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Set the webhook URL: `https://admin.cuephoria.in/api/razorpay/webhook`
4. Select events to subscribe to:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Copy the webhook secret and add it to your environment variables

## Switching Between Test and Live

Simply change the `RAZORPAY_MODE` environment variable:
- `RAZORPAY_MODE=test` - Uses test keys
- `RAZORPAY_MODE=live` - Uses live keys

The system will automatically use the correct keys based on this setting.

## Testing

1. **Test Mode:**
   - Use test cards from [Razorpay Test Cards](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/test-cards/)
   - No real money is deducted
   - Test payments appear in Test Mode dashboard

2. **Live Mode:**
   - Real payments are processed
   - Real money is deducted
   - Payments appear in Live Mode dashboard

## Important Notes

- **Never commit API keys to version control**
- Keep your Key Secret secure - it should never be exposed to the frontend
- The Key ID (public key) is safe to expose and is fetched via `/api/razorpay/get-key-id`
- Always test in test mode before switching to live mode
- Ensure webhook URLs are accessible from the internet (not localhost)

## Payment Flow

1. User selects "Pay Online (Razorpay)" on booking page
2. Frontend calls `/api/razorpay/create-order` to create an order
3. Frontend gets Key ID from `/api/razorpay/get-key-id`
4. Razorpay checkout modal opens
5. User completes payment
6. On success, redirects to `/public/payment/success` with payment details
7. Success page verifies payment via `/api/razorpay/verify-payment`
8. Booking is created in database
9. Webhook (optional) receives payment confirmation

