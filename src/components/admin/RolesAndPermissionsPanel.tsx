import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/context/PermissionsContext';
import type { PermissionMeta } from '@/constants/permissionCatalog';
import { Shield, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkspaceRole = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_system: boolean;
};

const RolesAndPermissionsPanel: React.FC = () => {
  const { toast } = useToast();
  const { can, refresh: refreshSessionPerms } = usePermissions();
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionMeta[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles', { credentials: 'same-origin' });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to load roles');
      setRoles(json.roles ?? []);
      setCatalog(json.catalog ?? []);
      setCanManage(!!json.canManage);
      if (!selectedRoleId && json.roles?.[0]?.id) {
        setSelectedRoleId(json.roles[0].id);
      }
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId, toast]);

  const loadRoleDetail = useCallback(async (roleId: string) => {
    try {
      const res = await fetch(`/api/admin/roles?roleId=${encodeURIComponent(roleId)}`, {
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to load role');
      setDraftPerms(new Set(json.permissions ?? []));
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load role permissions',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (selectedRoleId) void loadRoleDetail(selectedRoleId);
  }, [selectedRoleId, loadRoleDetail]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, PermissionMeta[]>();
    for (const p of catalog) {
      const list = map.get(p.groupLabel) ?? [];
      list.push(p);
      map.set(p.groupLabel, list);
    }
    return [...map.entries()];
  }, [catalog]);

  const togglePerm = (key: string, checked: boolean) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_permissions',
          roleId: selectedRoleId,
          permissions: [...draftPerms],
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Save failed');
      toast({ title: 'Saved', description: 'Role permissions updated.' });
      await refreshSessionPerms();
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!can('settings.team.view') && !can('roles.manage')) {
    return null;
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <Card className="glass-card border-border/50 mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Roles &amp; permissions
        </CardTitle>
        <CardDescription>
          Control what each role can access across POS, stations, reports, settings, and staff HR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading roles…</p>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-48 shrink-0 space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors',
                    selectedRoleId === role.id
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="font-medium block">{role.name}</span>
                  {role.is_system && (
                    <span className="text-[10px] uppercase tracking-wide opacity-70">System</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              {selectedRole && (
                <>
                  <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
                  <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
                    {groupedCatalog.map(([group, items]) => (
                      <div key={group}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          {group}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {items.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-start gap-2 rounded-md border border-border/40 px-2 py-1.5 text-sm"
                            >
                              <Checkbox
                                checked={draftPerms.has(p.key)}
                                disabled={!canManage}
                                onCheckedChange={(v) => togglePerm(p.key, v === true)}
                                className="mt-0.5"
                              />
                              <span>
                                <span className="block font-medium leading-tight">{p.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{p.key}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && (
                    <Button onClick={handleSave} disabled={saving} size="sm" className="btn-gradient border-0">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving…' : 'Save permissions'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RolesAndPermissionsPanel;
