import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { slugifyBranch } from "@/utils/publicBookingPopups";

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
    active_count: number;
    can_create: boolean;
    is_trialing: boolean;
  };
  canEdit: boolean;
};

const BranchManagementSettings: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<LocationsResponse | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortCode, setShortCode] = useState("");

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
    } catch (e) {
      toast({ title: "Could not create branch", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
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
            <>Trial workspaces can add branches up to your plan limit ({limits?.max_branches ?? 0} active).</>
          ) : (
            <>Active branches: {limits?.active_count ?? 0} / {limits?.max_branches ?? 0}</>
          )}
          {!limits?.can_create && data?.canEdit ? (
            <span className="block mt-1">
              <Link to="/subscription" className="text-primary hover:underline">
                Upgrade your plan
              </Link>{" "}
              to add more branches.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{loc.name}</span>
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  {loc.slug} · {loc.short_code}
                </span>
              </div>
              {!loc.is_active ? (
                <Badge variant="outline">Inactive</Badge>
              ) : (
                <Badge variant="secondary">Active</Badge>
              )}
            </li>
          ))}
        </ul>

        {data?.canEdit && limits?.can_create ? (
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
    </Card>
  );
};

export default BranchManagementSettings;
