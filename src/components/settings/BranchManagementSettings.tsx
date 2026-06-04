import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/context/LocationContext";
import { Building2, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { slugifyBranch } from "@/utils/publicBookingPopups";
import DeleteBranchDialog from "@/components/settings/DeleteBranchDialog";

type LocationRow = {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  sort_order: number;
  is_active: boolean;
};

type LocationsResponse = {
  ok: true;
  locations: LocationRow[];
  limits: {
    max_branches: number;
    plan_max_branches?: number;
    active_count: number;
    can_create: boolean;
    is_trialing: boolean;
    trial_ended?: boolean;
    requires_paid_plan?: boolean;
  };
  canEdit: boolean;
  mainLocationId?: string | null;
};

const BranchManagementSettings: React.FC = () => {
  const { toast } = useToast();
  const { reloadLocations, activeLocationId, setActiveLocationId } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [data, setData] = useState<LocationsResponse | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/locations", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load branches");
      setData(json as LocationsResponse);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createBranch = async () => {
    if (!data?.limits.can_create) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/locations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || slugifyBranch(name),
          short_code: shortCode.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not create branch");
      toast({ title: "Branch created", description: `${json.location.name} is ready.` });
      setName("");
      setSlug("");
      setShortCode("");
      await load();
      await reloadLocations();
    } catch (e) {
      toast({ title: "Could not create branch", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (loc: LocationRow) => {
    setEditingId(loc.id);
    setEditName(loc.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveBranchName = async (locationId: string) => {
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      toast({ title: "Invalid name", description: "Branch name must be at least 2 characters.", variant: "destructive" });
      return;
    }
    setSavingNameId(locationId);
    try {
      const res = await fetch("/api/tenant/locations", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: locationId, name: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not update branch");
      toast({ title: "Branch updated", description: `Renamed to "${json.location.name}".` });
      setEditingId(null);
      setEditName("");
      await load();
      await reloadLocations();
    } catch (e) {
      toast({ title: "Could not update branch", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingNameId(null);
    }
  };

  if (loading) {
    return (
      <Card id="branches">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const limits = data?.limits;
  const locations = data?.locations ?? [];
  const apiMissing = !data && !loading;
  const canEdit = data?.canEdit ?? false;
  const mainLocationId = data?.mainLocationId ?? null;
  const mainBranch = mainLocationId ? locations.find((l) => l.id === mainLocationId) : null;
  const canDeleteBranch = (loc: LocationRow) =>
    canEdit && mainLocationId !== null && loc.id !== mainLocationId && locations.length > 1;

  const handleBranchDeleted = async (result: { mainLocationId: string }) => {
    if (deleteTarget && activeLocationId === deleteTarget.id) {
      setActiveLocationId(result.mainLocationId);
    }
    setDeleteTarget(null);
    await load();
    await reloadLocations();
  };

  return (
    <Card id="branches">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Branches
        </CardTitle>
        {apiMissing ? (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            Could not load branches. If you just deployed, wait a minute and refresh — the app needs the latest
            release with <code className="text-xs">/api/tenant/locations</code>.
          </p>
        ) : null}
        <CardDescription>
          {limits?.is_trialing ? (
            <>
              Trial active: {limits?.active_count ?? 0} / {limits?.max_branches ?? 0} branches (Pro trial
              limit). Add branches until your trial ends.
            </>
          ) : limits?.requires_paid_plan ? (
            <>
              Your trial has ended.{" "}
              <Link to="/subscription" className="text-primary hover:underline">
                Subscribe to an active plan
              </Link>{" "}
              to add new branches.
            </>
          ) : (
            <>
              Active branches: {limits?.active_count ?? 0} / {limits?.max_branches ?? 0}. You can rename any
              branch below.
            </>
          )}
          {!limits?.can_create && canEdit && !limits?.requires_paid_plan ? (
            <span className="block mt-1">
              {limits?.is_trialing ? (
                <>You&apos;ve reached the trial branch limit.</>
              ) : (
                <>
                  <Link to="/subscription" className="text-primary hover:underline">
                    Upgrade your plan
                  </Link>{" "}
                  to add more branches.
                </>
              )}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border px-3 py-3 text-sm"
            >
              <div className="flex-1 min-w-0 space-y-2">
                {editingId === loc.id && canEdit ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Branch name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={120}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveBranchName(loc.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void saveBranchName(loc.id)}
                        disabled={savingNameId === loc.id}
                        className="gap-1"
                      >
                        {savingNameId === loc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={!!savingNameId}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs block sm:inline mt-0.5 sm:mt-0">
                        {loc.slug} · {loc.short_code}
                      </span>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => startEdit(loc)}
                          aria-label={`Rename ${loc.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDeleteBranch(loc) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(loc)}
                            aria-label={`Delete ${loc.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0 self-start sm:self-center">
                {!loc.is_active ? (
                  <Badge variant="outline">Inactive</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canEdit && limits?.can_create ? (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Add branch</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(slugifyBranch(e.target.value));
                  }}
                  placeholder="Downtown lounge"
                />
              </div>
              <div>
                <Label className="text-xs">URL slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugifyBranch(e.target.value))}
                  placeholder="downtown"
                />
              </div>
              <div>
                <Label className="text-xs">Short code</Label>
                <Input
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  placeholder="DTWN"
                  maxLength={12}
                />
              </div>
            </div>
            <Button type="button" onClick={createBranch} disabled={saving || name.trim().length < 2} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create branch
            </Button>
          </div>
        ) : null}
      </CardContent>

      <DeleteBranchDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        branch={deleteTarget}
        mainBranchName={mainBranch?.name ?? null}
        onDeleted={handleBranchDeleted}
      />
    </Card>
  );
};

export default BranchManagementSettings;
