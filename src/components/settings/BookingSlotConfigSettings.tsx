import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { Clock, Loader2, MapPin } from "lucide-react";
import type { BookingSlotMinutes, BranchBookingSlotConfig } from "@/types/bookingSlotConfig";
import {
  bookingSlotConfigLabel,
  isValidSlotCombo,
  resolveBookingSlotConfig,
} from "@/utils/bookingSlotConfig";

type Scope = "workspace" | "branch";

const BookingSlotConfigSettings: React.FC = () => {
  const { toast } = useToast();
  const { activeLocationId, activeLocation } = useLocation();
  const [scope, setScope] = useState<Scope>("branch");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [workspaceInterval, setWorkspaceInterval] = useState<BookingSlotMinutes>(60);
  const [workspaceMinimum, setWorkspaceMinimum] = useState<BookingSlotMinutes>(60);
  const [branchForm, setBranchForm] = useState<BranchBookingSlotConfig>({
    use_workspace_defaults: true,
    slot_interval_minutes: 60,
    minimum_booking_minutes: 60,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = activeLocationId ? `?location_id=${encodeURIComponent(activeLocationId)}` : "";
      const res = await fetch(`/api/tenant/booking-slot-config${qs}`, { credentials: "include" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to load session settings");
      setCanEdit(Boolean(json.canEdit));
      setWorkspaceInterval(json.workspaceDefaults?.slot_interval_minutes === 30 ? 30 : 60);
      setWorkspaceMinimum(json.workspaceDefaults?.minimum_booking_minutes === 30 ? 30 : 60);
      if (json.branchOverride) {
        setBranchForm({
          use_workspace_defaults: json.branchOverride.use_workspace_defaults !== false,
          slot_interval_minutes:
            json.branchOverride.slot_interval_minutes === 30 ? 30 : 60,
          minimum_booking_minutes:
            json.branchOverride.minimum_booking_minutes === 30 ? 30 : 60,
        });
      }
    } catch (e) {
      toast({
        title: "Could not load session length settings",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeLocationId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const draftInterval = scope === "workspace" ? workspaceInterval : branchForm.slot_interval_minutes ?? 60;
  const draftMinimum = scope === "workspace" ? workspaceMinimum : branchForm.minimum_booking_minutes ?? 60;
  const draftValid = isValidSlotCombo(
    draftInterval === 30 ? 30 : 60,
    draftMinimum === 30 ? 30 : 60,
  );

  const previewResolved = resolveBookingSlotConfig(
    { slot_interval_minutes: workspaceInterval, minimum_booking_minutes: workspaceMinimum },
    scope === "branch" && branchForm.use_workspace_defaults === false
      ? {
          use_workspace_defaults: false,
          slot_interval_minutes: branchForm.slot_interval_minutes,
          minimum_booking_minutes: branchForm.minimum_booking_minutes,
        }
      : null,
  );

  async function applySettings() {
    if (!draftValid) {
      toast({ title: "Invalid combination", description: "Minimum must be at least the slot interval.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/booking-slot-config", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope,
          location_id: scope === "branch" ? activeLocationId : undefined,
          slot_interval_minutes: draftInterval,
          minimum_booking_minutes: draftMinimum,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to apply settings");
      toast({
        title: "Session length updated",
        description: bookingSlotConfigLabel(previewResolved) + " — VR stations unchanged.",
      });
      setConfirmOpen(false);
      await load();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Session length
          </CardTitle>
          <CardDescription>
            Configure public booking time grid and minimum session length. VR stays on 15-minute passes.
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
                  Turn off to customize this branch only.
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

          {(scope === "workspace" || branchForm.use_workspace_defaults === false) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Time slot granularity</Label>
                <Select
                  value={String(draftInterval)}
                  onValueChange={(v) => {
                    const n = v === "30" ? 30 : 60;
                    if (scope === "workspace") {
                      setWorkspaceInterval(n);
                      if (n === 60) setWorkspaceMinimum(60);
                    } else {
                      setBranchForm((f) => ({
                        ...f,
                        slot_interval_minutes: n,
                        minimum_booking_minutes: n === 60 ? 60 : f.minimum_booking_minutes ?? 60,
                      }));
                    }
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minimum booking</Label>
                <Select
                  value={String(draftMinimum)}
                  onValueChange={(v) => {
                    const n = v === "30" ? 30 : 60;
                    if (scope === "workspace") setWorkspaceMinimum(n);
                    else setBranchForm((f) => ({ ...f, minimum_booking_minutes: n }));
                  }}
                  disabled={!canEdit || draftInterval === 60}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {draftInterval === 30 && <SelectItem value="30">30 minutes</SelectItem>}
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Public booking: </span>
            <span className="font-medium">{bookingSlotConfigLabel(previewResolved)}</span>
            {previewResolved.slots_per_minimum > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                Customers must pick {previewResolved.slots_per_minimum} consecutive{" "}
                {previewResolved.slot_interval_minutes}-minute slots per session.
              </p>
            )}
          </div>

          {!canEdit && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/40">
              View only — owners and admins can edit
            </Badge>
          )}

          {canEdit && (
            <Button
              type="button"
              disabled={!draftValid || saving}
              onClick={() => setConfirmOpen(true)}
            >
              Apply session length
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply session length?</DialogTitle>
            <DialogDescription>
              {scope === "workspace"
                ? "Updates workspace defaults and all branches that follow workspace defaults."
                : `Updates ${activeLocation?.name ?? "this branch"} only.`}{" "}
              Non-VR station rates adjust when minimum session length changes (halved or doubled).
              VR is not affected. Past bookings are unchanged.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{bookingSlotConfigLabel(previewResolved)}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void applySettings()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingSlotConfigSettings;
