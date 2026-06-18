/**
 * PlatformInviteOwnerDialog — seed the first (or additional) owner of a tenant.
 *
 * Flow:
 *   1. Operator fills username + role, generates a one-time password.
 *   2. Submit creates admin_user + membership + branch links atomically.
 *   3. On success, the dialog pivots to a "credentials reveal" state with
 *      a one-time copy-to-clipboard view. Closing that state is final —
 *      the temp password is never shown again.
 */

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
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

const USERNAME_RE = /^[a-zA-Z0-9._+@-]{3,64}$/;

function suggestPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

type InviteResponse = {
  ok: true;
  owner: {
    adminUserId: string;
    username: string;
    tempPassword: string;
    role: string;
    locationsLinked: number;
  };
  organization: { id: string; slug: string; name: string };
};

export const PlatformInviteOwnerDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  orgSlug: string;
  suggestedUsername?: string;
  onInvited?: () => void;
}> = ({ open, onOpenChange, orgId, orgName, orgSlug, suggestedUsername, onInvited }) => {
  const queryClient = useQueryClient();

  const [username, setUsername] = React.useState("");
  const [role, setRole] = React.useState<"owner" | "admin">("owner");
  const [password, setPassword] = React.useState<string>(() => suggestPassword());
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<InviteResponse["owner"] | null>(null);
  const [copied, setCopied] = React.useState<"username" | "password" | "bundle" | null>(null);

  React.useEffect(() => {
    if (open) {
      setUsername(suggestedUsername || `owner-${orgSlug}`);
      setRole("owner");
      setPassword(suggestPassword());
      setShowPassword(false);
      setError(null);
      setResult(null);
      setCopied(null);
    }
  }, [open, orgSlug, suggestedUsername]);

  const mutation = useMutation({
    mutationFn: async (): Promise<InviteResponse> => {
      const res = await fetch("/api/platform/organization-invite-owner", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          username: username.trim(),
          tempPassword: password,
          role,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      return json as InviteResponse;
    },
    onSuccess: (json) => {
      setResult(json.owner);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onInvited?.();
    },
    onError: (err: Error) => setError(err.message),
  });

  const usernameValid = USERNAME_RE.test(username.trim());
  const passwordValid = password.length >= 8 && password.length <= 128;

  const copy = async (what: "username" | "password" | "bundle", text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Clipboard not available — copy manually.");
    }
  };

  const bundle = result
    ? `Workspace: ${orgName}\nSlug: ${orgSlug}\nUsername: ${result.username}\nTemporary password: ${result.tempPassword}\nRole: ${result.role}\nLogin at: https://cuephoriatech.in/login`
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => {
      // Once credentials are revealed, close resets the whole dialog.
      if (!v && mutation.isPending) return;
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-lg bg-[#0b0b14] border-white/10 text-zinc-100">
        {!result ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center">
                  <UserPlus className="h-3.5 w-3.5 text-white" />
                </div>
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-wider">
                  Invite · {orgSlug}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-semibold">Invite an owner</DialogTitle>
              <DialogDescription className="text-zinc-400">
                This creates a login for <strong className="text-zinc-200">{orgName}</strong>. You'll
                see the password exactly once, so copy it and share it securely.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="invite-username" className="text-zinc-300">Username</Label>
                  {username && !usernameValid && (
                    <span className="text-xs text-rose-400 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> 3–64 chars, . _ + @ -
                    </span>
                  )}
                </div>
                <Input
                  id="invite-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  placeholder={`owner-${orgSlug}`}
                  className="mt-1 bg-black/40 border-white/10 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-zinc-300">Role</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["owner", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "text-sm rounded-lg border px-3 py-2 capitalize transition-colors",
                        role === r
                          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Temporary password</Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showPassword ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassword(suggestPassword())}
                      className="ml-2 text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
                      title="Regenerate"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/40 border-white/10 font-mono"
                    maxLength={128}
                  />
                </div>
                {!passwordValid && (
                  <div className="mt-1 text-xs text-rose-400">8–128 chars required.</div>
                )}
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200 flex items-start gap-2">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  You'll be shown this password once. Share it over a trusted channel and ask
                  the owner to rotate it on first login.
                </span>
              </div>

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
                disabled={!usernameValid || !passwordValid || mutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Create &amp; reveal credentials
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] uppercase tracking-wider">
                  Owner provisioned
                </Badge>
              </div>
              <DialogTitle className="text-lg font-semibold">Copy these credentials</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Share these over a trusted channel. Once you close this dialog, the password
                can't be shown again — only reset.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <CredRow
                label="Username"
                value={result.username}
                onCopy={() => copy("username", result.username)}
                copied={copied === "username"}
                mono
              />
              <CredRow
                label="Temporary password"
                value={result.tempPassword}
                onCopy={() => copy("password", result.tempPassword)}
                copied={copied === "password"}
                mono
                secret
              />
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Bundle</div>
                  <button
                    type="button"
                    onClick={() => copy("bundle", bundle)}
                    className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
                  >
                    {copied === "bundle" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy all
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-zinc-300 leading-relaxed">
                  {bundle}
                </pre>
              </div>

              <div className="text-xs text-zinc-500">
                Linked to <strong className="text-zinc-300">{result.locationsLinked}</strong> branch
                {result.locationsLinked === 1 ? "" : "es"} · role:
                <span className="ml-1 font-mono text-zinc-300">{result.role}</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-white/10 text-zinc-100 hover:bg-white/15"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CredRow: React.FC<{
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
  secret?: boolean;
}> = ({ label, value, onCopy, copied, mono, secret }) => {
  const [show, setShow] = React.useState(!secret);
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="flex items-center gap-2">
          {secret && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
            >
              {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {show ? "Hide" : "Show"}
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className={cn("mt-1 text-sm text-zinc-100 break-all", mono && "font-mono")}>
        {secret && !show ? "•".repeat(Math.min(value.length, 16)) : value}
      </div>
    </div>
  );
};
