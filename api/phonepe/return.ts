export const runtime = "edge";

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const txnId = searchParams.get("txn");
    const status = (searchParams.get("status") || "").toLowerCase();

    // Frontend base URL
    const base = "https://admin.cuephoria.in";

    const ok = Boolean(txnId) && !["failed", "failure"].includes(status);

    const redirectUrl = ok
      ? `${base}/public/payment/success?txn=${encodeURIComponent(txnId as string)}`
      : `${base}/public/payment/failed`;

    return Response.redirect(redirectUrl, 302);
  } catch {
    return Response.redirect("https://admin.cuephoria.in/public/payment/failed", 302);
  }
}
