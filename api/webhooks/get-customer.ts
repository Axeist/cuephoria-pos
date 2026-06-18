import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
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

function parseJsonBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === "object" && !Array.isArray(body)) {
    if (body instanceof Uint8Array) {
      try {
        const parsed = JSON.parse(Buffer.from(body).toString("utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return body as Record<string, unknown>;
  }
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  if (req.method !== "POST") return j(res, { ok: false, error: "Method not allowed" }, 405);

  try {
    const payload = parseJsonBody(req.body);
    const { customer_phone, location_id: locationIdRaw } = payload;
    const location_id = typeof locationIdRaw === "string" && locationIdRaw.length > 0 ? locationIdRaw : null;

    if (!customer_phone) return j(res, { ok: false, error: "Missing required field: customer_phone" }, 400);
    if (!location_id) return j(res, { ok: false, error: "Missing required field: location_id" }, 400);

    const phoneString = String(customer_phone || "");
    let normalizedPhone = phoneString.replace(/\D/g, "");
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith("91")) normalizedPhone = normalizedPhone.substring(2);
    else if (normalizedPhone.length === 13 && normalizedPhone.startsWith("9191")) normalizedPhone = normalizedPhone.substring(2);

    if (normalizedPhone.length !== 10) {
      return j(
        res,
        { ok: false, error: "Invalid phone number. Indian mobile numbers must be exactly 10 digits", provided: phoneString },
        400,
      );
    }
    if (!["6", "7", "8", "9"].includes(normalizedPhone[0])) {
      return j(
        res,
        {
          ok: false,
          error: "Invalid phone number. Indian mobile numbers must start with 6, 7, 8, or 9",
          provided: phoneString,
        },
        400,
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, email")
      .eq("phone", normalizedPhone)
      .eq("location_id", location_id)
      .maybeSingle();

    if (customerError) {
      if (customerError.code === "PGRST116") {
        return j(res, { ok: true, found: false, message: "Customer not found", customer: null }, 200);
      }
      return j(res, { ok: false, error: "Failed to fetch customer" }, 500);
    }
    if (!customer) return j(res, { ok: true, found: false, message: "Customer not found", customer: null }, 200);

    return j(
      res,
      {
        ok: true,
        found: true,
        customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
      },
      200,
    );
  } catch (error: any) {
    return j(res, { ok: false, error: error.message || "Failed to fetch customer" }, 500);
  }
}
