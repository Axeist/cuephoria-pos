import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { buildPublicBookingUrl } from "@/utils/publicBookingUrl";
import { BOOKING_ACCESS_KEYS, parseBookingSettingBool } from "@/utils/bookingAccessSettings";
import PaymentProviderBrand from "@/components/settings/PaymentProviderBrand";

type Mode = "test" | "live";

type LocationRow = {
  id: string;
  name: string;
  slug: string;
};

type PaymentConfig = {
  mode: Mode;
  is_enabled: boolean;
  webhook_configured: boolean;
  webhook_last_event_at: string | null;
  public_key_masked: string | null;
  has_secret: boolean;
  has_webhook_secret: boolean;
  provider_ready: boolean;
  setup_steps: {
    keys: boolean;
    webhook: boolean;
    tested: boolean;
    enabled: boolean;
    all_complete: boolean;
  };
};

type WizardProps = {
  config: PaymentConfig;
  onComplete: () => void;
  initialStepIdx?: number;
};

export const RAZORPAY_WIZARD_STEPS = [
  { id: "intro", label: "Overview" },
  { id: "account", label: "Razorpay account" },
  { id: "keys", label: "API keys" },
  { id: "webhook", label: "Webhook" },
  { id: "test", label: "Test connection" },
  { id: "branches", label: "Enable venues" },
  { id: "booking", label: "Test booking" },
  { id: "live", label: "Go live" },
] as const;

const STEPS = RAZORPAY_WIZARD_STEPS;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const text = await response.text();
  let json: { ok?: boolean; error?: string; result?: { ok: boolean; message: string } };
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      response.ok
        ? "Invalid server response"
        : `Server error (${response.status}): ${text.slice(0, 120) || "Unknown error"}`,
    );
  }
  if (!response.ok || json?.ok === false) {
    throw new Error(json?.error || json?.result?.message || `Request failed (${response.status})`);
  }
  return json as T;
}

function inferModeFromKeyId(keyId: string): Mode | null {
  const v = keyId.trim();
  if (v.startsWith("rzp_live_")) return "live";
  if (v.startsWith("rzp_test_")) return "test";
  return null;
}

