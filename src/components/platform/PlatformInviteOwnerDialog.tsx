/**
 * PlatformInviteOwnerDialog — seed owner/admin on a tenant for Google sign-in.
 *
 * Creates admin_user without a password; invitee signs in at /login with Google
 * using the same email so OAuth can link `google_sub`.
 */

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteResponse = {
  ok: true;
  owner: {
    adminUserId: string;
    username: string;
    email: string;
    role: string;
    locationsLinked: number;
  };
  organization: { id: string; slug: string; name: string };
};

const LOGIN_URL = "https://cuephoriatech.in/login";

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
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"owner" | "admin">("owner");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<InviteResponse["owner"] | null>(null);
  const [copied, setCopied] = React.useState<"email" | "username" | "bundle" | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<InviteResponse> => {
      const res = await fetch("/api/platform/organization-invite-owner", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId,
          username: username.trim(),
          email: email.trim().toLowerCase(),
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

  React.useEffect(() => {
    if (open) {
      setUsername(suggestedUsername || `owner-${orgSlug}`);
      setEmail("");
      setRole("owner");
      setError(null);
      setResult(null);
      setCopied(null);
    }
  }, [open, orgSlug, suggestedUsername]);

  const handleOpenChange = (v: boolean) => {
    if (!v && mutation.isPending) return;
    onOpenChange(v);
  };

  const usernameValid = USERNAME_RE.test(username.trim());
  const emailTrimmed = email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(emailTrimmed);

  const copy = async (what: "email" | "username" | "bundle", text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Clipboard not available — copy manually.");
    }
  };

  const bundle = result
    ? `Workspace: ${orgName}\nSlug: ${orgSlug}\nEmail (must match Google): ${result.email}\nUsername: ${result.username}\nRole: ${result.role}\nSign in: ${LOGIN_URL} → Continue with Google`
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                Creates their profile on <strong className="text-zinc-200">{orgName}</strong>. They{" "}
                <strong className="text-zinc-200">must use Continue with Google</strong> on the login page
                with this exact email so we can link their Google account.
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="invite-email" className="text-zinc-300">Email</Label>
                  {emailTrimmed && !emailValid && (
                    <span className="text-xs text-rose-400 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Valid email required
                    </span>
                  )}
                </div>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trimStart())}
                  placeholder="owner@example.com"
                  className="mt-1 bg-black/40 border-white/10"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Must be the same address they will use with Google (e.g. Workspace @cuetronix.com).
                </p>
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

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200 flex items-start gap-2">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>No password is set. If they try a different Google account, sign-in will fail until the email on file matches.</span>
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
                onClick={() => handleOpenChange(false)}
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
                disabled={!usernameValid || !emailValid || mutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create invite"
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
              <DialogTitle className="text-lg font-semibold">Share sign-in instructions</DialogTitle>
              <DialogDescription className="text-zinc-400">
                They should open the login page and use <strong className="text-zinc-200">Continue with Google</strong>{" "}
                with the email below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <CredRow
                label="Email (Google)"
                value={result.email}
                onCopy={() => copy("email", result.email)}
                copied={copied === "email"}
              />
              <CredRow
                label="Username"
                value={result.username}
                onCopy={() => copy("username", result.username)}
                copied={copied === "username"}
                mono
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
                onClick={() => handleOpenChange(false)}
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
}> = ({ label, value, onCopy, copied, mono }) => {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className={cn("mt-1 text-sm text-zinc-100 break-all", mono && "font-mono")}>
        {value}
      </div>
    </div>
  );
};
