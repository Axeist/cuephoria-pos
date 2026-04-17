/**
 * /account/verify-email — consumes the token from the verification link
 * and surfaces a friendly success / failure screen.
 */

import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldAlert, Sparkles } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "ok"; email: string }
  | { kind: "error"; message: string };

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
          setState({ kind: "ok", email: json.email || "" });
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
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1020] to-[#0b0c16] p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">Cuetronix</span>
        </div>

        {state.kind === "loading" && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
            <p className="text-sm text-zinc-400">Confirming your email…</p>
          </div>
        )}

        {state.kind === "ok" && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="text-sm text-zinc-400">
              {state.email || "Your email address"} is now confirmed. You can close this tab or head back to the app.
            </p>
            <Link
              to="/dashboard"
              className="mt-2 inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">Link didn't work</h1>
            <p className="text-sm text-zinc-400">{state.message}</p>
            <p className="text-xs text-zinc-500">
              Sign in and request a new verification email from Account &rarr; Security.
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/15"
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
