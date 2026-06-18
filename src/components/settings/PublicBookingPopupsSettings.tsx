import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/context/LocationContext";
import { Loader2, Megaphone, Plus, Trash2, Instagram, CreditCard, MapPin } from "lucide-react";
import type {
  CouponPromoPopup,
  PublicBookingPopupConfig,
  BranchPublicBookingPopupConfig,
} from "@/types/publicBookingPopups";
import { EMPTY_PUBLIC_BOOKING_POPUP_CONFIG } from "@/utils/publicBookingPopups";
import { generateId } from "@/utils/pos.utils";

type PopupApiResponse = {
  ok: true;
  workspaceDefaults: PublicBookingPopupConfig;
  branchOverride: BranchPublicBookingPopupConfig | null;
  canEdit: boolean;
};

const fetchPopups = async (locationId: string): Promise<PopupApiResponse> => {
  const res = await fetch(
    `/api/tenant/booking-popups?location_id=${encodeURIComponent(locationId)}`,
    { credentials: "same-origin" },
  );
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load popup settings");
  return json as PopupApiResponse;
};

const PublicBookingPopupsSettings: React.FC = () => {
  const { toast } = useToast();
  const { activeLocationId, activeLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [scope, setScope] = useState<"workspace" | "branch">("workspace");
  const [workspaceForm, setWorkspaceForm] = useState<PublicBookingPopupConfig>(
    EMPTY_PUBLIC_BOOKING_POPUP_CONFIG,
  );
  const [branchForm, setBranchForm] = useState<BranchPublicBookingPopupConfig>({
    use_workspace_defaults: true,
  });

  useEffect(() => {
    if (!activeLocationId) return;
    let cancelled = false;
    setLoading(true);
    fetchPopups(activeLocationId)
      .then((data) => {
        if (cancelled) return;
        setWorkspaceForm(data.workspaceDefaults);
        setBranchForm(data.branchOverride ?? { use_workspace_defaults: true });
        setCanEdit(data.canEdit);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLocationId, toast]);

  const save = async () => {
    if (!activeLocationId || !canEdit) return;
    setSaving(true);
    try {
      const body =
        scope === "workspace"
          ? { scope: "workspace", config: workspaceForm }
          : { scope: "branch", location_id: activeLocationId, config: branchForm };
      const res = await fetch("/api/tenant/booking-popups", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed");
      toast({
        title: "Saved",
        description:
          scope === "workspace"
            ? "Workspace popup defaults updated."
            : `Branch overrides saved for ${activeLocation?.name ?? "this branch"}.`,
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateCouponPopup = (
    list: CouponPromoPopup[],
    id: string,
    patch: Partial<CouponPromoPopup>,
  ) => list.map((p) => (p.id === id ? { ...p, ...patch } : p));

  const couponEnabled =
    scope === "workspace"
      ? workspaceForm.coupon_promo_enabled
      : (branchForm.coupon_promo_enabled ?? workspaceForm.coupon_promo_enabled);
  const couponPopups =
    scope === "workspace"
      ? workspaceForm.coupon_popups
      : (branchForm.coupon_popups ?? workspaceForm.coupon_popups);

  const setCouponEnabled = (v: boolean) => {
    if (scope === "workspace") setWorkspaceForm((f) => ({ ...f, coupon_promo_enabled: v }));
    else setBranchForm((f) => ({ ...f, coupon_promo_enabled: v }));
  };

  const setCouponPopups = (popups: CouponPromoPopup[]) => {
    if (scope === "workspace") setWorkspaceForm((f) => ({ ...f, coupon_popups: popups }));
    else setBranchForm((f) => ({ ...f, coupon_popups: popups }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Public booking popups
          </CardTitle>
          <CardDescription>
            Configure promotional popups on your public booking page — workspace-wide defaults or
            per-branch overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={scope === "workspace" ? "default" : "outline"}
              onClick={() => setScope("workspace")}
            >
              Workspace defaults
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scope === "branch" ? "default" : "outline"}
              onClick={() => setScope("branch")}
              className="gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5" />
              {activeLocation?.name ?? "This branch"}
            </Button>
          </div>

          {scope === "branch" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Use workspace defaults</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Turn off to fully customize popups for this branch only.
                </p>
              </div>
              <Switch
                checked={branchForm.use_workspace_defaults !== false}
                onCheckedChange={(v) =>
                  setBranchForm((f) => ({ ...f, use_workspace_defaults: v }))
                }
                disabled={!canEdit}
              />
            </div>
          )}

          {!canEdit && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/40">
              View only — owners and admins can edit
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Coupon promo popups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable coupon popups</Label>
            <Switch checked={couponEnabled} onCheckedChange={setCouponEnabled} disabled={!canEdit} />
          </div>
          {couponPopups.map((popup, idx) => (
            <div key={popup.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Popup {idx + 1}</span>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCouponPopups(couponPopups.filter((p) => p.id !== popup.id))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={popup.title}
                    onChange={(e) =>
                      setCouponPopups(
                        updateCouponPopup(couponPopups, popup.id, { title: e.target.value }),
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label className="text-xs">Discount label</Label>
                  <Input
                    value={popup.discount_label}
                    onChange={(e) =>
                      setCouponPopups(
                        updateCouponPopup(couponPopups, popup.id, {
                          discount_label: e.target.value,
                        }),
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label className="text-xs">Coupon code</Label>
                  <Input
                    value={popup.coupon_code}
                    onChange={(e) =>
                      setCouponPopups(
                        updateCouponPopup(couponPopups, popup.id, {
                          coupon_code: e.target.value.toUpperCase(),
                        }),
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label className="text-xs">Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={600}
                    value={popup.delay_seconds}
                    onChange={(e) =>
                      setCouponPopups(
                        updateCouponPopup(couponPopups, popup.id, {
                          delay_seconds: Number(e.target.value),
                        }),
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={popup.description}
                  onChange={(e) =>
                    setCouponPopups(
                      updateCouponPopup(couponPopups, popup.id, { description: e.target.value }),
                    )
                  }
                  disabled={!canEdit}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={popup.enabled}
                  onCheckedChange={(v) =>
                    setCouponPopups(updateCouponPopup(couponPopups, popup.id, { enabled: v }))
                  }
                  disabled={!canEdit}
                />
                <span className="text-xs text-muted-foreground">Enabled</span>
              </div>
            </div>
          ))}
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setCouponPopups([
                  ...couponPopups,
                  {
                    id: generateId(),
                    enabled: true,
                    sort_order: couponPopups.length,
                    delay_seconds: 30,
                    title: "Special offer",
                    discount_label: "10% OFF",
                    description: "",
                    coupon_code: "",
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Add coupon popup
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Online payment promo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const promo =
              scope === "workspace"
                ? workspaceForm.online_payment_promo
                : {
                    ...workspaceForm.online_payment_promo,
                    ...branchForm.online_payment_promo,
                  };
            const setPromo = (patch: Partial<typeof promo>) => {
              if (scope === "workspace") {
                setWorkspaceForm((f) => ({
                  ...f,
                  online_payment_promo: { ...f.online_payment_promo, ...patch },
                }));
              } else {
                setBranchForm((f) => ({
                  ...f,
                  online_payment_promo: { ...workspaceForm.online_payment_promo, ...f.online_payment_promo, ...patch },
                }));
              }
            };
            return (
              <>
                <div className="flex items-center justify-between">
                  <Label>Show pay-online nudge</Label>
                  <Switch
                    checked={promo.enabled}
                    onCheckedChange={(v) => setPromo({ enabled: v })}
                    disabled={!canEdit}
                  />
                </div>
                <Input
                  placeholder="Title"
                  value={promo.title}
                  onChange={(e) => setPromo({ title: e.target.value })}
                  disabled={!canEdit}
                />
                <Textarea
                  placeholder="Body text"
                  value={promo.body}
                  onChange={(e) => setPromo({ body: e.target.value })}
                  disabled={!canEdit}
                  rows={3}
                />
              </>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram follow gate
          </CardTitle>
          <CardDescription className="text-xs">
            For new customers applying selected coupons, prompt to follow your Instagram first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const gate =
              scope === "workspace"
                ? workspaceForm.instagram_gate
                : { ...workspaceForm.instagram_gate, ...branchForm.instagram_gate };
            const setGate = (patch: Partial<typeof gate>) => {
              if (scope === "workspace") {
                setWorkspaceForm((f) => ({
                  ...f,
                  instagram_gate: { ...f.instagram_gate, ...patch },
                }));
              } else {
                setBranchForm((f) => ({
                  ...f,
                  instagram_gate: { ...workspaceForm.instagram_gate, ...f.instagram_gate, ...patch },
                }));
              }
            };
            return (
              <>
                <div className="flex items-center justify-between">
                  <Label>Enabled</Label>
                  <Switch
                    checked={gate.enabled}
                    onCheckedChange={(v) => setGate({ enabled: v })}
                    disabled={!canEdit}
                  />
                </div>
                <Input
                  placeholder="Instagram handle (e.g. @myvenue)"
                  value={gate.instagram_handle}
                  onChange={(e) => setGate({ instagram_handle: e.target.value })}
                  disabled={!canEdit}
                />
                <Input
                  placeholder="Instagram profile URL"
                  value={gate.instagram_url}
                  onChange={(e) => setGate({ instagram_url: e.target.value })}
                  disabled={!canEdit}
                />
                <div>
                  <Label className="text-xs">Coupon codes (comma-separated)</Label>
                  <Input
                    value={gate.require_for_coupon_codes.join(", ")}
                    onChange={(e) =>
                      setGate({
                        require_for_coupon_codes: e.target.value
                          .split(",")
                          .map((c) => c.trim().toUpperCase())
                          .filter(Boolean),
                      })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save {scope === "workspace" ? "workspace defaults" : "branch overrides"}
        </Button>
      )}
    </div>
  );
};

export default PublicBookingPopupsSettings;
