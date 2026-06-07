/**
 * /platform/sandbox — create and manage demo workspace grants.
 */

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  FlaskConical,
  Loader2,
  Plus,
  ShieldOff,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type GrantRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  organizationId: string;
  orgSlug: string | null;
  orgName: string | null;
  loginEmail: string;
  status: "active" | "expired" | "revoked";
  loginUrl: string | null;
};

type CreateResponse = {
  ok: true;
  grant: {
    id: string;
    orgSlug: string;
    orgName: string;
    clientName: string;
    clientEmail: string;
    expiresAt: string;
    loginEmail: string;
    password: string;
    loginUrl: string;
  };
};

const fetcher = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

function statusBadge(status: GrantRow["status"]) {
  if (status === "active") return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Active</Badge>;
  if (status === "revoked") return <Badge className="bg-red-500/15 text-red-300 border-red-500/30">Revoked</Badge>;
  return <Badge className="bg-zinc-500/15 text-zinc-300 border-zinc-500/30">Expired</Badge>;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function PlatformSandbox() {
  const qc = useQueryClient();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [freshCredentials, setFreshCredentials] = useState<CreateResponse["grant"] | null>(null);

  const listQ = useQuery({
    queryKey: ["platform-sandbox-grants"],
    queryFn: () => fetcher<{ ok: true; grants: GrantRow[] }>("/api/platform/sandbox"),
  });

  const createM = useMutation({
    mutationFn: () =>
      fetcher<CreateResponse>("/api/platform/sandbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientName, clientEmail, clientPhone: clientPhone || undefined }),
      }),
    onSuccess: (data) => {
      setFreshCredentials(data.grant);
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      void qc.invalidateQueries({ queryKey: ["platform-sandbox-grants"] });
      toast.success("Demo workspace created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeM = useMutation({
    mutationFn: (grantId: string) =>
      fetcher<{ ok: true }>("/api/platform/sandbox?op=revoke", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grantId }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-sandbox-grants"] });
      toast.success("Grant revoked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const grants = listQ.data?.grants ?? [];
  const activeCount = useMemo(() => grants.filter((g) => g.status === "active").length, [grants]);

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-amber-500/15 border border-amber-500/30">
            <FlaskConical className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Demo sandboxes</h1>
            <p className="text-sm text-zinc-400">
              Provision 7-day Pro demo workspaces with sample data. Credentials are shown once here — not emailed.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Badge variant="outline" className="border-white/10 text-zinc-300">
            {activeCount} active
          </Badge>
          <Badge variant="outline" className="border-white/10 text-zinc-300">
            {grants.length} total
          </Badge>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create grant
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Gaming Lounge"
              className="bg-black/30 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email (login)</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="prospect@company.com"
              className="bg-black/30 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPhone">Phone (optional)</Label>
            <Input
              id="clientPhone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+91 …"
              className="bg-black/30 border-white/10"
            />
          </div>
        </div>
        <Button
          onClick={() => createM.mutate()}
          disabled={createM.isPending || clientName.trim().length < 2 || !clientEmail.includes("@")}
          className="btn-gradient text-white"
        >
          {createM.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
          Create 7-day demo
        </Button>
      </motion.section>

      {freshCredentials ? (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-amber-200 font-semibold">
            <Check className="h-5 w-5" /> Credentials — copy now (shown once)
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-black/30 p-3 border border-white/10">
              <div className="text-zinc-500 text-xs mb-1">Login URL</div>
              <div className="text-white break-all">{freshCredentials.loginUrl}</div>
              <Button size="sm" variant="ghost" className="mt-2 h-8" onClick={() => copyText("Login URL", freshCredentials.loginUrl)}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
            </div>
            <div className="rounded-lg bg-black/30 p-3 border border-white/10">
              <div className="text-zinc-500 text-xs mb-1">Email / password</div>
              <div className="text-white">{freshCredentials.loginEmail}</div>
              <div className="text-amber-200 font-mono mt-1">{freshCredentials.password}</div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-8"
                onClick={() =>
                  copyText(
                    "Credentials",
                    `URL: ${freshCredentials.loginUrl}\nEmail: ${freshCredentials.loginEmail}\nPassword: ${freshCredentials.password}\nExpires: ${formatDate(freshCredentials.expiresAt)}`,
                  )
                }
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy all
              </Button>
            </div>
          </div>
          <p className="text-xs text-amber-200/70 flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> Expires {formatDate(freshCredentials.expiresAt)} · starts on Pro plan
          </p>
        </motion.section>
      ) : null}

      <section className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <h2 className="font-semibold text-white">All grants</h2>
        </div>
        {listQ.isLoading ? (
          <div className="p-8 text-center text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : grants.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">No demo grants yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {grants.map((g) => (
              <div key={g.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{g.clientName}</span>
                    {statusBadge(g.status)}
                  </div>
                  <div className="text-sm text-zinc-400 truncate">{g.clientEmail}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {g.orgName ?? g.orgSlug} · expires {formatDate(g.expiresAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {g.loginUrl && g.status === "active" ? (
                    <Button size="sm" variant="outline" className="border-white/10" onClick={() => copyText("Login URL", g.loginUrl!)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> URL
                    </Button>
                  ) : null}
                  {g.status === "active" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                      disabled={revokeM.isPending}
                      onClick={() => revokeM.mutate(g.id)}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Revoke
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
