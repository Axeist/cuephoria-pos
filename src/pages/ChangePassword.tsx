/**
 * /account/change-password
 *
 * Self-service password rotation. Two modes:
 *   - "Forced" when the authenticated user has `mustChangePassword = true`
 *     (invited tenant owners on first login). Logout button is still
 *     reachable so they can escape; otherwise nav is suppressed by the
 *     ProtectedRoute guard until rotation completes.
 *   - "Voluntary" for anyone in Settings deciding to rotate.
 *
 * Client-side guards: length, match, cannot equal current. Server re-checks
 * all of these; UI is purely cosmetic assistance.
 */

import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const scorePassword = (pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } => {
  if (!pw) return { score: 0, label: "—" };
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["very weak", "weak", "ok", "strong", "excellent"];
  return { score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4, label: labels[Math.min(score, 4)] };
};

const ChangePassword: React.FC = () => {
  const { user, isLoading, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-cuephoria-dark">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNext, setShowNext] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const forced = !!user?.mustChangePassword;

  const { score, label } = scorePassword(next);
  const lengthOk = next.length >= 8 && next.length <= 128;
  const matches = confirm.length > 0 && confirm === next;
  const differs = next.length > 0 && next !== current;
  const canSubmit = lengthOk && matches && differs && current.length > 0 && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await changePassword(current, next);
    setSubmitting(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    toast.success("Password updated. You're good to go.");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-cuephoria-darker to-black grid place-items-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple grid place-items-center">
                <KeyRound className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Set a new password</CardTitle>
                <CardDescription>
                  {forced
                    ? "Welcome! Please rotate the temporary password before we let you in."
                    : `Logged in as ${user?.username ?? ""}.`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <Field
                label={forced ? "Temporary password" : "Current password"}
                value={current}
                onChange={setCurrent}
                show={showCurrent}
                setShow={setShowCurrent}
                autoComplete="current-password"
                autoFocus
              />

              <div>
                <Field
                  label="New password"
                  value={next}
                  onChange={setNext}
                  show={showNext}
                  setShow={setShowNext}
                  autoComplete="new-password"
                />
                {next && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={[
                          "h-full rounded-full transition-all",
                          score <= 1 ? "bg-rose-500 w-1/4" : "",
                          score === 2 ? "bg-amber-500 w-2/4" : "",
                          score === 3 ? "bg-emerald-500 w-3/4" : "",
                          score === 4 ? "bg-cyan-400 w-full" : "",
                        ].join(" ")}
                      />
                    </div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Confirm new password</Label>
                <Input
                  className="mt-1"
                  type={showNext ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                {confirm && !matches && (
                  <div className="mt-1 text-[11px] text-rose-400 inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Passwords don't match.
                  </div>
                )}
              </div>

              <ul className="text-[11px] space-y-1 text-muted-foreground">
                <Rule ok={lengthOk}>8–128 characters</Rule>
                <Rule ok={differs}>Different from your current password</Rule>
                <Rule ok={matches}>Confirmation matches</Rule>
              </ul>

              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Sign out
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      {forced ? "Set password & continue" : "Update password"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  autoComplete: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, show, setShow, autoComplete, autoFocus }) => (
  <div>
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <button
        type="button"
        className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {show ? "Hide" : "Show"}
      </button>
    </div>
    <Input
      className="mt-1"
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
    />
  </div>
);

const Rule: React.FC<{ ok: boolean; children: React.ReactNode }> = ({ ok, children }) => (
  <li className={["flex items-center gap-1.5", ok ? "text-emerald-400" : ""].join(" ")}>
    {ok ? <Check className="h-3 w-3" /> : <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground/40" />}
    {children}
  </li>
);

export default ChangePassword;
