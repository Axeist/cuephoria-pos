/**
 * /settings/organization — tenant-side workspace management.
 *
 * Everyone on the tenant side can view this page. Only owners and admins
 * can edit. The server re-checks roles on PATCH, so UI gating is cosmetic.
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Copy,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Palette,
  Pencil,
  RefreshCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BRAND_PRESETS, matchPreset, type BrandPreset } from "@/branding/presets";
import { cn } from "@/lib/utils";

type Role = "owner" | "admin" | "manager" | "staff" | "read_only";

type TenantOrgResponse = {
  ok: true;
  organization: {
    id: string;
    slug: string;
    name: string;
    legal_name: string | null;
    country: string;
    currency: string;
    timezone: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "suspended";
    is_internal: boolean;
    trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
  };
  subscription: {
    id: string;
    plan_id: string;
    provider: string;
    status: string;
    interval: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
  } | null;
  plan: { id: string; code: string; name: string } | null;
  role: Role;
  canEdit: boolean;
};

const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  trialing: "bg-cyan-500/10 text-cyan-700 border-cyan-500/40 dark:text-cyan-300",
  past_due: "bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-300",
  canceled: "bg-zinc-500/10 text-zinc-600 border-zinc-500/30 dark:text-zinc-400",
  suspended: "bg-rose-500/10 text-rose-700 border-rose-500/40 dark:text-rose-300",
};

const OrganizationSettings: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["tenant", "organization"],
    queryFn: () => fetcher<TenantOrgResponse>("/api/tenant/organization"),
    staleTime: 30_000,
  });

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    legalName: "",
    country: "",
    currency: "",
    timezone: "",
  });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (query.data) {
      const o = query.data.organization;
      setForm({
        name: o.name,
        legalName: o.legal_name ?? "",
        country: o.country,
        currency: o.currency,
        timezone: o.timezone,
      });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetcher<{ ok: true; organization: TenantOrgResponse["organization"] }>("/api/tenant/organization", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          legalName: form.legalName.trim() || null,
          country: form.country.trim().toUpperCase(),
          currency: form.currency.trim().toUpperCase(),
          timezone: form.timezone.trim(),
        }),
      }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      toast({ title: "Workspace updated", description: "Changes are live across your venue." });
      queryClient.invalidateQueries({ queryKey: ["tenant", "organization"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (query.isLoading) {
    return (
      <div className="container p-4 mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="container p-4 mx-auto max-w-4xl">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-rose-500" />
            <div className="mt-3 text-sm font-medium">Couldn't load your workspace</div>
            <div className="mt-1 text-xs text-muted-foreground">{(query.error as Error).message}</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = query.data!;
  const { organization: org, subscription, plan, role, canEdit } = data;

  return (
    <div className="container p-4 mx-auto max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(600px circle at 10% 0%, color-mix(in oklab, var(--brand-primary-hex) 30%, transparent), transparent 55%), radial-gradient(500px circle at 90% 100%, color-mix(in oklab, var(--brand-accent-hex) 22%, transparent), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.025), rgba(0,0,0,0.25))",
          }}
        />
        <div className="relative z-10">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to settings
          </Link>
          <div className="mt-3 flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full brand-soft text-[11px] font-semibold uppercase tracking-[0.18em]">
                <Sparkles className="h-3 w-3" />
                Workspace settings
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Your <span className="gradient-text-hero">workspace</span>, beautifully tuned
              </h1>
              <p className="text-sm text-white/65 mt-2 max-w-xl">
                Identity, branding and subscription — the way your lounge shows up on
                receipts, the login page, and public bookings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusStyles[org.status]}>
                {org.status.replace("_", " ")}
              </Badge>
              {org.is_internal && (
                <Badge variant="outline" className="border-zinc-500/30 bg-zinc-500/10 text-zinc-300">
                  internal
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {!canEdit && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 flex items-start gap-2 text-sm">
            <Lock className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div>
              <div className="font-medium text-amber-700 dark:text-amber-300">Read-only view</div>
              <div className="text-xs text-amber-700/80 dark:text-amber-300/80">
                Ask an owner or admin to update these fields. Your current role is
                <span className="mx-1 font-mono rounded bg-amber-500/20 px-1.5 py-0.5">{role}</span>.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Identity
            </CardTitle>
            <CardDescription>How your workspace shows up on receipts, bookings and invoices.</CardDescription>
          </div>
          {canEdit && (
            editing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    if (query.data) {
                      const o = query.data.organization;
                      setForm({
                        name: o.name,
                        legalName: o.legal_name ?? "",
                        country: o.country,
                        currency: o.currency,
                        timezone: o.timezone,
                      });
                    }
                  }}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !form.name.trim()}
                >
                  {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Display name" editing={editing} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} read={org.name} />
          <FieldRow label="Legal entity" editing={editing} value={form.legalName} onChange={(v) => setForm((f) => ({ ...f, legalName: v }))} read={org.legal_name || "—"} placeholder="Optional" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldRow label="Country" editing={editing} value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v.toUpperCase().slice(0, 2) }))} read={org.country} maxLength={2} hint="2-letter ISO" />
            <FieldRow label="Currency" editing={editing} value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: v.toUpperCase().slice(0, 3) }))} read={org.currency} maxLength={3} hint="3-letter ISO" />
            <FieldRow label="Timezone" editing={editing} value={form.timezone} onChange={(v) => setForm((f) => ({ ...f, timezone: v }))} read={org.timezone} hint="e.g. Asia/Kolkata" />
          </div>

          <Separator />

          <div>
            <Label className="text-xs text-muted-foreground">Slug (cannot be changed)</Label>
            <div className="mt-1 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>/app/t/{org.slug}</span>
              <CopyButton text={`/app/t/${org.slug}`} />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding card */}
      <BrandingCard canEdit={canEdit} />

      {/* Plan card */}
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(480px circle at 92% 8%, color-mix(in oklab, var(--brand-accent-hex) 14%, transparent), transparent 60%)",
          }}
        />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[color:var(--brand-primary-hex)]" />
            Subscription
          </CardTitle>
          <CardDescription>
            Your current plan and billing cycle. Manage plans and invoices in Billing.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="rounded-2xl px-4 py-3 brand-soft flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl grid place-items-center shadow-[0_6px_18px_-6px_var(--brand-primary-hex)]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
                }}
              >
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Current plan
                </div>
                <div className="text-base font-bold text-white tracking-tight">
                  {plan?.name ?? "—"}
                </div>
              </div>
            </div>
            {subscription?.status && (
              <Badge
                variant="outline"
                className={cn("capitalize", statusStyles[subscription.status] || "border-white/20 bg-white/5 text-white/80")}
              >
                {subscription.status.replace("_", " ")}
              </Badge>
            )}
            {subscription?.interval && (
              <Badge variant="outline" className="border-white/20 bg-white/5 text-white/80 capitalize">
                {subscription.interval}
              </Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Stat k="Provider" v={subscription?.provider ?? "—"} />
            {subscription?.current_period_end && (
              <Stat k="Next cycle" v={fmtDate(subscription.current_period_end)} />
            )}
            {org.trial_ends_at && <Stat k="Trial ends" v={fmtDate(org.trial_ends_at)} />}
            <Stat k="Created" v={fmtDate(org.created_at)} />
            <Stat
              k="Updated"
              v={
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {fmtDate(org.updated_at)}
                </span>
              }
            />
          </dl>
          <div className="mt-5">
            <Button asChild size="sm">
              <Link to="/settings/billing">Manage plans &amp; invoices</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const FieldRow: React.FC<{
  label: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  read: React.ReactNode;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
}> = ({ label, editing, value, onChange, read, placeholder, maxLength, hint }) => (
  <div>
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing && hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    {editing ? (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
        placeholder={placeholder}
        maxLength={maxLength}
      />
    ) : (
      <div className="mt-1 text-sm font-medium">{read}</div>
    )}
  </div>
);

const Stat: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div>
    <dt className="text-xs text-muted-foreground uppercase tracking-wider">{k}</dt>
    <dd className="mt-0.5 text-sm font-medium truncate">{v}</dd>
  </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-auto text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Branding card — per-tenant white-labeling controls.
// ---------------------------------------------------------------------------
type BrandingFormState = {
  display_name: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  icon_url: string;
};

const emptyBranding: BrandingFormState = {
  display_name: "",
  tagline: "",
  primary_color: "",
  accent_color: "",
  logo_url: "",
  icon_url: "",
};

const HEX_RE = /^#[0-9a-f]{6}$/i;
const HTTPS_RE = /^https:\/\//i;

const BrandingCard: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const brandingQuery = useQuery({
    queryKey: ["tenant", "branding"],
    queryFn: () =>
      fetcher<{ ok: true; branding: Partial<BrandingFormState>; canEdit: boolean }>(
        "/api/tenant/branding",
      ),
    staleTime: 30_000,
  });

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<BrandingFormState>(emptyBranding);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (brandingQuery.data) {
      const b = brandingQuery.data.branding || {};
      setForm({
        display_name: b.display_name ?? "",
        tagline: b.tagline ?? "",
        primary_color: b.primary_color ?? "",
        accent_color: b.accent_color ?? "",
        logo_url: b.logo_url ?? "",
        icon_url: b.icon_url ?? "",
      });
    }
  }, [brandingQuery.data]);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.display_name && form.display_name.length > 120)
      errs.display_name = "Max 120 characters.";
    if (form.tagline && form.tagline.length > 160) errs.tagline = "Max 160 characters.";
    if (form.primary_color && !HEX_RE.test(form.primary_color))
      errs.primary_color = "Use #rrggbb, e.g. #7c3aed.";
    if (form.accent_color && !HEX_RE.test(form.accent_color))
      errs.accent_color = "Use #rrggbb, e.g. #06b6d4.";
    if (form.logo_url && !HTTPS_RE.test(form.logo_url))
      errs.logo_url = "Must start with https://.";
    if (form.icon_url && !HTTPS_RE.test(form.icon_url))
      errs.icon_url = "Must start with https://.";
    return errs;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | null> = {};
      (Object.keys(form) as (keyof BrandingFormState)[]).forEach((k) => {
        const v = form[k].trim();
        payload[k] = v.length === 0 ? null : v;
      });
      return fetcher<{ ok: true; branding: Partial<BrandingFormState> }>(
        "/api/tenant/branding",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      setEditing(false);
      setFieldErrors({});
      setSubmitError(null);
      toast({ title: "Branding saved", description: "Live for your members and public pages." });
      queryClient.invalidateQueries({ queryKey: ["tenant", "branding"] });
      queryClient.invalidateQueries({ queryKey: ["public", "workspace"] });
    },
    onError: (err: Error) => setSubmitError(err.message),
  });

  const saved = brandingQuery.data?.branding || {};
  const hasSaved = Object.keys(saved).length > 0;

  const handleSave = () => {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Branding
          </CardTitle>
          <CardDescription>
            Your logo, colors and wording on the workspace login, receipts and public booking page.
          </CardDescription>
        </div>
        {canEdit &&
          (editing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setFieldErrors({});
                  setSubmitError(null);
                  if (brandingQuery.data) {
                    const b = brandingQuery.data.branding || {};
                    setForm({
                      display_name: b.display_name ?? "",
                      tagline: b.tagline ?? "",
                      primary_color: b.primary_color ?? "",
                      accent_color: b.accent_color ?? "",
                      logo_url: b.logo_url ?? "",
                      icon_url: b.icon_url ?? "",
                    });
                  }
                }}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {hasSaved ? "Edit" : "Customize"}
            </Button>
          ))}
      </CardHeader>
      <CardContent className="space-y-4">
        <BrandingPreview form={editing ? form : { ...emptyBranding, ...saved }} />

        {editing ? (
          <>
            <BrandPresetPicker
              primary={form.primary_color}
              accent={form.accent_color}
              onApply={(preset) =>
                setForm((f) => ({
                  ...f,
                  primary_color: preset.primary,
                  accent_color: preset.accent,
                }))
              }
            />
            <BrandingFieldRow
              label="Display name"
              hint="Shown on public pages; falls back to workspace name"
              value={form.display_name}
              onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
              error={fieldErrors.display_name}
              maxLength={120}
            />
            <BrandingFieldRow
              label="Tagline"
              hint="One short line under your display name"
              value={form.tagline}
              onChange={(v) => setForm((f) => ({ ...f, tagline: v }))}
              error={fieldErrors.tagline}
              maxLength={160}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BrandingColorInput
                label="Primary color"
                value={form.primary_color}
                onChange={(v) => setForm((f) => ({ ...f, primary_color: v }))}
                error={fieldErrors.primary_color}
              />
              <BrandingColorInput
                label="Accent color"
                value={form.accent_color}
                onChange={(v) => setForm((f) => ({ ...f, accent_color: v }))}
                error={fieldErrors.accent_color}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <BrandingDropzone
                  label="Logo"
                  kind="logo"
                  hint="PNG/SVG · max 512 KB"
                  currentUrl={form.logo_url}
                  onUploaded={(url) => setForm((f) => ({ ...f, logo_url: url }))}
                  disabled={!canEdit}
                />
                <BrandingFieldRow
                  label="…or paste a URL"
                  hint="https:// · PNG or SVG · < 200 KB"
                  value={form.logo_url}
                  onChange={(v) => setForm((f) => ({ ...f, logo_url: v }))}
                  error={fieldErrors.logo_url}
                  placeholder="https://cdn.example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <BrandingDropzone
                  label="Icon / favicon"
                  kind="icon"
                  hint="Square PNG · 128×128 or 256×256"
                  currentUrl={form.icon_url}
                  onUploaded={(url) => setForm((f) => ({ ...f, icon_url: url }))}
                  disabled={!canEdit}
                />
                <BrandingFieldRow
                  label="…or paste a URL"
                  hint="Square image, 128×128 or 256×256"
                  value={form.icon_url}
                  onChange={(v) => setForm((f) => ({ ...f, icon_url: v }))}
                  error={fieldErrors.icon_url}
                  placeholder="https://cdn.example.com/icon.png"
                />
              </div>
            </div>

            {submitError && (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </>
        ) : hasSaved ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <BrandingReadRow k="Display name" v={saved.display_name || "—"} />
            <BrandingReadRow k="Tagline" v={saved.tagline || "—"} />
            <BrandingReadRow k="Primary" v={<ColorChip hex={saved.primary_color} />} />
            <BrandingReadRow k="Accent" v={<ColorChip hex={saved.accent_color} />} />
            <BrandingReadRow
              k="Logo"
              v={saved.logo_url ? <LogoThumb url={saved.logo_url} /> : "—"}
            />
            <BrandingReadRow
              k="Icon"
              v={saved.icon_url ? <LogoThumb url={saved.icon_url} square /> : "—"}
            />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border/70 px-4 py-6 text-center">
            <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="mt-2 text-sm text-muted-foreground">
              No branding yet — {canEdit
                ? "click Customize to set your logo, colors and tagline."
                : "an owner or admin can customize this."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BrandingFieldRow: React.FC<{
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}> = ({ label, hint, value, onChange, error, placeholder, maxLength }) => (
  <div>
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1"
      placeholder={placeholder}
      maxLength={maxLength}
    />
    {error && <div className="mt-1 text-[11px] text-rose-500">{error}</div>}
  </div>
);

const BrandingColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}> = ({ label, value, onChange, error }) => {
  const safe = HEX_RE.test(value) ? value : "#6366f1";
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-10 w-12 rounded-lg border border-white/10 bg-white/5 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#7c3aed"
          className="font-mono"
          maxLength={7}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-foreground"
            title="Clear"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && <div className="mt-1 text-[11px] text-rose-500">{error}</div>}
    </div>
  );
};

const ColorChip: React.FC<{ hex?: string }> = ({ hex }) => {
  if (!hex) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-4 w-4 rounded-full border border-border"
        style={{ backgroundColor: hex }}
      />
      <span className="font-mono text-xs">{hex}</span>
    </span>
  );
};

