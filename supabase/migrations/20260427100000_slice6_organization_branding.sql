-- ============================================================================
-- SLICE 6 — organizations.branding (per-tenant white-labeling).
--
-- Purpose
--   Hold a small, public-safe branding object per organization. Tenant owners
--   and admins edit it via /api/tenant/branding; platform admins can override
--   and reset via /api/platform/organization-branding. The public workspace
--   resolver surfaces a sanitized projection.
--
-- Shape (JSONB)
--   {
--     "display_name":   string | null,   -- 1..120 chars, overrides name on public surfaces
--     "tagline":        string | null,   -- 0..160 chars, shown under display name
--     "primary_color":  string | null,   -- #rrggbb
--     "accent_color":   string | null,   -- #rrggbb
--     "logo_url":       string | null,   -- https:// only
--     "icon_url":       string | null,   -- https:// only, square favicon / avatar
--     "hide_powered_by": boolean | null  -- Pro/Enterprise can hide "Powered by Cuetronix"
--   }
--
-- Why JSONB
--   - Room to grow without churning the schema (dark-mode variants, font
--     overrides, OG card fields).
--   - Public API can project a whitelist of keys without leaking future
--     internal-only keys.
--
-- Why we keep colors as #rrggbb here (not HSL triplets)
--   The UI resolver converts to HSL before writing CSS vars. Persisting the
--   human-readable hex keeps the Platform console UI simple and auditable.
--
-- Guardrails (enforced by trigger below)
--   - `branding` is never null; always at least `{}`.
--   - `display_name` length bounded.
--   - `primary_color`/`accent_color` must match /^#[0-9a-f]{6}$/i or be null.
--   - `logo_url`/`icon_url` must start with `https://` or be null. No
--     data:/javascript:/http:// (except localhost for dev).
--   - Unknown keys are stripped (defense in depth).
--
-- Rollback
--   ALTER TABLE public.organizations DROP COLUMN branding;
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.branding IS
  'Per-tenant branding overrides (display_name, tagline, colors, logo/icon URLs, hide_powered_by). See trigger sanitize_organization_branding for shape enforcement.';

-- ----------------------------------------------------------------------------
-- Sanitizer / validator trigger.
-- Runs BEFORE INSERT OR UPDATE OF branding. Rejects malformed input and
-- strips unknown keys so downstream reads always see a known shape.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_organization_branding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  src  JSONB := COALESCE(NEW.branding, '{}'::jsonb);
  out  JSONB := '{}'::jsonb;
  v_text TEXT;
  v_bool BOOLEAN;
BEGIN
  IF jsonb_typeof(src) <> 'object' THEN
    RAISE EXCEPTION 'organizations.branding must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  -- display_name: optional string 1..120
  IF src ? 'display_name' AND src->>'display_name' IS NOT NULL THEN
    v_text := trim(src->>'display_name');
    IF length(v_text) BETWEEN 1 AND 120 THEN
      out := out || jsonb_build_object('display_name', v_text);
    ELSIF length(v_text) > 120 THEN
      RAISE EXCEPTION 'branding.display_name must be 120 characters or fewer'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- tagline: optional string 0..160
  IF src ? 'tagline' AND src->>'tagline' IS NOT NULL THEN
    v_text := trim(src->>'tagline');
    IF length(v_text) <= 160 THEN
      IF length(v_text) > 0 THEN
        out := out || jsonb_build_object('tagline', v_text);
      END IF;
    ELSE
      RAISE EXCEPTION 'branding.tagline must be 160 characters or fewer'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- primary_color: #rrggbb
  IF src ? 'primary_color' AND src->>'primary_color' IS NOT NULL THEN
    v_text := lower(trim(src->>'primary_color'));
    IF v_text ~ '^#[0-9a-f]{6}$' THEN
      out := out || jsonb_build_object('primary_color', v_text);
    ELSE
      RAISE EXCEPTION 'branding.primary_color must match #rrggbb'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- accent_color: #rrggbb
  IF src ? 'accent_color' AND src->>'accent_color' IS NOT NULL THEN
    v_text := lower(trim(src->>'accent_color'));
    IF v_text ~ '^#[0-9a-f]{6}$' THEN
      out := out || jsonb_build_object('accent_color', v_text);
    ELSE
      RAISE EXCEPTION 'branding.accent_color must match #rrggbb'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- logo_url: https:// only, <= 512 chars
  IF src ? 'logo_url' AND src->>'logo_url' IS NOT NULL THEN
    v_text := trim(src->>'logo_url');
    IF length(v_text) BETWEEN 8 AND 512 AND v_text ~* '^https://' THEN
      out := out || jsonb_build_object('logo_url', v_text);
    ELSE
      RAISE EXCEPTION 'branding.logo_url must be an https:// URL (<= 512 chars)'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- icon_url: https:// only, <= 512 chars
  IF src ? 'icon_url' AND src->>'icon_url' IS NOT NULL THEN
    v_text := trim(src->>'icon_url');
    IF length(v_text) BETWEEN 8 AND 512 AND v_text ~* '^https://' THEN
      out := out || jsonb_build_object('icon_url', v_text);
    ELSE
      RAISE EXCEPTION 'branding.icon_url must be an https:// URL (<= 512 chars)'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- hide_powered_by: boolean
  IF src ? 'hide_powered_by' AND src->>'hide_powered_by' IS NOT NULL THEN
    BEGIN
      v_bool := (src->>'hide_powered_by')::boolean;
      out := out || jsonb_build_object('hide_powered_by', v_bool);
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'branding.hide_powered_by must be a boolean'
        USING ERRCODE = '22023';
    END;
  END IF;

  NEW.branding := out;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sanitize_organization_branding() IS
  'Validates and strips organizations.branding JSONB to a known key whitelist on every INSERT/UPDATE.';

DROP TRIGGER IF EXISTS trg_sanitize_organization_branding ON public.organizations;
CREATE TRIGGER trg_sanitize_organization_branding
  BEFORE INSERT OR UPDATE OF branding ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_organization_branding();

-- Heal any existing rows whose branding column is NULL post-migration
-- (defensive — DEFAULT should already have populated them).
UPDATE public.organizations SET branding = '{}'::jsonb WHERE branding IS NULL;
