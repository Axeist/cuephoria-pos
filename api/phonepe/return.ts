export const runtime = "edge";

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const txnId = searchParams.get("txn");
    const phonepeStatus = (searchParams.get("status") || "").toLowerCase();

    const base = "https://admin.cuephoria.in";

    const isSuccess =
      Boolean(txnId) && !["failed", "failure"].includes(phonepeStatus);

    const redirectUrl = isSuccess
      ? `${base}/public/payment/success?txn=${encodeURIComponent(txnId as string)}`
      : `${base}/public/payment/failed`;

    return Response.redirect(redirectUrl, 302);
  } catch {
    return Response.redirect("https://admin.cuephoria.in/public/payment/failed", 302);
  }
}
