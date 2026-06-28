import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Globe, Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SplashScreen from "@/components/SplashScreen";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";
import {
  SIGNUP_TIMEZONES,
  slugifyWorkspace,
  useSignupGoogleWorkspace,
} from "@/hooks/useSignupGoogleWorkspace";

const MobileSignupGoogle: React.FC = () => {
  const ws = useSignupGoogleWorkspace({
    onSuccessNavigate: "/onboarding",
    signupBackPath: "/app/signup",
  });

  if (ws.state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05060b]">
        <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  if (ws.state.kind === "expired") {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center bg-[#05060b] px-4 text-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <AuthSceneBackground />
        <div className="relative z-10 max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 text-center backdrop-blur-md">
          <h1 className="text-xl font-bold">Sign-in expired</h1>
          <p className="mt-2 text-sm text-gray-400">Please start signup again.</p>
          <Link
            to="/app/signup"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-semibold"
          >
            Back to signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-[#05060b] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ws.showSuccessSplash && (
        <SplashScreen variant="login_success" onDone={ws.finishSuccessSplash} />
      )}
      <AuthSceneBackground />

      <div className="relative z-10 mx-auto max-w-md px-5 py-8">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-md">
          {ws.state.picture && (
            <img
              src={ws.state.picture}
              alt=""
              className="mb-4 h-12 w-12 rounded-full border border-white/10"
            />
          )}
          <h1 className="text-xl font-bold">Name your workspace</h1>
          <p className="mt-1 text-sm text-gray-400">
            Signed in as <span className="text-gray-200">{ws.state.email}</span>
          </p>

          <form onSubmit={ws.onSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-owner-name" className="text-xs uppercase tracking-wide text-gray-400">
                Your name *
              </Label>
              <Input
                id="m-owner-name"
                value={ws.ownerDisplayName}
                onChange={(e) => ws.setOwnerDisplayName(e.target.value)}
                className="h-12 border-white/10 bg-white/[0.04] text-white"
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-owner-phone" className="text-xs uppercase tracking-wide text-gray-400">
                Phone *
              </Label>
              <Input
                id="m-owner-phone"
                type="tel"
                inputMode="numeric"
                value={ws.ownerPhone}
                onChange={(e) => ws.setOwnerPhone(e.target.value)}
                className="h-12 border-white/10 bg-white/[0.04] text-white"
                placeholder="10-digit mobile"
                required
              />
              {ws.ownerPhone.trim() && !ws.phoneValid && (
                <p className="text-[11px] text-red-400">Enter a valid 10-digit Indian mobile number.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Gamepad2 className="h-3 w-3" /> Workspace name
              </Label>
              <Input
                value={ws.orgName}
                onChange={(e) => ws.setOrgName(e.target.value)}
                className="h-12 border-white/10 bg-white/[0.04] text-white"
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <Globe className="h-3 w-3" /> URL slug
              </Label>
              <div className="flex h-12 items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                <span className="border-r border-white/10 px-2 text-[10px] text-gray-500">/</span>
                <input
                  value={ws.slug}
                  onChange={(e) => {
                    ws.setSlug(slugifyWorkspace(e.target.value));
                    ws.setSlugManuallyEdited(true);
                  }}
                  className="flex-1 bg-transparent px-2 text-sm outline-none"
                  placeholder="my-venue"
                />
              </div>
              {ws.slug && !ws.slugValid && (
                <p className="text-[11px] text-red-400">3–40 chars, lowercase, start with a letter.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-gray-400">Timezone</Label>
              <select
                value={ws.timezone}
                onChange={(e) => ws.setTimezone(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
              >
                {SIGNUP_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
              <Checkbox
                checked={ws.accept}
                onCheckedChange={(v) => ws.setAccept(Boolean(v))}
                className="mt-0.5"
              />
              <span className="text-xs text-gray-400">
                I agree to the{" "}
                <a href="/terms" className="text-fuchsia-400">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-fuchsia-400">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={!ws.canSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold disabled:opacity-50"
            >
              {ws.submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create workspace <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1 text-[11px] text-gray-500">
              <ShieldCheck className="h-3 w-3" />
              Email verified via Google
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MobileSignupGoogle;