const LogoThumb: React.FC<{ url: string; square?: boolean }> = ({ url, square }) => (
  <span className="inline-flex items-center gap-2">
    <img
      src={url}
      alt="logo preview"
      className={`${square ? "h-6 w-6" : "h-6"} rounded border border-border object-contain bg-background`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-mono truncate max-w-[14rem] hover:text-foreground"
    >
      {url}
    </a>
  </span>
);

const BrandingReadRow: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider">{k}</div>
    <div className="mt-0.5 text-sm font-medium truncate">{v}</div>
  </div>
);

const BrandingPreview: React.FC<{ form: BrandingFormState }> = ({ form }) => {
  const primary = HEX_RE.test(form.primary_color) ? form.primary_color : "#7c3aed";
  const accent = HEX_RE.test(form.accent_color) ? form.accent_color : "#ec4899";
  const gradient = `linear-gradient(135deg, ${primary}, ${accent})`;
  const name = form.display_name.trim() || "Your workspace";
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
      <div
        className="relative p-6 flex items-center gap-4 overflow-hidden"
        style={{ background: gradient, color: "#fff" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(400px circle at 10% 20%, rgba(255,255,255,0.25), transparent 55%), radial-gradient(300px circle at 90% 80%, rgba(255,255,255,0.1), transparent 55%)",
          }}
        />
        <div className="relative z-10 h-14 w-14 rounded-xl bg-white/20 grid place-items-center overflow-hidden backdrop-blur shadow-lg border border-white/30">
          {form.logo_url && HTTPS_RE.test(form.logo_url) ? (
            <img
              src={form.logo_url}
              alt=""
              className="h-full w-full object-contain p-1.5"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </div>
        <div className="relative z-10 min-w-0">
          <div className="text-lg font-bold truncate tracking-tight">{name}</div>
          {form.tagline ? (
            <div className="text-sm text-white/85 truncate">{form.tagline}</div>
          ) : (
            <div className="text-sm text-white/70 truncate">
              Your gaming lounge, beautifully branded.
            </div>
          )}
        </div>
        <div className="relative z-10 ml-auto hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/30 backdrop-blur text-[10px] font-semibold uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          Live preview
        </div>
      </div>
      <div className="px-5 py-3 text-[11px] text-muted-foreground flex items-center justify-between bg-white/[0.02]">
        <span className="inline-flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          Preview · this is roughly how it'll appear
        </span>
        <span className="inline-flex items-center gap-2 font-mono">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: primary }} />
          {primary}
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          {accent}
        </span>
      </div>
    </div>
  );
};

