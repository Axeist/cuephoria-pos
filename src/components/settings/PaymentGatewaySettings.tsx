import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Provider = "razorpay" | "stripe";
type Mode = "test" | "live";

type PaymentConfig = {
  id: string;
  provider: Provider;
  mode: Mode;
  is_enabled: boolean;
  supported_currencies: string[];
  is_international_enabled: boolean;
  webhook_configured: boolean;
  webhook_last_event_at: string | null;
  settings: Record<string, unknown>;
  public_key_masked: string | null;
  has_secret: boolean;
  provider_ready: boolean;
};

type ConfigResponse = { ok: true; configs: PaymentConfig[] };

const PROVIDERS: Provider[] = ["razorpay", "stripe"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const json = await response.json();
  if (!response.ok || json?.ok === false) {
    throw new Error(json?.error || `Request failed (${response.status})`);
  }
  return json as T;
}

function prettyDate(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString("en-IN");
  } catch {
    return "Unknown";
  }
}

export default function PaymentGatewaySettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [drafts, setDrafts] = React.useState<Record<string, PaymentConfig>>({});

  const configQuery = useQuery({
    queryKey: ["admin-payment-config"],
    queryFn: () => fetchJson<ConfigResponse>("/api/admin/payment-config"),
  });

  React.useEffect(() => {
    if (!configQuery.data) return;
    const map: Record<string, PaymentConfig> = {};
    for (const provider of PROVIDERS) {
      const existing = configQuery.data.configs.find((c) => c.provider === provider);
      map[provider] =
        existing ??
        ({
          id: `draft-${provider}`,
          provider,
          mode: "test",
          is_enabled: provider === "razorpay",
          supported_currencies: ["INR"],
          is_international_enabled: false,
          webhook_configured: false,
          webhook_last_event_at: null,
          settings: {},
          public_key_masked: null,
          has_secret: false,
          provider_ready: false,
        } as PaymentConfig);
    }
    setDrafts(map);
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (row: PaymentConfig) =>
      fetchJson<{ ok: true }>("/api/admin/payment-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: row.provider,
          mode: row.mode,
          is_enabled: row.is_enabled,
          supported_currencies: row.supported_currencies,
          is_international_enabled: row.is_international_enabled,
          webhook_configured: row.webhook_configured,
          settings: row.settings,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
      toast({ title: "Payment config saved" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (args: { provider: Provider; action: "test-credentials" | "webhook-health" }) =>
      fetchJson<{ ok: true; result?: { ok: boolean; message: string }; webhook?: { configured: boolean; last_event_at: string | null } }>(
        "/api/admin/payment-config",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      ),
    onSuccess: (payload, args) => {
      if (args.action === "test-credentials") {
        const status = payload.result?.ok ? "Connection successful" : "Connection failed";
        toast({
          title: `${args.provider.toUpperCase()} ${status}`,
          description: payload.result?.message,
          variant: payload.result?.ok ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Webhook health refreshed",
          description: `Last event: ${prettyDate(payload.webhook?.last_event_at ?? null)}`,
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    },
  });

  if (configQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (configQuery.isError) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardContent className="py-8 text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {(configQuery.error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const updateProvider = (provider: Provider, updater: (cur: PaymentConfig) => PaymentConfig) => {
    setDrafts((prev) => ({ ...prev, [provider]: updater(prev[provider]) }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Payment gateway configuration
          </CardTitle>
          <CardDescription>
            Razorpay is active now. Stripe is scaffolded for later activation.
          </CardDescription>
        </CardHeader>
      </Card>

      {PROVIDERS.map((provider) => {
        const row = drafts[provider];
        if (!row) return null;
        const currencies = row.supported_currencies.join(", ");
        const stripeLocked = provider === "stripe";

        return (
          <Card key={provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{provider.toUpperCase()}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={row.provider_ready ? "default" : "secondary"}>
                    {row.provider_ready ? "Ready" : "Needs setup"}
                  </Badge>
                  {stripeLocked && <Badge variant="outline">Coming soon</Badge>}
                </div>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-3">
                <span>Public key: {row.public_key_masked || "Not found"}</span>
                <span>Secret: {row.has_secret ? "Present" : "Missing"}</span>
                <span>Webhook: {row.webhook_configured ? "Configured" : "Not configured"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={row.mode}
                    onValueChange={(value) =>
                      updateProvider(provider, (cur) => ({ ...cur, mode: value as Mode }))
                    }
                    disabled={stripeLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supported currencies (comma separated)</Label>
                  <Input
                    value={currencies}
                    onChange={(e) =>
                      updateProvider(provider, (cur) => ({
                        ...cur,
                        supported_currencies: e.target.value
                          .split(",")
                          .map((v) => v.trim().toUpperCase())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="INR, USD"
                    disabled={stripeLocked}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Enable provider</p>
                    <p className="text-xs text-muted-foreground">Controls checkout and billing routing.</p>
                  </div>
                  <Switch
                    checked={row.is_enabled}
                    onCheckedChange={(checked) =>
                      updateProvider(provider, (cur) => ({ ...cur, is_enabled: checked }))
                    }
                    disabled={stripeLocked}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">International enabled</p>
                    <p className="text-xs text-muted-foreground">Mirror dashboard activation status.</p>
                  </div>
                  <Switch
                    checked={row.is_international_enabled}
                    onCheckedChange={(checked) =>
                      updateProvider(provider, (cur) => ({ ...cur, is_international_enabled: checked }))
                    }
                    disabled={stripeLocked}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Last webhook event: {prettyDate(row.webhook_last_event_at)}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => saveMutation.mutate(row)}
                  disabled={saveMutation.isPending || stripeLocked}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => actionMutation.mutate({ provider, action: "test-credentials" })}
                  disabled={actionMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test connection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => actionMutation.mutate({ provider, action: "webhook-health" })}
                  disabled={actionMutation.isPending}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Webhook health
                </Button>
                {row.provider_ready && (
                  <span className="inline-flex items-center text-sm text-emerald-600 gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Config looks healthy
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
