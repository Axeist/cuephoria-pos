/**
 * Minimal probe to verify Vercel's Node.js runtime is actually working.
 * If /api/_node-probe returns FUNCTION_INVOCATION_FAILED, the problem is
 * at the Vercel-runtime level, not in our handler code.
 */

export const config = { maxDuration: 10 };

type Req = { method?: string; url?: string };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (v: unknown) => void;
};

export default function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    ok: true,
    runtime: "node",
    nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
    method: req.method,
    url: req.url,
  });
}
