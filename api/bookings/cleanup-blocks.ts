import { supabase } from "@/integrations/supabase/server";

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

