/**
 * /forgot-password — kick off a password reset email.
 *
 * The API is intentionally constant-time (always 200) so attackers can't
 * enumerate accounts; we therefore always show the same success message.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      /* always pretend success */
    } finally {
      setSubmitting(false);
      setSent(true);
    }
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

        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Enter the email on your account. If it matches an active workspace, we'll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200/80">
            If <strong className="text-emerald-100">{email}</strong> belongs to a Cuetronix workspace, a reset link is on its way. It expires in 30 minutes.
            <p className="mt-2 text-xs text-emerald-200/60">
              Didn't get it? Check spam, or try again in a minute.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                Email
              </Label>
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="owner@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#05060c] border-white/10 text-zinc-100 h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !email.includes("@")}
              className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 text-white font-semibold rounded-xl"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send reset link
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-fuchsia-400"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
