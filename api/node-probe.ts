/**
 * Node-runtime probe. Isolates whether the Vercel Node bundler can link
 * against src/server/* modules — if this returns 200 JSON the imports
 * work; if it returns FUNCTION_INVOCATION_FAILED, the link fails at
 * cold-start and that's what's breaking every Node dispatcher.
 */

import { j } from "../src/server/adminApiUtils";

export const config = { maxDuration: 10 };

type Req = { method?: string; url?: string };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (v: unknown) => void;
};

export default function handler(req: Req, res: Res) {
  // touch the imports so the bundler can't tree-shake them away
  const jExists = typeof j === "function";

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    ok: true,
    runtime: "node",
    nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
    method: req.method,
    url: req.url,
    imports: { jExists },
  });
}
