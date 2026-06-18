/**
 * /account/security — owner/admin personal security controls.
 *
 * Today: TOTP enrolment wizard with backup codes and disable/regenerate flows.
 * (Lives outside /settings/organization because it's *per-user*, not per-org.)
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TotpStatus {
  ok: true;
  enabled: boolean;
  pending: boolean;
  backupCodesRemaining: number;
  enrolledAt: string | null;
}

interface StartResp {
  ok: true;
  secret: string;
  otpauthUri: string;
  issuer: string;
  label: string;
}

export default function AccountSecurity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [enrolling, setEnrolling] = React.useState<StartResp | null>(null);
  const [code, setCode] = React.useState("");
  const [disableCode, setDisableCode] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState<string[] | null>(null);

  const statusQ = useQuery<TotpStatus>({
    queryKey: ["admin-totp-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/totp", { credentials: "include" });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Failed to load status");
      return json;
    },
    staleTime: 10_000,
  });

  const startM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Failed to start enrolment");
      return json as StartResp;
    },
    onSuccess: (data) => {
      setEnrolling(data);
      setCode("");
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Enroll failed", description: err.message }),
  });

  const verifyM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify-enroll", code }),
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Verification failed");
      return json as { backupCodes: string[] | null };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-totp-status"] });
      setEnrolling(null);
      setCode("");
      if (data.backupCodes?.length) {
        setBackupCodes(data.backupCodes);
      }
      toast({ title: "Two-factor authentication on", description: "Your account is now protected." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Verification failed", description: err.message }),
  });

  const regenM = useMutation({
    mutationFn: async (codeArg: string) => {
      const res = await fetch("/api/admin/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "regenerate-backup", code: codeArg }),
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Regenerate failed");
      return json as { backupCodes: string[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-totp-status"] });
      setBackupCodes(data.backupCodes);
      toast({ title: "New backup codes issued", description: "Old codes are now invalid." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const disableM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "disable", code: disableCode }),
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error || "Disable failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-totp-status"] });
      setDisableCode("");
      toast({ title: "Two-factor disabled", description: "You can re-enable at any time." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Disable failed", description: err.message }),
  });

  const downloadCodes = () => {
    if (!backupCodes) return;
    const body = [
      "Cuetronix two-factor backup codes",
      "---------------------------------",
      `Generated: ${new Date().toISOString()}`,
      "Each code is single-use. Store in your password manager.",
      "",
      ...backupCodes,
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuetronix-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const status = statusQ.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Account security
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a second factor to your login. Strongly recommended for owners and admins.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Two-factor authentication
              {status?.enabled && (
                <Badge className="ml-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Time-based one-time passwords (TOTP) work with Google Authenticator, 1Password, Authy, and every other
              major authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusQ.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

            {/* Not enrolled */}
            {status && !status.enabled && !enrolling && (
              <Button onClick={() => startM.mutate()} disabled={startM.isPending}>
                {startM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enable two-factor auth
              </Button>
            )}

            {/* Enrolment in progress */}
            {enrolling && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <div className="text-sm font-semibold">Step 1 — scan this in your authenticator app</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Can't scan? Type the secret manually.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="rounded-md border border-border bg-white p-2">
                    <img
                      alt="QR code for authenticator app"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(enrolling.otpauthUri)}`}
                      className="h-48 w-48"
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Account</div>
                      <div className="font-mono">{enrolling.issuer}:{enrolling.label}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Secret</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background border border-border rounded px-2 py-1 font-mono flex-1 break-all">
                          {enrolling.secret}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(enrolling.secret).catch(() => undefined);
                            toast({ title: "Copied" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Step 2 — enter the 6-digit code</div>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="text-center font-mono tracking-[0.4em]"
                    />
                    <Button onClick={() => verifyM.mutate()} disabled={code.length !== 6 || verifyM.isPending}>
                      {verifyM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Verify
                    </Button>
                  </div>
                </div>

                <Button variant="ghost" onClick={() => setEnrolling(null)}>
                  Cancel enrolment
                </Button>
              </div>
            )}

            {/* Enabled — show backup-code management + disable */}
            {status?.enabled && !enrolling && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Enrolled {status.enrolledAt && new Date(status.enrolledAt).toLocaleDateString()}
                  {" · "}
                  {status.backupCodesRemaining} backup code{status.backupCodesRemaining === 1 ? "" : "s"} remaining
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold">Regenerate backup codes</div>
                    <p className="text-xs text-muted-foreground">
                      Enter a current 2FA code to invalidate the old set and issue a fresh 10.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="text-center font-mono tracking-[0.4em]"
                    />
                    <Button
                      variant="outline"
                      disabled={code.length !== 6 || regenM.isPending}
                      onClick={() => regenM.mutate(code)}
                    >
                      {regenM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Regenerate
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <ShieldOff className="h-4 w-4" />
                      Disable two-factor auth
                    </div>
                    <p className="text-xs text-rose-600/90 dark:text-rose-400/90">
                      Proceed only if you've lost access to your authenticator. Enter a current code to confirm.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      className="text-center font-mono tracking-[0.4em]"
                    />
                    <Button
                      variant="destructive"
                      disabled={disableCode.length !== 6 || disableM.isPending}
                      onClick={() => disableM.mutate()}
                    >
                      {disableM.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Backup codes reveal */}
            {backupCodes && (
              <div className="rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      Save these backup codes now
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Each code works once. Store them in your password manager — you won't see them again.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((c) => (
                    <code key={c} className="rounded bg-background border border-border px-2 py-1 text-center">
                      {c}
                    </code>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={downloadCodes}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => undefined);
                      toast({ title: "Codes copied to clipboard" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setBackupCodes(null)}>
                    I've saved them
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/settings/organization" className="text-xs text-muted-foreground hover:text-foreground">
            Back to organization settings
          </Link>
        </div>
      </div>
    </div>
  );
}
