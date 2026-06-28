import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appToast } from "@/lib/appToast";
import { validateIndianMobile } from "@/lib/phone";
import { hideKeyboard, hapticImpact, isNativePlatform } from "@/utils/capacitor";

export const SIGNUP_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
] as const;

export function slugifyWorkspace(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export type SignupGoogleIdentityState =
  | { kind: "loading" }
  | { kind: "ready"; email: string; name: string | null; picture: string | null }
  | { kind: "expired" };

export interface UseSignupGoogleWorkspaceOptions {
  onSuccessNavigate?: string;
  signupBackPath?: string;
}

export function useSignupGoogleWorkspace(options: UseSignupGoogleWorkspaceOptions = {}) {
  const navigate = useNavigate();
  const { onSuccessNavigate = "/", signupBackPath = "/signup" } = options;

  const [state, setState] = useState<SignupGoogleIdentityState>({ kind: "loading" });
  const [orgName, setOrgName] = useState("");
  const [ownerDisplayName, setOwnerDisplayName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  );
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);

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
            setOwnerDisplayName(json.identity.name);
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
    if (!slugManuallyEdited) setSlug(slugifyWorkspace(orgName));
  }, [orgName, slugManuallyEdited]);

  const phoneValid = useMemo(() => validateIndianMobile(ownerPhone).valid, [ownerPhone]);
  const slugValid = useMemo(() => /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug), [slug]);
  const canSubmit =
    orgName.trim().length >= 2 &&
    ownerDisplayName.trim().length >= 2 &&
    phoneValid &&
    slugValid &&
    accept &&
    state.kind === "ready" &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (isNativePlatform()) await hideKeyboard();
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
          displayName: ownerDisplayName.trim(),
          phone: ownerPhone.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        organization?: { pendingApproval?: boolean; status?: string };
      };
      if (res.ok && json.ok) {
        const pending =
          json.organization?.pendingApproval || json.organization?.status === "pending_approval";
        appToast.success(
          pending
            ? "Application submitted — we'll email you when approved."
            : "Workspace created — continue in onboarding.",
        );
        if (isNativePlatform()) await hapticImpact("light");
        try {
          sessionStorage.removeItem("gh_show_login_splash_v1");
        } catch {
          /* ignore */
        }
        setShowSuccessSplash(true);
        return;
      }
      appToast.error(json.error || "Signup failed.");
    } catch (err) {
      appToast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const finishSuccessSplash = () => {
    setShowSuccessSplash(false);
    navigate(onSuccessNavigate, { replace: true });
  };

  return {
    state,
    orgName,
    setOrgName,
    ownerDisplayName,
    setOwnerDisplayName,
    ownerPhone,
    setOwnerPhone,
    slug,
    setSlug,
    slugManuallyEdited,
    setSlugManuallyEdited,
    timezone,
    setTimezone,
    accept,
    setAccept,
    submitting,
    showSuccessSplash,
    canSubmit,
    phoneValid,
    slugValid,
    onSubmit,
    finishSuccessSplash,
    signupBackPath,
  };
}
