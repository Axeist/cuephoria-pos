import { supabase } from "@/integrations/supabase/client";

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization"
    },
  });
}

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return j({ ok: true }, 200);
  }

  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
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

    return j({
      ok: true,
      stations: stations || [],
      count: stations?.length || 0
    }, 200);
  } catch (error: any) {
    console.error("💥 Available stations error:", error);
    return j({
      ok: false,
      error: error.message || "Failed to fetch stations"
    }, 500);
  }
}

