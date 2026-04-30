# Razorpay Payment Reconciliation

This document describes the reconciliation safety net that ensures a Razorpay
payment always becomes a confirmed booking — even if the customer never
returns to the success page after completing the UPI payment.

## TL;DR

Three independent paths converge on one idempotent helper
(`src/server/lib/materialize-booking.ts`):

1. **Razorpay webhook** (`/api/razorpay/webhook`) — fires within seconds of
   `payment.captured` / `order.paid`.
2. **pg_cron reconciler** (`/api/razorpay/reconcile`) — Supabase's pg_cron
   pings the reconciler every **15 seconds**.
3. **Vercel Cron** (`/api/razorpay/reconcile?source=vercel`) — every 1
   minute (Pro) / daily (Hobby) as a third belt.
4. **Success page** (`/api/bookings/materialize`) — the customer's browser,
   if they make it back.

The DB has a partial unique index on
`bookings (location_id, station_id, booking_date, start_time) WHERE status IN ('confirmed','in-progress')`
so even concurrent materializers can never produce a double booking.

## One-time setup checklist

### 1. Vercel project environment variables

| Name | Required | Notes |
| ---- | -------- | ----- |
| `CRON_SECRET` | Vercel-internal Cron auth. Vercel sets this automatically when you use the dashboard, or you can set your own. | |
| `RECONCILE_CRON_SECRET` | Yes | Used by Supabase pg_cron and the manual "Re-check" button. Generate a random 32-char string. |

The reconcile endpoint accepts either `Authorization: Bearer <CRON_SECRET>`
or `x-cron-secret: <RECONCILE_CRON_SECRET>` headers.

### 2. Supabase: enable extensions

In Supabase dashboard → Database → Extensions, enable:

- `pg_cron`
- `pg_net`

(These are also created via `CREATE EXTENSION IF NOT EXISTS …` in the
migration, but enabling them in the dashboard is required first on a
fresh project.)

### 3. Supabase: configure GUCs for the cron job

Open the SQL editor and run **once**:

```sql
ALTER DATABASE postgres SET app.reconcile_url    = 'https://admin.cuephoria.in/api/razorpay/reconcile';
ALTER DATABASE postgres SET app.reconcile_secret = '<RECONCILE_CRON_SECRET value>';
```

(Substitute your actual deployed URL and the secret from step 1.)

The pg_cron job uses `current_setting('app.reconcile_url', true)` so the
schedule keeps running even before this is set — it just no-ops until
you configure it.

### 4. Razorpay dashboard: confirm webhook events

The webhook should already be configured. Verify both events are
subscribed:

- `payment.captured`
- `order.paid`

(Optional, for completeness:)

- `payment.failed`

### 5. Verify the cron job is running

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'rzp-reconcile-15s';

-- Recent runs:
SELECT runid, jobid, status, return_message, start_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

You should see new run entries every 15 seconds with `status = 'succeeded'`.

## How it works (brief)

1. Client `POST /api/razorpay/create-order` with `booking_payload`. The
   server creates the Razorpay order **and** inserts a `payment_orders`
   row holding the full payload (no Razorpay-notes 256-char limit).
2. Customer pays via UPI / card.
3. Whichever of the four paths arrives first calls
   `materializeBookingFromPaymentOrder({ orderId, paymentId, paymentAmountPaise, source })`.
4. The helper:
   - Reads the `payment_orders` row,
   - Verifies `payment.amount === payment_orders.amount_paise`,
   - Resolves / creates the customer,
   - Inserts booking rows (catching `23505` from the partial unique index),
   - Confirms the matching `slot_blocks`,
   - Creates the bill + bill_items + bumps `customers.total_spent`,
   - Marks the `payment_orders` row `status='paid'` with the materialized
     booking + bill ids.

Re-running the helper for the same `(orderId, paymentId)` is always safe —
it short-circuits to `already_exists` on retries.

## Reconciliation tab

The Booking Management page now has a **Reconciliation** tab that lists
every Razorpay order created from the booking flow, scoped to the active
location. KPI cards highlight stuck orders (>30s old, still pending) in
red. The "Re-check" row action POSTs to `/api/razorpay/reconcile` with
the order id to force an immediate poll.

The tab subscribes to `payment_orders` realtime changes so it updates
live as the webhook / cron processes orders.

## Cleaning up duplicate live bookings (only if the migration warns)

The migration creates the partial unique index defensively. If existing
duplicate `(location_id, station_id, booking_date, start_time)` rows
exist for live bookings, it logs a `WARNING` and skips index creation —
deploy still succeeds, application-level guards remain active.

To fix and re-run:

```sql
WITH dupes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY location_id, station_id, booking_date, start_time
           ORDER BY created_at ASC, id ASC
         ) AS rn
    FROM public.bookings
   WHERE status IN ('confirmed','in-progress')
)
UPDATE public.bookings
   SET status = 'cancelled',
       notes  = COALESCE(notes,'') || ' [auto-cancelled duplicate]'
 WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- Now create the index manually:
CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_double_book_idx
  ON public.bookings (location_id, station_id, booking_date, start_time)
  WHERE status IN ('confirmed','in-progress');
```

## Failure-mode coverage

| Scenario | What happens |
| -------- | ------------ |
| Customer never returns from UPI app | Webhook captures within seconds. If webhook misconfigured, pg_cron picks it up within 15s. If pg_cron unhealthy, Vercel Cron picks it up within 1min. |
| Webhook fires before client redirect | Success page calls `/api/bookings/materialize`; helper returns `already_exists`. |
| Two clients race on same slot | `slot_blocks` deflects most; for the rest, the partial unique index raises `23505` and the loser re-fetches existing booking. |
| Two reconciler invocations concurrent | `claim_payment_orders_for_reconcile` uses `FOR UPDATE SKIP LOCKED` — disjoint batches. |
| Razorpay note truncation | No longer fatal — `booking_payload` is in the `payment_orders` table, no size limit. |
| Amount tampering | Helper refuses to materialize, marks `failed`, surfaces in Reconciliation tab. |
| Stuck "created" rows that never paid | After 30 minutes, marked `expired`, slot_blocks released. |

## Manual operations

- **Force re-check a single order**: click "Re-check" in the
  Reconciliation tab, or `curl`:
  ```bash
  curl -X POST https://admin.cuephoria.in/api/razorpay/reconcile \
       -H "x-cron-secret: $RECONCILE_CRON_SECRET" \
       -H "content-type: application/json" \
       -d '{"order_id":"order_XYZ"}'
  ```
- **Trigger a sweep** (same endpoint, no body): same curl as above with
  `-d '{}'`.
