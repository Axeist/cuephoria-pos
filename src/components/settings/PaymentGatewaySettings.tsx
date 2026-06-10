import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCcw, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import RazorpaySetupWizard from "@/components/settings/RazorpaySetupWizard";

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
  has_webhook_secret: boolean;
  provider_ready: boolean;
  platform_fallback_available: boolean;
  credentials_configured: boolean;
  setup_steps: {
    keys: boolean;
    webhook: boolean;
    tested: boolean;
    enabled: boolean;
    all_complete: boolean;
  };
};

type ConfigResponse = { ok: true; configs: PaymentConfig[] };

const PROVIDERS: Provider[] = ["razorpay"];

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
  const [showWizard, setShowWizard] = React.useState(false);

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
          is_enabled: false,
          supported_currencies: ["INR"],
          is_international_enabled: false,
          webhook_configured: false,
          webhook_last_event_at: null,
          settings: {},
          public_key_masked: null,
          has_secret: false,
          has_webhook_secret: false,
          provider_ready: false,
          platform_fallback_available: false,
          credentials_configured: false,
          setup_steps: {
            keys: false,
            webhook: false,
            tested: false,
            enabled: false,
            all_complete: false,
          },
        } as PaymentConfig);
    }
    setDrafts(map);
  }, [configQuery.data]);

  const razorpayConfig = drafts.razorpay;
  const needsWizard =
    razorpayConfig && !razorpayConfig.provider_ready && !razorpayConfig.platform_fallback_available;

  React.useEffect(() => {
    if (needsWizard) setShowWizard(true);
  }, [needsWizard]);

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
    mutationFn: async (args: { provider: Provider; mode?: Mode; action: "test-credentials" | "webhook-health" }) =>
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
            Connect Razorpay for public booking online payments. Stripe for international card payments is coming
            soon — use Razorpay for now. Subscription billing to Cuetronix uses platform keys separately.
          </CardDescription>
        </CardHeader>
      </Card>

      {razorpayConfig && (showWizard || needsWizard) && (
        <RazorpaySetupWizard
          config={razorpayConfig}
          onComplete={() => {
            setShowWizard(false);
            qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
          }}
        />
      )}

      {razorpayConfig?.provider_ready && !showWizard && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowWizard(true)}>
            Edit Razorpay setup
          </Button>
        </div>
      )}

      {PROVIDERS.map((provider) => {
        const row = drafts[provider];
        if (!row) return null;
        const currencies = row.supported_currencies.join(", ");
        const hideFlatCard = provider === "razorpay" && (showWizard || needsWizard);

        if (hideFlatCard) return null;

        return (
          <Card key={provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Razorpay</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={row.provider_ready ? "default" : "secondary"}>
                    {row.provider_ready ? "Ready" : "Needs setup"}
                  </Badge>
                  <Badge variant="outline">Active provider</Badge>
                </div>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-3">
                <span>Key: {row.public_key_masked || "Not configured"}</span>
                <span>Secret: {row.has_secret ? "Saved" : "Missing"}</span>
                <span>Webhook secret: {row.has_webhook_secret ? "Saved" : "Missing"}</span>
                <span>Webhook events: {row.webhook_configured ? "Receiving" : "Not configured"}</span>
                {row.platform_fallback_available && !row.credentials_configured && (
                  <span className="text-amber-600">Platform env fallback active</span>
                )}
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
                    disabled={false}
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Enable provider</p>
                    <p className="text-xs text-muted-foreground">Required for public booking online pay.</p>
                  </div>
                  <Switch
                    checked={row.is_enabled}
                    onCheckedChange={(checked) =>
                      updateProvider(provider, (cur) => ({ ...cur, is_enabled: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">International enabled</p>
                    <p className="text-xs text-muted-foreground">Mirror Razorpay dashboard activation status.</p>
                  </div>
                  <Switch
                    checked={row.is_international_enabled}
                    onCheckedChange={(checked) =>
                      updateProvider(provider, (cur) => ({ ...cur, is_international_enabled: checked }))
                    }
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Last webhook event: {prettyDate(row.webhook_last_event_at)}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => saveMutation.mutate(row)}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    actionMutation.mutate({
                      provider,
                      mode: row.mode,
                      action: "test-credentials",
                    })
                  }
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
                {provider === "razorpay" && (
                  <Button variant="outline" onClick={() => setShowWizard(true)}>
                    Setup wizard
                  </Button>
                )}
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

      <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg text-muted-foreground">Stripe</CardTitle>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Coming soon
            </Badge>
          </div>
          <CardDescription>
            Stripe integration for international card payments and multi-currency checkout is not available yet.
            You cannot connect a Stripe account at this time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">For now:</strong> use Razorpay above for public booking online
            payments (UPI, cards, netbanking in India).
          </p>
          <p>
            <strong className="text-foreground">Coming soon:</strong> connect your own Stripe account, test/live
            keys, webhooks, and international currencies — same self-service wizard as Razorpay.
          </p>
          <p className="text-xs">
            We&apos;ll notify you when Stripe setup is ready. No action needed on your side today.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
