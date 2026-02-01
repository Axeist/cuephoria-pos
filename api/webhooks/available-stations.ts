import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess =
    typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  const fromGlobalProcess = (globalThis as any)?.process?.env?.[name];
  return fromDeno ?? fromProcess ?? fromGlobalProcess;
}

function needEnv(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const SUPABASE_URL = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || needEnv("SUPABASE_URL");
const SUPABASE_KEY =
  getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
  getEnv("SUPABASE_SERVICE_KEY") ||
  getEnv("SUPABASE_ANON_KEY") ||
  getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  needEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-application-name": "cuephoria-api" } },
});

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  end: () => void;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const { data: stations, error } = await supabase
      .from("stations")
      .select("id, name, type, hourly_rate, is_occupied")
      .order("name");

    if (error) {
      console.error("❌ Error fetching stations:", error);
      throw error;
    }

    return j(res, {
      ok: true,
      stations: stations || [],
      count: stations?.length || 0
    }, 200);
  } catch (error: any) {
    console.error("💥 Available stations error:", error);
    return j(res, {
      ok: false,
      error: error.message || "Failed to fetch stations"
    }, 500);
  }
}

