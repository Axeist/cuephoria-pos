/**
 * Checkout hold window for slot_blocks + payment_orders.
 * Keep in sync with src/lib/payment-checkout-ttl.ts (client UI countdown).
 */
export const PAYMENT_CHECKOUT_TTL_MINUTES = 4;
export const PAYMENT_ORDER_PENDING_TTL_MS = PAYMENT_CHECKOUT_TTL_MINUTES * 60 * 1000;
