/**
 * GET  /api/platform/broadcasts — recent platform push history
 * POST /api/platform/broadcasts — send to all workspaces or one organization
 */

import { j } from "../../adminApiUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEVERITIES = new Set(["info", "warning", "critical", "success"]);
const MAX_TITLE = 120;
const MAX_MESSAGE = 2000;
const INSERT_CHUNK = 80;

type BroadcastBody = {
  title?: string;
  message?: string;
  severity?: string;
  targetType?: "all" | "organization";
  organizationId?: string | null;
  expiresInHours?: number;
};

export default async function handler(req: Request) {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-broadcasts");

    if (req.method === "GET") {
      const url = new URL(req.url);
      const limitRaw = Number(url.searchParams.get("limit") || 40);
      const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 40));

      const { data, error } = await supabase
        .from("platform_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true, broadcasts: data ?? [] }, 200);
    }

    if (req.method !== "POST") {
      return j({ ok: false, error: "Method not allowed" }, 405);
    }

    if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return j({ ok: false, error: "Expected JSON body." }, 415);
    }

    const body = (await req.json().catch(() => null)) as BroadcastBody | null;
    const title = (body?.title ?? "").trim();
    const message = (body?.message ?? "").trim();
    const severity = (body?.severity ?? "info").trim().toLowerCase();
    const targetType = body?.targetType === "organization" ? "organization" : "all";
    const organizationId = (body?.organizationId ?? "").trim() || null;
    const expiresHoursRaw = Number(body?.expiresInHours ?? 168);
    const expiresInHours = Math.max(1, Math.min(720, Number.isFinite(expiresHoursRaw) ? expiresHoursRaw : 168));

    if (!title || title.length > MAX_TITLE) {
      return j({ ok: false, error: `Title required (max ${MAX_TITLE} chars).` }, 400);
    }
    if (!message || message.length > MAX_MESSAGE) {
      return j({ ok: false, error: `Message required (max ${MAX_MESSAGE} chars).` }, 400);
    }
    if (!SEVERITIES.has(severity)) {
      return j({ ok: false, error: "Invalid severity." }, 400);
    }
    if (targetType === "organization") {
      if (!organizationId || !UUID_RE.test(organizationId)) {
        return j({ ok: false, error: "Valid organizationId required for targeted broadcast." }, 400);
      }
    }

    let organizationName: string | null = null;
    if (targetType === "organization" && organizationId) {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .select("id, name, status")
        .eq("id", organizationId)
        .maybeSingle();
      if (orgErr) return j({ ok: false, error: orgErr.message }, 500);
      if (!org) return j({ ok: false, error: "Organization not found." }, 404);
      organizationName = org.name;
    }

    let locQuery = supabase
      .from("locations")
      .select("id, organization_id, name")
      .eq("is_active", true);

    if (targetType === "organization" && organizationId) {
      locQuery = locQuery.eq("organization_id", organizationId);
    }

    const { data: locations, error: locErr } = await locQuery;
    if (locErr) return j({ ok: false, error: locErr.message }, 500);

    const locs = locations ?? [];
    if (locs.length === 0) {
      return j({ ok: false, error: "No active branches match this target." }, 400);
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { data: broadcast, error: broadcastErr } = await supabase
      .from("platform_broadcasts")
      .insert({
        title,
        message,
        severity,
        target_type: targetType,
        organization_id: targetType === "organization" ? organizationId : null,
        organization_name: organizationName,
        location_count: locs.length,
        created_by_admin_id: session.id,
        created_by_email: session.email,
        created_by_name: session.displayName,
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (broadcastErr || !broadcast) {
      return j({ ok: false, error: broadcastErr?.message ?? "Failed to create broadcast." }, 500);
    }

    const payload = {
      title,
      message,
      severity,
      broadcastId: broadcast.id,
      from: "Cuetronix Platform",
      adminName: session.displayName ?? session.email,
      adminEmail: session.email,
      targetType,
      organizationName,
    };

    const staffRows = locs.map((loc) => ({
      organization_id: loc.organization_id,
      location_id: loc.id,
      kind: "platform",
      alert_type: severity,
      dedupe_key: `platform:${broadcast.id}:${loc.id}`,
      payload,
      expires_at: expiresAt,
    }));

    for (let i = 0; i < staffRows.length; i += INSERT_CHUNK) {
      const chunk = staffRows.slice(i, i + INSERT_CHUNK);
      const { error: insertErr } = await supabase.from("staff_notifications").insert(chunk);
      if (insertErr) {
        return j(
          {
            ok: false,
            error: `Delivered partially then failed: ${insertErr.message}`,
            broadcastId: broadcast.id,
          },
          500
        );
      }
    }

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.displayName ?? session.email,
      organization_id: targetType === "organization" ? organizationId : null,
      action: "platform.broadcast_sent",
      target_type: "platform_broadcast",
      target_id: broadcast.id,
      meta: {
        title,
        severity,
        targetType,
        organizationName,
        locationCount: locs.length,
      },
    });

    return j(
      {
        ok: true,
        broadcast,
        deliveredTo: locs.length,
      },
      201
    );
  } catch (err: unknown) {
    if (err instanceof SupabaseConfigError) {
      return j({ ok: false, error: err.message }, 503);
    }
    console.error("platform/broadcasts error:", err);
    return j({ ok: false, error: "Internal server error." }, 500);
  }
}
