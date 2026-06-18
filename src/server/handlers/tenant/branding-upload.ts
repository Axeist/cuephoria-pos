/**
 * POST /api/tenant/branding/upload — upload a logo or favicon for the active
 * organization and return its public URL.
 *
 * Request: multipart/form-data with fields:
 *   file: the binary image
 *   kind: "logo" | "icon"
 *
 * Response: { ok: true, url: string, path: string }
 *
 * Guardrails:
 *   - Server-side MIME sniff + file-size cap (512KB).
 *   - Path is namespaced under the tenant UUID so one tenant cannot overwrite
 *     another's asset even if they tamper with the request.
 *   - Role gate: only owner/admin can upload.
 */

import { j } from "../../adminApiUtils";
import { withOrgContext, type OrgContext } from "../../orgContext";

export const config = { runtime: "edge" };

const EDITOR_ROLES = new Set(["owner", "admin"]);
const MAX_BYTES = 512 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "svg", "ico"]);

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);
  if (!EDITOR_ROLES.has(ctx.role)) {
    return j({ ok: false, error: "Only owners and admins can upload branding." }, 403);
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().startsWith("multipart/form-data")) {
    return j({ ok: false, error: "Expected multipart/form-data." }, 415);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return j({ ok: false, error: "Could not read uploaded form." }, 400);
  }

  const kindRaw = String(form.get("kind") ?? "").toLowerCase();
  if (kindRaw !== "logo" && kindRaw !== "icon") {
    return j({ ok: false, error: "kind must be 'logo' or 'icon'." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return j({ ok: false, error: "No file attached." }, 400);
  }
  if (file.size === 0) return j({ ok: false, error: "Empty file." }, 400);
  if (file.size > MAX_BYTES) {
    return j({ ok: false, error: `File exceeds ${(MAX_BYTES / 1024) | 0}KB.` }, 413);
  }
  if (!ALLOWED_MIME.has(file.type.toLowerCase())) {
    return j({ ok: false, error: `MIME type "${file.type}" is not allowed.` }, 415);
  }

  const originalName = (file.name || "").toLowerCase();
  const ext = originalName.includes(".") ? originalName.split(".").pop()! : "";
  if (!ALLOWED_EXT.has(ext)) {
    return j({ ok: false, error: `File extension .${ext} is not allowed.` }, 415);
  }

  // Path: branding/<org_id>/<kind>-<timestamp>.<ext>
  const ts = Date.now();
  const path = `branding/${ctx.organizationId}/${kindRaw}-${ts}.${ext}`;
  const bucket = "tenant-branding";

  const bytes = await file.arrayBuffer();
  const supabase = ctx.supabase;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
    cacheControl: "public, max-age=3600",
  });
  if (upErr) return j({ ok: false, error: upErr.message }, 500);

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = publicUrl?.publicUrl;
  if (!url) return j({ ok: false, error: "Upload succeeded but URL resolution failed." }, 500);

  // Also write the URL back into organizations.branding so the UI is in sync.
  const field = kindRaw === "logo" ? "logo_url" : "icon_url";
  const { data: orgRow, error: orgErr } = await supabase
    .from("organizations")
    .select("branding")
    .eq("id", ctx.organizationId)
    .maybeSingle();
  if (orgErr) return j({ ok: false, error: orgErr.message }, 500);

  const nextBranding = { ...(orgRow?.branding ?? {}), [field]: url };
  const { error: updErr } = await supabase
    .from("organizations")
    .update({ branding: nextBranding })
    .eq("id", ctx.organizationId);
  if (updErr) return j({ ok: false, error: updErr.message }, 500);

  await supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "organization.branding.uploaded",
    target_type: "organization",
    target_id: ctx.organizationId,
    meta: { kind: kindRaw, path, bytes: file.size },
  });

  return j({ ok: true, url, path, kind: kindRaw }, 200);
}

export default withOrgContext(handler);