/**
 * Drag-and-drop upload for tenant branding. On success the URL is written to
 * the form via onUploaded AND to the organization row server-side (so the
 * change sticks even if the user bails before clicking Save).
 */
const BrandingDropzone: React.FC<{
  label: string;
  kind: "logo" | "icon";
  hint: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}> = ({ label, kind, hint, currentUrl, onUploaded, disabled }) => {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const upload = async (file: File) => {
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast({ variant: "destructive", title: "Too large", description: "Maximum file size is 512 KB." });
      return;
    }
    const allowedMime = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowedMime.includes(file.type.toLowerCase())) {
      toast({ variant: "destructive", title: "Unsupported file", description: `MIME type ${file.type || "?"} not allowed.` });
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    setUploading(true);
    try {
      const res = await fetch("/api/tenant/branding/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Upload failed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onUploaded(json.url);
      toast({ title: `${label} uploaded`, description: "Looking sharp." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ variant: "destructive", title: "Upload failed", description: message });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) upload(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "relative flex items-center gap-3 rounded-xl border-2 border-dashed px-3 py-3 transition-colors",
          disabled ? "opacity-60 cursor-not-allowed border-border/60" : "cursor-pointer hover:border-primary/60",
          dragging ? "border-primary bg-primary/5" : "border-border/70 bg-muted/20",
        ].join(" ")}
      >
        <div className="h-12 w-12 rounded-lg bg-background border border-border/60 grid place-items-center overflow-hidden shrink-0">
          {currentUrl && HTTPS_RE.test(currentUrl) ? (
            <img
              src={currentUrl}
              alt=""
              className="h-full w-full object-contain p-1"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {uploading ? "Uploading…" : dragging ? "Drop to upload" : "Drag & drop or click"}
          </div>
          <div className="text-xs text-muted-foreground truncate">PNG · JPG · WEBP · SVG · ICO</div>
        </div>
        {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
        disabled={disabled}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Brand preset picker — one-click palettes curated in src/branding/presets.ts.
// Selecting a preset immediately updates the primary + accent form fields;
// saving still requires clicking the card's Save button.
// ---------------------------------------------------------------------------
const BrandPresetPicker: React.FC<{
  primary: string;
  accent: string;
  onApply: (preset: BrandPreset) => void;
}> = ({ primary, accent, onApply }) => {
  const matched = matchPreset(primary, accent);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-[color:var(--brand-primary-hex)]" />
            Quick palettes
          </div>
          <div className="text-xs text-muted-foreground">
            Pick a preset, or dial in custom hexes below.
          </div>
        </div>
        {matched && (
          <Badge
            variant="outline"
            className="border-white/20 bg-white/5 text-xs font-medium"
          >
            {matched.label}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {BRAND_PRESETS.map((preset) => {
          const isActive = matched?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset)}
              className={cn(
                "group relative rounded-xl border p-2.5 text-left transition-all overflow-hidden",
                isActive
                  ? "border-[color:var(--brand-primary-hex)] bg-white/[0.05] shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-primary-hex)_40%,transparent)]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25",
              )}
            >
              <div
                className="h-10 w-full rounded-lg mb-2 shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})`,
                }}
              />
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {preset.label}
                </span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 text-[color:var(--brand-primary-hex)] shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {preset.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OrganizationSettings;
