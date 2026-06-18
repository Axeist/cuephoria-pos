/**
 * brandingUtils — validate, sanitize, and project tenant branding.
 *
 * Single source of truth shared by:
 *   - /api/tenant/branding (tenant edit)
 *   - /api/platform/organization-branding (platform override)
 *   - /api/public/workspace (public projection)
 *
 * Why duplicate the DB trigger logic here
 *   Postgres is the hard wall — anything that reaches `organizations.branding`
 *   goes through the trigger in migration 20260427100000 and is re-validated.
 *   The TS layer exists to return a clean 400 with field-level messaging
 *   instead of relying on a raw postgres error string.
 */
export const BRANDING_KEYS = [
  "display_name",
  "tagline",
  "primary_color",
  "accent_color",
  "logo_url",
  "icon_url",
  "hide_powered_by",
] as const;

export type BrandingKey = (typeof BRANDING_KEYS)[number];

export type TenantBranding = {
  display_name?: string;
  tagline?: string;
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  icon_url?: string;
  hide_powered_by?: boolean;
};

const HEX_RE = /^#[0-9a-f]{6}$/i;
/**
 * Only https:// accepted. Intentionally permissive on the host (we don't
 * enforce an allow-list here — that would block legitimate CDNs a tenant
 * might use for their own assets).
 */
const URL_RE = /^https:\/\/[^\s<>"]{4,}$/i;

export type BrandingValidationError = {
  field: BrandingKey | "root";
  message: string;
};

/**
 * Validates and coerces an incoming patch. Returns either a sanitized
 * object ready to be merged into the current branding, or a list of
 * field-level errors. Unknown keys are ignored silently (same as the
 * DB trigger's whitelist behaviour).
 */
export function validateBrandingPatch(
  input: unknown,
): { ok: true; patch: TenantBranding } | { ok: false; errors: BrandingValidationError[] } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: [{ field: "root", message: "Branding must be an object." }] };
  }

  const src = input as Record<string, unknown>;
  const errors: BrandingValidationError[] = [];
  const out: TenantBranding = {};

  if ("display_name" in src) {
    const v = src.display_name;
    if (v === null || v === "") {
      // Allow explicit clear — DB trigger strips empty strings and the caller
      // can signal "clear" with null in the HTTP layer.
    } else if (typeof v !== "string") {
      errors.push({ field: "display_name", message: "Must be a string." });
    } else {
      const trimmed = v.trim();
      if (trimmed.length < 1 || trimmed.length > 120) {
        errors.push({ field: "display_name", message: "Must be 1–120 characters." });
      } else {
        out.display_name = trimmed;
      }
    }
  }

  if ("tagline" in src) {
    const v = src.tagline;
    if (v === null || v === "") {
      // Clear on null / empty string.
    } else if (typeof v !== "string") {
      errors.push({ field: "tagline", message: "Must be a string." });
    } else {
      const trimmed = v.trim();
      if (trimmed.length > 160) {
        errors.push({ field: "tagline", message: "Must be 160 characters or fewer." });
      } else if (trimmed.length > 0) {
        out.tagline = trimmed;
      }
    }
  }

  for (const k of ["primary_color", "accent_color"] as const) {
    if (k in src) {
      const v = src[k];
      if (v === null || v === "") continue;
      if (typeof v !== "string") {
        errors.push({ field: k, message: "Must be a hex color like #7c3aed." });
        continue;
      }
      const trimmed = v.trim().toLowerCase();
      if (!HEX_RE.test(trimmed)) {
        errors.push({ field: k, message: "Must match #rrggbb, e.g. #7c3aed." });
        continue;
      }
      out[k] = trimmed;
    }
  }

  for (const k of ["logo_url", "icon_url"] as const) {
    if (k in src) {
      const v = src[k];
      if (v === null || v === "") continue;
      if (typeof v !== "string") {
        errors.push({ field: k, message: "Must be an https:// URL." });
        continue;
      }
      const trimmed = v.trim();
      if (trimmed.length > 512 || !URL_RE.test(trimmed)) {
        errors.push({ field: k, message: "Must be an https:// URL (≤ 512 chars)." });
        continue;
      }
      // Defense in depth: explicitly reject javascript: or data: schemes that
      // might sneak past the URL regex via whitespace tricks.
      if (/^(javascript|data|file|vbscript):/i.test(trimmed)) {
        errors.push({ field: k, message: "Unsupported URL scheme." });
        continue;
      }
      out[k] = trimmed;
    }
  }

  if ("hide_powered_by" in src) {
    const v = src.hide_powered_by;
    if (v === null) {
      // Clear; no-op.
    } else if (typeof v === "boolean") {
      out.hide_powered_by = v;
    } else {
      errors.push({ field: "hide_powered_by", message: "Must be true or false." });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, patch: out };
}

/**
 * Strip anything not in the public whitelist. Used by /api/public/workspace
 * before responding so future internal-only keys never leak.
 */
export function toPublicBranding(raw: unknown): TenantBranding {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: TenantBranding = {};

  const copyString = (k: BrandingKey) => {
    const v = src[k];
    if (typeof v === "string" && v.length > 0) (out as Record<string, unknown>)[k] = v;
  };

  copyString("display_name");
  copyString("tagline");
  copyString("primary_color");
  copyString("accent_color");
  copyString("logo_url");
  copyString("icon_url");

  if (typeof src.hide_powered_by === "boolean") {
    out.hide_powered_by = src.hide_powered_by;
  }

  return out;
}

/**
 * Merge a patch into existing branding. A key set to `null` (or missing in
 * the whitelisted patch) triggers a *clear* when the caller opted in via
 * `clearFields`. Callers that just want to overlay keys pass an empty array.
 */
export function mergeBranding(
  current: TenantBranding,
  patch: TenantBranding,
  clearFields: BrandingKey[],
): TenantBranding {
  const merged: TenantBranding = { ...current };
  for (const k of BRANDING_KEYS) {
    if (clearFields.includes(k)) {
      delete (merged as Record<string, unknown>)[k];
      continue;
    }
    if (k in patch) {
      (merged as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
    }
  }
  return merged;
}

/**
 * Inspect an incoming raw patch and pull out keys the caller explicitly sent
 * as `null` or empty string — those are clears, not merges.
 */
export function extractClearFields(input: unknown): BrandingKey[] {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return [];
  const src = input as Record<string, unknown>;
  const out: BrandingKey[] = [];
  for (const k of BRANDING_KEYS) {
    if (k in src) {
      const v = src[k];
      if (v === null || v === "") out.push(k);
    }
  }
  return out;
}
