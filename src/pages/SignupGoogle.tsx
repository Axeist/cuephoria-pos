/**
 * /signup/google — workspace-picker after a new user has signed in with Google.
 *
 * At this point /api/auth/google/callback has dropped a signed
 * `cuetronix_oauth_ticket` cookie (10 min TTL) carrying the Google identity.
 * We fetch the identity (email / name) from the server, let the user pick
 * a workspace name + URL slug, and POST to /api/tenant/signup-google to
 * create the org.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Gamepad2,
  Globe,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { appToast } from "@/lib/appToast";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type IdentityState =
  | { kind: "loading" }
  | { kind: "ready"; email: string; name: string | null; picture: string | null }
  | { kind: "expired" };

const SignupGoogle: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<IdentityState>({ kind: "loading" });

  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  );
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tenant/signup-google-identity", {
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          identity?: { email: string; name: string | null; picture: string | null };
        };
        if (res.ok && json.ok && json.identity) {
          setState({ kind: "ready", ...json.identity });
          if (json.identity.name) {
            setOrgName(`${json.identity.name}'s workspace`);
          }
        } else {
          setState({ kind: "expired" });
        }
      } catch {
        setState({ kind: "expired" });
      }
    })();
  }, []);

  useEffect(() => {
    if (!slugManuallyEdited) setSlug(slugify(orgName));
  }, [orgName, slugManuallyEdited]);

  const slugValid = useMemo(() => /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug), [slug]);
  const canSubmit =
    orgName.trim().length >= 2 &&
    slugValid &&
    accept &&
    state.kind === "ready" &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/signup-google", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          slug,
          timezone,
          acceptedTerms: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        appToast.success("Workspace created — welcome aboard!");
        navigate("/onboarding", { replace: true });
      } else {
        appToast.error(json.error || "Signup failed.");
      }
    } catch (err) {
      appToast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  if (state.kind === "expired") {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1020] to-[#0b0c16] p-8 text-center">
          <h1 className="text-xl font-bold">Sign-in expired</h1>
          <p className="mt-2 text-sm text-zinc-400">
            The temporary Google session expired. Please start again.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600"
          >
            Back to signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-xl px-6 py-10 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white"
        >
          <Sparkles className="h-3 w-3" />
          Cuetronix
        </Link>

        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1020] to-[#0b0c16] p-8 shadow-2xl">
          {state.picture && (
            <img
              src={state.picture}
              alt=""
              className="h-12 w-12 rounded-full border border-white/10 mb-4"
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            One more step{state.name ? `, ${state.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Signed in as <span className="text-zinc-200">{state.email}</span>. Name your workspace — you can change it later from Settings.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <Gamepad2 className="h-3 w-3" />
                Workspace name
              </Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                maxLength={120}
                placeholder="Neon Arcade · Bangalore"
                className="bg-[#05060c] border-white/10 text-zinc-100 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                Workspace URL
              </Label>
              <div className="flex items-center rounded-xl border border-white/10 bg-[#05060c] h-11 overflow-hidden">
                <span className="px-3 text-xs text-zinc-500 border-r border-white/10 whitespace-nowrap">
                  cuetronix.app/
                </span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugManuallyEdited(true);
                  }}
                  className="flex-1 bg-transparent outline-none px-3 text-zinc-100 text-sm"
                  placeholder="neon-arcade"
                />
              </div>
              {slug && !slugValid && (
                <p className="text-[11px] text-red-400">
                  3–40 characters, lowercase letters / digits / dashes, starting with a letter.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Timezone
              </Label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#05060c] border border-white/10 text-zinc-100 px-3 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <label className="mt-2 flex items-start gap-3 rounded-xl border border-white/10 bg-[#05060c] p-3">
              <Checkbox
                checked={accept}
                onCheckedChange={(v) => setAccept(Boolean(v))}
                className="mt-0.5"
              />
              <span className="text-xs text-zinc-400">
                I agree to the{" "}
                <a href="/terms" className="text-fuchsia-400 hover:text-fuchsia-300">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-fuchsia-400 hover:text-fuchsia-300">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating workspace…
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Email pre-verified via Google · 14-day free trial
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupGoogle;
