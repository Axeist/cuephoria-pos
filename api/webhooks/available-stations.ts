import { supabase } from "../../src/integrations/supabase/server";

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

