/**
 * /reset-password — consume a password reset token and set a new password.
 * On success sends the user back to /login.
 */

import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/appToast";

const RULES = [
  { id: "len", label: "At least 10 characters", test: (p: string) => p.length >= 10 },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit", label: "A digit", test: (p: string) => /\d/.test(p) },
];

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const valid = RULES.every((r) => r.test(password)) && password === confirm && !!token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      } else {
        appToast.error(json.error || "Could not reset password.");
      }
    } catch (err) {
      appToast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1020] to-[#0b0c16] p-8">
          <h1 className="text-xl font-bold">Missing token</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This link is incomplete. Request a new password reset from the login page.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1020] to-[#0b0c16] p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">Cuetronix</span>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="text-sm text-zinc-400">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Pick a new password</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Make it long and memorable. You'll be signed out everywhere else.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  New password
                </Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#05060c] border-white/10 text-zinc-100 h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                  {RULES.map((r) => (
                    <li
                      key={r.id}
                      className={
                        r.test(password)
                          ? "text-emerald-400/80"
                          : "text-zinc-500"
                      }
                    >
                      • {r.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Confirm password
                </Label>
                <Input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="bg-[#05060c] border-white/10 text-zinc-100 h-11"
                />
                {confirm && confirm !== password && (
                  <p className="text-[11px] text-red-400">Passwords don't match.</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!valid || submitting}
                className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating…
                  </>
                ) : (
                  "Set new password"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
