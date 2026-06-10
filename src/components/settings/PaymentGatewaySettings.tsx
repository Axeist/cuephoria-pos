import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, KeyRound, Loader2, Pencil, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import RazorpaySetupWizard, { RAZORPAY_WIZARD_STEPS } from "@/components/settings/RazorpaySetupWizard";

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

function wizardStepIndex(stepId: (typeof RAZORPAY_WIZARD_STEPS)[number]["id"]): number {
  return RAZORPAY_WIZARD_STEPS.findIndex((s) => s.id === stepId);
}

export default function PaymentGatewaySettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [drafts, setDrafts] = React.useState<Record<string, PaymentConfig>>({});
  const [showWizard, setShowWizard] = React.useState(false);
  const [wizardInitialStep, setWizardInitialStep] = React.useState(0);
  const [wizardDismissed, setWizardDismissed] = React.useState(false);

  const configQuery = useQuery({
    queryKey: ["admin-payment-config"],
    queryFn: () => fetchJson<ConfigResponse>("/api/admin/payment-config"),
  });

  React.useEffect(() => {
    if (!configQuery.data) return;
    const map: Record<string, PaymentConfig> = {};
    for (const provider of ["razorpay"] as Provider[]) {
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
  const wizardDismissedKey = razorpayConfig?.id?.startsWith("draft-")
    ? null
    : `razorpay-wizard-dismissed:${razorpayConfig?.id ?? ""}`;
  const needsWizard =
    razorpayConfig &&
    !razorpayConfig.provider_ready &&
    !razorpayConfig.platform_fallback_available &&
    !wizardDismissed;

  React.useEffect(() => {
    if (!wizardDismissedKey) return;
    setWizardDismissed(localStorage.getItem(wizardDismissedKey) === "1");
  }, [wizardDismissedKey]);

  React.useEffect(() => {
    if (needsWizard) {
      setWizardInitialStep(0);
      setShowWizard(true);
    }
  }, [needsWizard]);

  function dismissWizard() {
    setShowWizard(false);
    setWizardDismissed(true);
    if (wizardDismissedKey) localStorage.setItem(wizardDismissedKey, "1");
    qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
  }

  function reopenWizard(stepId?: (typeof RAZORPAY_WIZARD_STEPS)[number]["id"]) {
    setWizardInitialStep(stepId ? wizardStepIndex(stepId) : 0);
    setShowWizard(true);
    setWizardDismissed(false);
    if (wizardDismissedKey) localStorage.removeItem(wizardDismissedKey);
  }

  const testMutation = useMutation({
    mutationFn: async (mode: Mode) =>
      fetchJson<{ ok: true; result?: { ok: boolean; message: string } }>(
        "/api/razorpay/test-org-credentials",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode }),
        },
      ),
    onSuccess: (payload) => {
      toast({
        title: payload.result?.ok ? "Connection successful" : "Connection failed",
        description: payload.result?.message,
        variant: payload.result?.ok ? "default" : "destructive",
      });
      qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Test failed", description: err.message });
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

  const showIntegratedRazorpay = razorpayConfig && !showWizard && !needsWizard;

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
          onComplete={dismissWizard}
          initialStepIdx={wizardInitialStep}
        />
      )}

      {showIntegratedRazorpay && razorpayConfig && (
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Razorpay integration complete
                </CardTitle>
                <CardDescription>
                  Your workspace is connected for public booking online payments.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                  Connected
                </Badge>
                <Badge variant="outline">{razorpayConfig.mode === "live" ? "Live mode" : "Test mode"}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground mb-1">API key</p>
                <p className="font-mono text-sm">
                  {razorpayConfig.public_key_masked || "Saved — use Edit credentials to view or update"}
                </p>
              </div>
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground mb-1">Webhook</p>
                <p className="text-sm">
                  {razorpayConfig.webhook_configured
                    ? `Configured · last event ${prettyDate(razorpayConfig.webhook_last_event_at)}`
                    : "Optional — add in Edit credentials if not set yet"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate(razorpayConfig.mode)}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Test connection
              </Button>
              <Button variant="outline" onClick={() => reopenWizard("keys")}>
                <KeyRound className="h-4 w-4 mr-2" />
                Edit credentials
              </Button>
              {razorpayConfig.mode === "test" && (
                <Button variant="ghost" size="sm" onClick={() => reopenWizard("live")}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Switch to live keys
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
