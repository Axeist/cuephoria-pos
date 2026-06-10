/**
 * Concrete route for tenant Razorpay credential testing (Node + SDK).
 * Resolved before api/razorpay/[action].ts so this path is always available.
 */
import handler from "../../src/server/handlers/razorpay/test-org-credentials.js";

export default handler;
export const config = { maxDuration: 30 };
