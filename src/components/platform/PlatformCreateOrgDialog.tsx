/**
 * PlatformCreateOrgDialog — create a new Cuetronix tenant.
 *
 * Inputs are validated client-side to match the server contract. The slug
 * is auto-suggested from the display name but remains editable; server-side
 * validation is the ultimate authority.
 */

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_public: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  sort_order: number;
  features: Record<string, unknown>;
};

type CreateOrgResponse = {
  ok: true;
  organization: { id: string; slug: string; name: string };
};

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;

const COUNTRIES: Array<{ code: string; label: string; currency: string; tz: string }> = [
  { code: "IN", label: "India", currency: "INR", tz: "Asia/Kolkata" },
  { code: "US", label: "United States", currency: "USD", tz: "America/New_York" },
  { code: "GB", label: "United Kingdom", currency: "GBP", tz: "Europe/London" },
  { code: "AE", label: "United Arab Emirates", currency: "AED", tz: "Asia/Dubai" },
  { code: "SG", label: "Singapore", currency: "SGD", tz: "Asia/Singapore" },
  { code: "AU", label: "Australia", currency: "AUD", tz: "Australia/Sydney" },
  { code: "CA", label: "Canada", currency: "CAD", tz: "America/Toronto" },
  { code: "ID", label: "Indonesia", currency: "IDR", tz: "Asia/Jakarta" },
  { code: "PH", label: "Philippines", currency: "PHP", tz: "Asia/Manila" },
  { code: "DE", label: "Germany", currency: "EUR", tz: "Europe/Berlin" },
];

const slugify = (v: string): string =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const PlatformCreateOrgDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (org: { id: string; slug: string; name: string }) => void;
}> = ({ open, onOpenChange, onCreated }) => {
  const queryClient = useQueryClient();

  const [name, setName] = React.useState("");
  const [legalName, setLegalName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [country, setCountry] = React.useState("IN");
  const [currency, setCurrency] = React.useState("INR");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");
  const [planCode, setPlanCode] = React.useState("starter");
  const [trialDays, setTrialDays] = React.useState(14);
  const [primaryLocationName, setPrimaryLocationName] = React.useState("Main Branch");
  const [shortCode, setShortCode] = React.useState("MAIN");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setLegalName("");
      setSlug("");
      setSlugTouched(false);
      setCountry("IN");
      setCurrency("INR");
      setTimezone("Asia/Kolkata");
      setPlanCode("starter");
      setTrialDays(14);
      setPrimaryLocationName("Main Branch");
      setShortCode("MAIN");
      setError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const plansQuery = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => {
      const res = await fetch("/api/platform/plans", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      return json as { ok: true; plans: Plan[] };
    },
    staleTime: 300_000,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<CreateOrgResponse> => {
      const payload = {
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        slug: slug.trim(),
        country,
        currency,
        timezone,
        planCode,
        trialDays,
        primaryLocationName: primaryLocationName.trim(),
        primaryLocationShortCode: shortCode.trim().toUpperCase(),
      };
      const res = await fetch("/api/platform/organizations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      return json as CreateOrgResponse;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onCreated?.(result.organization);
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const slugValid = SLUG_RE.test(slug);
  const nameValid = name.trim().length >= 2 && name.trim().length <= 120;
  const shortCodeValid = /^[A-Z][A-Z0-9]{1,11}$/.test(shortCode.trim().toUpperCase());
  const canSubmit = nameValid && slugValid && shortCodeValid && !mutation.isPending;

  const plans = plansQuery.data?.plans?.filter((p) => p.is_active && p.code !== "internal") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0b0b14] border-white/10 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-wider">
              New tenant
            </Badge>
          </div>
          <DialogTitle className="text-lg font-semibold">Launch a Cuetronix workspace</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Creates the organization, a starter subscription and a primary branch. You can
            invite an owner after the workspace exists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="org-name" className="text-zinc-300">
                Display name
              </Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pixel Arcade"
                className="bg-black/40 border-white/10"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="org-legal" className="text-zinc-300">
                Legal entity <span className="text-zinc-500 font-normal">(optional)</span>
              </Label>
              <Input
                id="org-legal"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Pixel Arcade Pvt. Ltd."
                className="bg-black/40 border-white/10"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="org-slug" className="text-zinc-300">
                  Workspace slug
                </Label>
                {slug && (
                  <span
                    className={cn(
                      "text-xs inline-flex items-center gap-1",
                      slugValid ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {slugValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {slugValid ? "valid" : "3–40 chars, a-z0-9-"}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 select-none">
                  /app/t/
                </span>
                <Input
                  id="org-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  placeholder="pixel-arcade"
                  className="bg-black/40 border-white/10 pl-16 font-mono"
                  maxLength={40}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/5 pt-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Region</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <Label className="text-zinc-300 text-xs">Country</Label>
                  <select
                    value={country}
                    onChange={(e) => {
                      const c = COUNTRIES.find((x) => x.code === e.target.value);
                      setCountry(e.target.value);
                      if (c) {
                        setCurrency(c.currency);
                        setTimezone(c.tz);
                      }
                    }}
                    className="mt-1 w-full h-10 rounded-md bg-black/40 border border-white/10 text-sm text-zinc-200 px-3"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-zinc-300 text-xs">Currency</Label>
                  <Input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    className="mt-1 h-10 bg-black/40 border-white/10 font-mono uppercase"
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-xs">Timezone</Label>
                  <Input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1 h-10 bg-black/40 border-white/10 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Primary branch
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-zinc-300 text-xs">Branch name</Label>
                  <Input
                    value={primaryLocationName}
                    onChange={(e) => setPrimaryLocationName(e.target.value)}
                    className="mt-1 h-10 bg-black/40 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-xs">Short code</Label>
                  <Input
                    value={shortCode}
                    onChange={(e) =>
                      setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
                    }
                    className={cn(
                      "mt-1 h-10 bg-black/40 border-white/10 font-mono uppercase",
                      shortCode && !shortCodeValid && "border-rose-500/50",
                    )}
                    maxLength={12}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-white/5 pt-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Plan</div>
              <label className="text-xs text-zinc-400 inline-flex items-center gap-2">
                Trial
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={trialDays}
                  onChange={(e) => setTrialDays(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                  className="w-14 h-7 rounded-md bg-black/40 border border-white/10 text-center text-sm"
                />
                days
              </label>
            </div>

            {plansQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-200 text-xs p-3">
                No plans available. Run the Slice 0 migration to seed the catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map((p) => {
                  const active = planCode === p.code;
                  const price = p.price_inr_month;
                  const maxBranches = (p.features?.max_branches as number) ?? undefined;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlanCode(p.code)}
                      className={cn(
                        "group relative text-left rounded-xl border p-4 transition-all",
                        active
                          ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20",
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="selected-plan"
                          className="absolute inset-0 rounded-xl border-2 border-indigo-500/50 pointer-events-none"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">{p.name}</div>
                          <div className="mt-1 text-xs text-zinc-500 line-clamp-2">
                            {p.description || "Tier"}
                          </div>
                        </div>
                        {active && <Check className="h-4 w-4 text-indigo-300" />}
                      </div>
                      <div className="mt-3 text-lg font-semibold text-zinc-50">
                        {price ? inr.format(price) : "Custom"}
                        <span className="text-xs text-zinc-500 font-normal"> /mo</span>
                      </div>
                      {typeof maxBranches === "number" && (
                        <div className="mt-1 text-[11px] text-zinc-500">
                          up to {maxBranches} branch{maxBranches === 1 ? "" : "es"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
            disabled={!canSubmit}
            className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              "Launch workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
