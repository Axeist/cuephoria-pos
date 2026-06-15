/**
 * /account/verify-email — consumes the token from the verification link
 * and surfaces a friendly success / failure screen.
 */

import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert, Sparkles } from "lucide-react";

type State = { kind: "loading" } | { kind: "error"; message: string };

const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ kind: "error", message: "Missing verification token." });
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/admin/verify-email", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          email?: string;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && json.ok) {
          try {
            sessionStorage.setItem("gh_show_login_splash_v1", "1");
          } catch {
            /* ignore */
          }
          window.location.replace("/onboarding");
          return;
        } else {
          setState({ kind: "error", message: json.error || "Verification failed." });
        }
      } catch (err) {
        if (cancelled) return;
        setState({ kind: "error", message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="lp-root relative min-h-screen overflow-hidden bg-[#05060b] text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="lp-aurora" />
      <div className="lp-grid" />
      <div className="lp-glass lp-grain relative z-10 w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="lp-display text-sm font-bold tracking-tight">Cuetronix</span>
        </div>

        {state.kind === "loading" && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
            <p className="text-sm text-zinc-400">Confirming your email and signing you in…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="lp-display text-2xl font-bold">Link didn't work</h1>
            <p className="text-sm text-zinc-400">{state.message}</p>
            <p className="text-xs text-zinc-500">
              Sign in and request a new verification email from Account &rarr; Security.
            </p>
            <Link
              to="/login"
              className="lp-btn-ghost mt-2 h-11 px-6 text-sm"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
