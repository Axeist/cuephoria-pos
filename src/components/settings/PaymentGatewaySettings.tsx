import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Globe2,
  KeyRound,
  Loader2,
  Pencil,
  Radio,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import RazorpaySetupWizard, { RAZORPAY_WIZARD_STEPS } from "@/components/settings/RazorpaySetupWizard";
import PaymentProviderBrand from "@/components/settings/PaymentProviderBrand";

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

function DetailCell({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {label}
      </div>
      <p className={mono ? "font-mono text-sm text-foreground break-all" : "text-sm text-foreground"}>
        {value}
      </p>
    </div>
  );
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
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-border/60 bg-card/40">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configQuery.isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(configQuery.error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const showIntegratedRazorpay = razorpayConfig && !showWizard && !needsWizard;
  const isLive = razorpayConfig?.mode === "live";

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Payment providers</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Connect gateways for public booking checkout. Payments go to your Razorpay account — Cuetronix
          platform billing uses separate keys.
        </p>
      </div>

      {razorpayConfig && (showWizard || needsWizard) && (
        <RazorpaySetupWizard
          config={razorpayConfig}
          onComplete={dismissWizard}
          initialStepIdx={wizardInitialStep}
        />
      )}

      {showIntegratedRazorpay && razorpayConfig && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active integration
          </p>
          <Card className="overflow-hidden border-border/70 bg-card/60 shadow-sm">
            <div className="h-px bg-gradient-to-r from-emerald-500/70 via-emerald-400/30 to-transparent" />
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30">
                    <PaymentProviderBrand provider="razorpay" size="md" variant="icon" padded={false} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg font-semibold">Razorpay</CardTitle>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1 font-normal"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                    <CardDescription className="text-sm leading-relaxed">
                      Accepting UPI, cards &amp; netbanking on your public booking page.
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 self-start font-normal tabular-nums"
                >
                  {isLive ? "Live" : "Test"} mode
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pb-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailCell
                  icon={KeyRound}
                  label="API key"
                  mono
                  value={
                    razorpayConfig.public_key_masked ||
                    "Saved — edit credentials to update"
                  }
                />
                <DetailCell
                  icon={Radio}
                  label="Webhook"
                  value={
                    razorpayConfig.webhook_configured
                      ? `Active · ${prettyDate(razorpayConfig.webhook_last_event_at)}`
                      : "Not configured (optional)"
                  }
                />
                <DetailCell
                  icon={Globe2}
                  label="Currencies"
                  value={razorpayConfig.supported_currencies.join(", ") || "INR"}
                />
              </div>

              <Separator className="bg-border/60" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {isLive
                    ? "Live keys are active — real payments will be captured."
                    : "Test mode — use Razorpay test cards; no real money moves."}
                </p>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => testMutation.mutate(razorpayConfig.mode)}
                    disabled={testMutation.isPending}
                    className="gap-2"
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Test connection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reopenWizard("keys")}
                    className="gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    Edit credentials
                  </Button>
                  {!isLive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => reopenWizard("live")}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      Go live
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {showIntegratedRazorpay ? "More providers" : "Available providers"}
        </p>

        {!showIntegratedRazorpay && (
          <Card className="border-border/70 bg-card/40">
            <CardContent className="flex flex-wrap items-center gap-4 py-5">
              <PaymentProviderBrand provider="razorpay" size="md" variant="logo" />
              <div className="flex-1 min-w-[200px] space-y-1">
                <p className="text-sm font-medium">Razorpay</p>
                <p className="text-xs text-muted-foreground">
                  UPI, cards &amp; netbanking for India — complete setup to enable online pay.
                </p>
              </div>
              <Button size="sm" onClick={() => reopenWizard()}>
                Connect Razorpay
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border border-dashed border-border/60 bg-muted/10 opacity-90">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted/20 opacity-80">
              <PaymentProviderBrand provider="stripe" size="md" padded={false} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground/90">Stripe</p>
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Clock className="h-3 w-3" />
                  Coming soon
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                International cards, wallets &amp; multi-currency — self-service setup like Razorpay.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:shrink-0">
              <PaymentProviderBrand provider="razorpay" size="sm" variant="icon" padded={false} />
              <span className="opacity-40">+</span>
              <PaymentProviderBrand provider="stripe" size="sm" padded={false} />
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground/80 pb-2">
        Need help? Re-run the setup wizard from Edit credentials, or contact support if webhooks
        aren&apos;t firing after a test payment.
      </p>
    </div>
  );
}