export default function RazorpaySetupWizard({ config, onComplete, initialStepIdx = 0 }: WizardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [stepIdx, setStepIdx] = React.useState(initialStepIdx);
  React.useEffect(() => {
    setStepIdx(initialStepIdx);
  }, [initialStepIdx]);
  const [accountConfirmed, setAccountConfirmed] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>(() => {
    const masked = config.public_key_masked ?? "";
    if (masked.startsWith("rzp_live")) return "live";
    if (masked.startsWith("rzp_test")) return "test";
    return config.mode || "test";
  });
  const [keyId, setKeyId] = React.useState("");
  const [keySecret, setKeySecret] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [showTestSecret, setShowTestSecret] = React.useState(false);
  const [branchToggles, setBranchToggles] = React.useState<Record<string, boolean>>({});
  const testFormRef = React.useRef<HTMLFormElement>(null);

  const step = STEPS[stepIdx];
  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/razorpay/webhook` : "/api/razorpay/webhook";

  const locationsQuery = useQuery({
    queryKey: ["tenant-locations-wizard"],
    queryFn: () => fetchJson<{ ok: true; locations: LocationRow[] }>("/api/tenant/locations"),
  });

  const bookingSettingsQuery = useQuery({
    queryKey: ["booking-settings-wizard"],
    queryFn: async () => {
      const res = await fetchJson<{ ok: true; settings: Array<{ location_id: string; setting_key: string; setting_value: unknown }> }>(
        "/api/admin/booking-settings",
      );
      return res.settings;
    },
  });

  React.useEffect(() => {
    if (!locationsQuery.data?.locations || !bookingSettingsQuery.data) return;
    const map: Record<string, boolean> = {};
    for (const loc of locationsQuery.data.locations) {
      const row = bookingSettingsQuery.data.find(
        (s) => s.location_id === loc.id && s.setting_key === BOOKING_ACCESS_KEYS.onlinePayment,
      );
      map[loc.id] = parseBookingSettingBool(row?.setting_value, true);
    }
    setBranchToggles(map);
  }, [locationsQuery.data, bookingSettingsQuery.data]);

  const saveCredentialsMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      fetchJson("/api/admin/payment-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "razorpay", ...payload }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payment-config"] }),
  });

  const testMutation = useMutation({
    mutationFn: (args: { keyId: string; keySecret: string; effectiveMode: Mode }) =>
      fetchJson<{ ok: true; result: { ok: boolean; message: string } }>("/api/razorpay/test-org-credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: args.effectiveMode,
          credentials: { key_id: args.keyId, key_secret: args.keySecret },
        }),
      }),
    onSuccess: (data) => {
      setTestResult(data.result);
      qc.invalidateQueries({ queryKey: ["admin-payment-config"] });
    },
  });

  function readCredentialFields(): { keyId: string; keySecret: string } {
    if (testFormRef.current) {
      const fd = new FormData(testFormRef.current);
      const fromFormId = String(fd.get("key_id") ?? "").trim();
      const fromFormSecret = String(fd.get("key_secret") ?? "").trim();
      if (fromFormId || fromFormSecret) {
        return { keyId: fromFormId, keySecret: fromFormSecret };
      }
    }
    return { keyId: keyId.trim(), keySecret: keySecret.trim() };
  }

  const branchToggleMutation = useMutation({
    mutationFn: async ({ locationId, enabled }: { locationId: string; enabled: boolean }) =>
      fetchJson("/api/admin/booking-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          setting_key: BOOKING_ACCESS_KEYS.onlinePayment,
          setting_value: enabled,
        }),
      }),
  });

  async function saveKeysStep(): Promise<boolean> {
    if (!keyId.trim() || !keySecret.trim()) {
      toast({ variant: "destructive", title: "Key ID and Secret are required" });
      return false;
    }
    const effectiveMode = inferModeFromKeyId(keyId) ?? mode;
    if (effectiveMode !== mode) setMode(effectiveMode);
    try {
      await saveCredentialsMutation.mutateAsync({
        mode: effectiveMode,
        credentials: { key_id: keyId.trim(), key_secret: keySecret.trim() },
      });
      toast({ title: "API keys saved" });
      return true;
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: (err as Error).message });
      return false;
    }
  }

  async function saveWebhookStep(): Promise<boolean> {
    try {
      await saveCredentialsMutation.mutateAsync({
        mode,
        webhook_configured: !!webhookSecret.trim() || config.webhook_configured,
        credentials: webhookSecret.trim()
          ? { webhook_secret: webhookSecret.trim() }
          : undefined,
      });
      if (webhookSecret.trim()) toast({ title: "Webhook secret saved" });
      return true;
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: (err as Error).message });
      return false;
    }
  }

  async function runTest(): Promise<boolean> {
    const { keyId: testKeyId, keySecret: testKeySecret } = readCredentialFields();
    if (!testKeyId || !testKeySecret) {
      toast({
        variant: "destructive",
        title: "Key ID and Secret are required",
        description: "Paste both from Razorpay Dashboard → Settings → API Keys.",
      });
      return false;
    }
    const effectiveMode = inferModeFromKeyId(testKeyId) ?? mode;
    if (effectiveMode !== mode) setMode(effectiveMode);
    try {
      await saveCredentialsMutation.mutateAsync({
        mode: effectiveMode,
        credentials: { key_id: testKeyId, key_secret: testKeySecret },
      });
      setKeyId(testKeyId);
      setKeySecret(testKeySecret);
      const data = await testMutation.mutateAsync({
        keyId: testKeyId,
        keySecret: testKeySecret,
        effectiveMode,
      });
      if (!data.result.ok) {
        toast({ variant: "destructive", title: "Connection failed", description: data.result.message });
        return false;
      }
      toast({ title: "Connection successful", description: data.result.message });
      return true;
    } catch (err) {
      toast({ variant: "destructive", title: "Test failed", description: (err as Error).message });
      return false;
    }
  }

  async function saveEnableStep(): Promise<boolean> {
    try {
      await saveCredentialsMutation.mutateAsync({
        mode,
        is_enabled: true,
        webhook_configured: config.webhook_configured || !!webhookSecret.trim(),
      });
      for (const loc of locationsQuery.data?.locations ?? []) {
        const enabled = branchToggles[loc.id] ?? true;
        await branchToggleMutation.mutateAsync({ locationId: loc.id, enabled });
      }
      toast({ title: "Online payment enabled for your venues" });
      qc.invalidateQueries({ queryKey: ["booking-settings-wizard"] });
      return true;
    } catch (err) {
      toast({ variant: "destructive", title: "Enable failed", description: (err as Error).message });
      return false;
    }
  }

  async function goNext() {
    if (step.id === "account" && !accountConfirmed) {
      toast({ variant: "destructive", title: "Confirm you have a Razorpay account" });
      return;
    }
    if (step.id === "keys") {
      const ok = await saveKeysStep();
      if (!ok) return;
    }
    if (step.id === "webhook") {
      const ok = await saveWebhookStep();
      if (!ok) return;
    }
    if (step.id === "test") {
      const ok = await runTest();
      if (!ok) return;
    }
    if (step.id === "branches") {
      const ok = await saveEnableStep();
      if (!ok) return;
    }
    if (step.id === "booking") {
      try {
        await saveCredentialsMutation.mutateAsync({
          mode,
          is_enabled: true,
          webhook_configured: config.webhook_configured || !!webhookSecret.trim(),
        });
      } catch {
        // Non-blocking — keys may already be saved from earlier steps.
      }
      toast({
        title: "Razorpay setup complete",
        description:
          "Test booking is optional. Switch to Live keys from Settings → Payments when you are ready.",
      });
      onComplete();
      return;
    }
    if (step.id === "live") {
      if (mode === "live" && keyId.trim() && keySecret.trim()) {
        const keysOk = await saveKeysStep();
        if (!keysOk) return;
        const testOk = await runTest();
        if (!testOk) return;
      }
      toast({ title: "Razorpay setup complete" });
      onComplete();
      return;
    }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIdx((i) => Math.max(i - 1, 0));
  }

  function copyWebhookUrl() {
    void navigator.clipboard.writeText(webhookUrl);
    toast({ title: "Webhook URL copied" });
  }

  const locations = locationsQuery.data?.locations ?? [];
  const isBusy =
    saveCredentialsMutation.isPending || testMutation.isPending || branchToggleMutation.isPending;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/60 shadow-sm">
      <div className="h-px bg-gradient-to-r from-emerald-500/50 via-primary/20 to-transparent" />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30">
              <PaymentProviderBrand provider="razorpay" size="md" variant="icon" padded={false} />
            </div>
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-lg">Razorpay setup</CardTitle>
              <CardDescription>
                Step {stepIdx + 1} of {STEPS.length} — {step.label}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {mode === "test" ? "Test mode" : "Live mode"}
          </Badge>
        </div>
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-emerald-500" : "bg-muted"}`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 min-h-[200px]"
          >
            {step.id === "intro" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect your Razorpay account so customers can pay online on your public booking page.
                  Payments go directly to your Razorpay account — not through Cuephoria.
                </p>
                <ul className="text-sm space-y-2 list-disc pl-5">
                  <li>Start in <strong>Test mode</strong> — no real money</li>
                  <li>Use test card <code className="text-xs bg-muted px-1 rounded">4111 1111 1111 1111</code> for a trial booking</li>
                  <li>Switch to Live only after a successful test booking</li>
                </ul>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-t pt-3 mt-3">
                  <span>Also coming to this page:</span>
                  <PaymentProviderBrand provider="stripe" size="sm" />
                  <span>for international cards — use Razorpay for now.</span>
                </div>
              </>
            )}

            {step.id === "account" && (
              <>
                <p className="text-sm text-muted-foreground">
                  You need a Razorpay merchant account with KYC completed before accepting live payments.
                </p>
                <Button variant="outline" asChild>
                  <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer">
                    Open Razorpay Dashboard
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accountConfirmed}
                    onChange={(e) => setAccountConfirmed(e.target.checked)}
                  />
                  I have a Razorpay account (or I&apos;m creating one now)
                </label>
              </>
            )}

            {step.id === "keys" && (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === "test" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("test")}
                  >
                    Test
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "live" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("live")}
                  >
                    Live
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Razorpay Dashboard → Settings → API Keys → Generate {mode === "test" ? "Test" : "Live"} keys
                </p>
                <div className="space-y-2">
                  <Label>Key ID</Label>
                  <Input
                    value={keyId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setKeyId(next);
                      const inferred = inferModeFromKeyId(next);
                      if (inferred) setMode(inferred);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={mode === "live" ? "rzp_live_..." : "rzp_test_..."}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key Secret</Label>
                  <Input
                    type="password"
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
                    className="font-mono text-sm"
                    placeholder="Paste secret (never shared after save)"
                  />
                </div>
                {config.public_key_masked && config.has_secret && !keyId && (
                  <p className="text-xs text-emerald-600">
                    Saved key: {config.public_key_masked} — leave blank to keep existing secret
                  </p>
                )}
              </>
            )}

            {step.id === "webhook" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Add this webhook URL in Razorpay Dashboard → Webhooks. Subscribe to{" "}
                  <code className="text-xs">payment.captured</code>,{" "}
                  <code className="text-xs">order.paid</code>, and{" "}
                  <code className="text-xs">payment.failed</code>.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Webhook secret</Label>
                  <Input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="From Razorpay after creating webhook"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Secrets are encrypted at rest. We never show them again after saving.
                </p>
              </>
            )}

            {step.id === "test" && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{mode === "test" ? "Test mode" : "Live mode"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Detected from Key ID prefix (rzp_test_ / rzp_live_)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  We save your keys under the correct mode, then verify them with Razorpay.
                </p>
                <form
                  ref={testFormRef}
                  key={`razorpay-test-${stepIdx}`}
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void runTest();
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="razorpay-test-key-id">Key ID</Label>
                      <Input
                        id="razorpay-test-key-id"
                        name="key_id"
                        defaultValue={keyId}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={mode === "live" ? "rzp_live_..." : "rzp_test_..."}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razorpay-test-key-secret">Key Secret</Label>
                      <div className="relative">
                        <Input
                          id="razorpay-test-key-secret"
                          name="key_secret"
                          type={showTestSecret ? "text" : "password"}
                          defaultValue={keySecret}
                          autoComplete="new-password"
                          spellCheck={false}
                          className="pr-10 font-mono text-sm"
                          placeholder="Paste secret from Razorpay"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowTestSecret((v) => !v)}
                          tabIndex={-1}
                        >
                          {showTestSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste both keys fresh from Razorpay. Use the eye icon to confirm the secret looks correct (~24
                        characters, no spaces).
                      </p>
                    </div>
                  </div>
                  <Button type="submit" disabled={testMutation.isPending || saveCredentialsMutation.isPending}>
                    {testMutation.isPending || saveCredentialsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Save &amp; test connection
                  </Button>
                </form>
                {testResult && (
                  <p className={`text-sm ${testResult.ok ? "text-emerald-600" : "text-rose-500"}`}>
                    {testResult.message}
                  </p>
                )}
              </>
            )}

            {step.id === "branches" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Turn on online payment for each venue where customers should see &quot;Pay Online&quot;.
                </p>
                {locationsQuery.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="space-y-3">
                    {locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{loc.name}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                            {buildPublicBookingUrl({
                              branchSlug: loc.slug === "lite" ? "lite" : "main",
                              locationId: loc.id,
                            })}
                          </p>
                        </div>
                        <Switch
                          checked={branchToggles[loc.id] ?? true}
                          onCheckedChange={(checked) =>
                            setBranchToggles((prev) => ({ ...prev, [loc.id]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {step.id === "booking" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Open your public booking link, pick a slot, choose Pay Online, and complete payment with the test card.
                </p>
                {locations[0] && (
                  <Button variant="outline" asChild>
                    <a
                      href={buildPublicBookingUrl({
                        branchSlug: locations[0].slug === "lite" ? "lite" : "main",
                        locationId: locations[0].id,
                      })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open test booking page
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  After payment, confirm the booking appears in Booking Management. Webhook last event:{" "}
                  {config.webhook_last_event_at
                    ? new Date(config.webhook_last_event_at).toLocaleString("en-IN")
                    : "Not yet received"}
                </p>
              </>
            )}

            {step.id === "live" && (
              <>
                <p className="text-sm text-muted-foreground">
                  When ready for real payments, generate Live API keys in Razorpay, paste them below, test again, and
                  switch mode to Live.
                </p>
                <div className="space-y-2">
                  <Label>Live Key ID</Label>
                  <Input
                    value={keyId}
                    onChange={(e) => {
                      setMode("live");
                      setKeyId(e.target.value);
                    }}
                    placeholder="rzp_live_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Live Key Secret</Label>
                  <Input
                    type="password"
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                  />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost" onClick={goBack} disabled={stepIdx === 0 || isBusy}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => void goNext()} disabled={isBusy}>
            {step.id === "booking" || step.id === "live" ? (
              <>
                Finish
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
