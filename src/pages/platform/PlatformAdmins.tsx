import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  ShieldOff,
  UserCog,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePlatformAuth } from "@/context/PlatformAuthContext";

type PlatformAdminRow = {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const relative = (iso: string | null) => {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const randomPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join("");
};

const PlatformAdmins: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { admin } = usePlatformAuth();
  const [q, setQ] = React.useState("");

  const [email, setEmail] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [resetTarget, setResetTarget] = React.useState<PlatformAdminRow | null>(null);
  const [resetPassword, setResetPassword] = React.useState("");

  const adminsQuery = useQuery({
    queryKey: ["platform", "platform-admins"],
    queryFn: () => fetcher<{ ok: true; admins: PlatformAdminRow[] }>("/api/platform/platform-admins"),
    staleTime: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetcher<{ ok: true; admin: PlatformAdminRow }>("/api/platform/platform-admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), password }),
      }),
    onSuccess: (result) => {
      toast({
        title: "Platform admin created",
        description: `${result.admin.email} can now sign in to the operator console.`,
      });
      setEmail("");
      setDisplayName("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["platform", "platform-admins"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "audit"] });
    },
    onError: (err: Error) => {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    },
  });

  const activeMutation = useMutation({
    mutationFn: ({ adminId, isActive }: { adminId: string; isActive: boolean }) =>
      fetcher<{ ok: true; admin: PlatformAdminRow }>("/api/platform/platform-admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-active", adminId, isActive }),
      }),
    onSuccess: (result) => {
      toast({
        title: result.admin.is_active ? "Admin activated" : "Admin deactivated",
        description: result.admin.email,
      });
      queryClient.invalidateQueries({ queryKey: ["platform", "platform-admins"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "audit"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ adminId, newPassword }: { adminId: string; newPassword: string }) =>
      fetcher<{ ok: true }>("/api/platform/platform-admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset-password", adminId, newPassword }),
      }),
    onSuccess: () => {
      toast({ title: "Password reset", description: "The new password is now active." });
      setResetTarget(null);
      setResetPassword("");
      queryClient.invalidateQueries({ queryKey: ["platform", "audit"] });
    },
    onError: (err: Error) => {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    },
  });

  const allAdmins = React.useMemo(() => adminsQuery.data?.admins ?? [], [adminsQuery.data?.admins]);
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return allAdmins;
    return allAdmins.filter((row) =>
      [row.email, row.display_name ?? ""].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [allAdmins, q]);

  const activeCount = allAdmins.filter((a) => a.is_active).length;
  const inactiveCount = allAdmins.length - activeCount;
  const recentLogins = allAdmins.filter((a) => {
    if (!a.last_login_at) return false;
    return Date.now() - new Date(a.last_login_at).getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c0d18] to-[#101227] p-6"
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              <Shield className="h-3.5 w-3.5 text-indigo-300" />
              Platform Admin Access
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">Platform admins</h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
              Manage operator accounts, rotate credentials, and keep privileged access controlled.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
            onClick={() => adminsQuery.refetch()}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", adminsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </motion.header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatTile label="Total admins" value={allAdmins.length} icon={UsersRound} accent="indigo" />
        <StatTile label="Active" value={activeCount} icon={CheckCircle2} accent="emerald" sub={`${inactiveCount} inactive`} />
        <StatTile label="Logged in (7d)" value={recentLogins} icon={UserCog} accent="cyan" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-zinc-100">Create platform admin</div>
          <div className="mt-1 text-xs text-zinc-500">Use a unique email and temporary strong password.</div>
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs text-zinc-500">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-black/30 border-white/10"
                placeholder="admin@company.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Display name (optional)</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 bg-black/30 border-white/10"
                placeholder="Ops team"
                autoComplete="off"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-500">Temporary password</Label>
                <button
                  type="button"
                  className="text-[11px] text-indigo-300 hover:text-indigo-200"
                  onClick={() => setPassword(randomPassword())}
                >
                  Generate
                </button>
              </div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-black/30 border-white/10 font-mono text-sm"
                placeholder="Minimum 12 characters"
                autoComplete="new-password"
              />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90"
              disabled={createMutation.isPending || !email.trim() || password.length < 12}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create admin user
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Operator roster</div>
              <div className="text-xs text-zinc-500">
                {adminsQuery.isLoading ? "Loading…" : `${filtered.length} of ${allAdmins.length}`}
              </div>
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email or name"
              className="h-9 w-64 bg-black/30 border-white/10"
            />
          </div>

          {adminsQuery.isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-white/5" />
              ))}
            </div>
          ) : adminsQuery.isError ? (
            <div className="p-8 text-center text-sm text-rose-300">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              {(adminsQuery.error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">No platform admins match your filter.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((row) => {
                const isSelf = row.id === admin?.id;
                return (
                  <div key={row.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-zinc-100 truncate">{row.display_name || row.email}</div>
                        {isSelf && (
                          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px]">
                            You
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] border",
                            row.is_active
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
                          )}
                        >
                          {row.is_active ? "active" : "inactive"}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{row.email}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-600">
                        Last login {relative(row.last_login_at)} · created {fmtDateTime(row.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-300 hover:text-white hover:bg-white/10"
                        onClick={() => {
                          setResetTarget(row);
                          setResetPassword(randomPassword());
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          row.is_active
                            ? "text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                            : "text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10",
                        )}
                        disabled={activeMutation.isPending}
                        onClick={() => activeMutation.mutate({ adminId: row.id, isActive: !row.is_active })}
                      >
                        {row.is_active ? (
                          <>
                            <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Shield className="h-3.5 w-3.5 mr-1.5" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <AlertDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open && !resetMutation.isPending) {
            setResetTarget(null);
            setResetPassword("");
          }
        }}
      >
        <AlertDialogContent className="bg-[#0b0b14] border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password for {resetTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Share the new password securely. The old password stops working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">New password</Label>
            <Input
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="bg-black/30 border-white/10 font-mono"
              autoComplete="new-password"
            />
            <div className="text-[11px] text-zinc-500">Minimum 12 characters.</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300" disabled={resetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-90"
              disabled={resetMutation.isPending || !resetTarget || resetPassword.length < 12}
              onClick={(e) => {
                e.preventDefault();
                if (!resetTarget) return;
                resetMutation.mutate({ adminId: resetTarget.id, newPassword: resetPassword });
              }}
            >
              {resetMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reset password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatTile: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "indigo" | "emerald" | "cyan";
  sub?: string;
}> = ({ label, value, icon: Icon, accent, sub }) => {
  const tone = {
    indigo: "text-indigo-300 bg-indigo-500/10",
    emerald: "text-emerald-300 bg-emerald-500/10",
    cyan: "text-cyan-300 bg-cyan-500/10",
  }[accent];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</div>
        <div className={cn("rounded-lg p-2", tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">{value.toLocaleString()}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
};

export default PlatformAdmins;
