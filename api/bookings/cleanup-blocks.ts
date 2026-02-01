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

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Cleanup endpoint for expired slot blocks
 * This can be called periodically (e.g., via cron job) to clean up expired blocks
 * Or can be called on-demand
 */
export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    console.log("🧹 Starting cleanup of expired slot blocks...");

    // Delete expired blocks that haven't been confirmed
    const { data: deletedBlocks, error: deleteError } = await supabase
      .from("slot_blocks")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("is_confirmed", false)
      .select("id");

    if (deleteError) {
      console.error("❌ Error cleaning up expired blocks:", deleteError);
      return j({ 
        ok: false, 
        error: "Failed to cleanup expired blocks",
        details: deleteError.message 
      }, 500);
    }

    const deletedCount = deletedBlocks?.length || 0;
    console.log(`✅ Cleaned up ${deletedCount} expired slot blocks`);

    return j({ 
      ok: true, 
      deleted_count: deletedCount,
      message: `Successfully cleaned up ${deletedCount} expired slot blocks`
    });

  } catch (error: any) {
    console.error("💥 Unexpected cleanup error:", error);
    return j({ 
      ok: false, 
      error: "Unexpected error occurred",
      details: error.message
    }, 500);
  }
}

