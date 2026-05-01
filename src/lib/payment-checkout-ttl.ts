/**
 * Single source of truth for online checkout: Razorpay payment_orders window and
 * matching slot_blocks holds. Changing this updates server create-order, reconcile,
 * materialize backfill, and the admin Live Checkout UI countdown.
 */
export const PAYMENT_CHECKOUT_TTL_MINUTES = 4;
export const PAYMENT_CHECKOUT_PENDING_MS = PAYMENT_CHECKOUT_TTL_MINUTES * 60 * 1000;
