import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/services/adminFetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/context/PermissionsContext';
import type { PermissionMeta } from '@/constants/permissionCatalog';
import { Plus, RotateCcw, Save, Shield, Sparkles, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkspaceRole = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_system: boolean;
};

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

const RolesAndPermissionsPanel: React.FC = () => {
  const { toast } = useToast();
  const { can, refresh: refreshSessionPerms } = usePermissions();
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionMeta[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());
  const [savedPerms, setSavedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [cloneFromRoleId, setCloneFromRoleId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const systemRoles = useMemo(() => roles.filter((r) => r.is_system), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.is_system), [roles]);

  const defaultCloneRoleId = useMemo(
    () => roles.find((r) => r.slug === 'employee')?.id ?? roles[0]?.id ?? '',
    [roles],
  );

  const hasUnsavedChanges = useMemo(
    () => !setsEqual(draftPerms, savedPerms),
    [draftPerms, savedPerms],
  );

  const loadRoles = useCallback(async (selectRoleId?: string) => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/roles', { credentials: 'same-origin' });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to load roles');
      const loaded: WorkspaceRole[] = json.roles ?? [];
      setRoles(loaded);
      setCatalog(json.catalog ?? []);
      setCanManage(!!json.canManage);

      if (selectRoleId) {
        setSelectedRoleId(selectRoleId);
      } else {
        setSelectedRoleId((current) => {
          if (current && loaded.some((r) => r.id === current)) return current;
          return loaded[0]?.id ?? null;
        });
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
  }, [toast]);

  const loadRoleDetail = useCallback(async (roleId: string) => {
    setLoadingDetail(true);
    try {
      const res = await adminFetch(`/api/admin/roles?roleId=${encodeURIComponent(roleId)}`, {
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to load role');
      const perms = new Set<string>(json.permissions ?? []);
      setDraftPerms(perms);
      setSavedPerms(new Set(perms));
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load role permissions',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetail(false);
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

  const toggleGroup = (items: PermissionMeta[], enable: boolean) => {
    if (!canManage) return;
    setDraftPerms((prev) => {
      const next = new Set(prev);
      for (const p of items) {
        if (enable) next.add(p.key);
        else next.delete(p.key);
      }
      return next;
    });
  };

  const handleDiscard = () => {
    setDraftPerms(new Set(savedPerms));
  };

  const handleSave = async () => {
    if (!selectedRoleId || !hasUnsavedChanges) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/roles', {
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
      setSavedPerms(new Set(draftPerms));
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

  const handleSelectRole = (roleId: string) => {
    if (roleId === selectedRoleId) return;
    if (
      hasUnsavedChanges &&
      !confirm('You have unsaved permission changes. Switch role and discard them?')
    ) {
      return;
    }
    setSelectedRoleId(roleId);
  };

  const resetCreateForm = () => {
    setNewRoleName('');
    setNewRoleDescription('');
    setCloneFromRoleId(defaultCloneRoleId);
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const handleCreateRole = async () => {
    const name = newRoleName.trim();
    if (!name) {
      toast({ title: 'Name required', description: 'Enter a role name.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await adminFetch('/api/admin/roles', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          description: newRoleDescription.trim() || undefined,
          cloneFromRoleId: cloneFromRoleId || undefined,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Create failed');
      toast({
        title: 'Role created',
        description: `"${name}" is ready — adjust permissions below and save.`,
      });
      setCreateOpen(false);
      await loadRoles(json.roleId as string);
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Create failed',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRoleId || selectedRole?.is_system) return;
    if (
      !confirm(
        `Delete custom role "${selectedRole?.name}"?\n\nThis cannot be undone. Team members must be reassigned first.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await adminFetch('/api/admin/roles', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', roleId: selectedRoleId }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Delete failed');
      toast({ title: 'Role deleted', description: `"${selectedRole?.name}" was removed.` });
      setSelectedRoleId(null);
      await loadRoles();
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!can('settings.team.view') && !can('roles.manage')) {
    return null;
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const enabledCount = draftPerms.size;
  const totalCount = catalog.length;

  const renderRoleButton = (role: WorkspaceRole) => {
    const active = selectedRoleId === role.id;
    return (
      <button
        key={role.id}
        type="button"
        onClick={() => handleSelectRole(role.id)}
        className={cn(
          'w-full text-left rounded-xl px-3 py-2.5 text-sm border transition-all',
          active
            ? 'border-primary/50 bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/20'
            : 'border-border/40 bg-card/20 text-muted-foreground hover:border-border/70 hover:text-foreground hover:bg-muted/20',
        )}
      >
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              active ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground',
            )}
          >
            {role.is_system ? (
              <Shield className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-medium block truncate">{role.name}</span>
            <span className="text-[10px] uppercase tracking-wide opacity-70">
              {role.is_system ? 'System template' : 'Custom role'}
            </span>
          </span>
        </div>
      </button>
    );
  };

  return (
    <>
      <Card className="glass-card border-border/50 mb-6 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-border/40 bg-muted/5 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Roles &amp; permissions
            </CardTitle>
            <CardDescription>
              Pick a role, toggle access, then save. Assign roles to people in the member list below.
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              className="btn-gradient border-0 shrink-0 gap-1.5"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              Create role
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6">Loading roles…</p>
          ) : (
            <div className="flex flex-col lg:flex-row lg:min-h-[480px]">
              <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border/40 p-4 space-y-4 bg-muted/5">
                {systemRoles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      System templates
                    </p>
                    {systemRoles.map(renderRoleButton)}
                  </div>
                )}
                {customRoles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Custom roles
                    </p>
                    {customRoles.map(renderRoleButton)}
                  </div>
                )}
              </aside>

              <div className="flex-1 min-w-0 flex flex-col">
                {selectedRole ? (
                  <>
                    <div className="px-4 sm:px-6 py-4 border-b border-border/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">{selectedRole.name}</h3>
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal bg-primary/10 text-primary border-primary/20"
                            >
                              {enabledCount} of {totalCount} permissions
                            </Badge>
                            {hasUnsavedChanges && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500/40 text-amber-300 bg-amber-500/10"
                              >
                                Unsaved changes
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground max-w-xl">
                            {selectedRole.description || 'No description for this role.'}
                          </p>
                        </div>
                        {canManage && !selectedRole.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                            disabled={deleting}
                            onClick={handleDeleteRole}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {deleting ? 'Deleting…' : 'Delete role'}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 max-h-[440px]">
                      {loadingDetail ? (
                        <p className="text-sm text-muted-foreground">Loading permissions…</p>
                      ) : (
                        groupedCatalog.map(([group, items]) => {
                          const groupEnabled = items.filter((p) => draftPerms.has(p.key)).length;
                          const allOn = groupEnabled === items.length;
                          const noneOn = groupEnabled === 0;
                          return (
                            <section
                              key={group}
                              className="rounded-xl border border-border/50 bg-card/30 overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/20 border-b border-border/40">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                                    {group}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {groupEnabled} / {items.length} enabled
                                  </p>
                                </div>
                                {canManage && (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-[10px] px-2"
                                      disabled={allOn}
                                      onClick={() => toggleGroup(items, true)}
                                    >
                                      All
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-[10px] px-2"
                                      disabled={noneOn}
                                      onClick={() => toggleGroup(items, false)}
                                    >
                                      None
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="p-2 grid sm:grid-cols-2 gap-1.5">
                                {items.map((p) => {
                                  const on = draftPerms.has(p.key);
                                  const changed =
                                    on !== savedPerms.has(p.key);
                                  return (
                                    <label
                                      key={p.key}
                                      className={cn(
                                        'flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors border',
                                        on
                                          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                                          : 'border-transparent bg-transparent hover:bg-muted/20',
                                        changed && 'ring-1 ring-amber-500/30',
                                        !canManage && 'cursor-default opacity-80',
                                      )}
                                    >
                                      <Checkbox
                                        checked={on}
                                        disabled={!canManage}
                                        onCheckedChange={(v) => togglePerm(p.key, v === true)}
                                        className="mt-0.5"
                                      />
                                      <span className="min-w-0">
                                        <span className="block font-medium leading-snug text-[13px]">
                                          {p.label}
                                        </span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })
                      )}
                    </div>

                    {canManage && hasUnsavedChanges && (
                      <div className="sticky bottom-0 border-t border-border/50 bg-background/95 backdrop-blur px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Changes apply to everyone assigned this role after you save.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-border/50"
                            disabled={saving}
                            onClick={handleDiscard}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Discard
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="btn-gradient border-0"
                          >
                            <Save className="h-4 w-4 mr-1.5" />
                            {saving ? 'Saving…' : 'Save permissions'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground p-6">Select a role to edit permissions.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text">Create custom role</DialogTitle>
            <DialogDescription>
              Start from a template or blank permissions, then fine-tune access in the matrix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-role-name">Role name</Label>
              <Input
                id="new-role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Booking coordinator"
                className="glass-card border-border/50"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-role-desc">Description (optional)</Label>
              <Input
                id="new-role-desc"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="What this role is for"
                className="glass-card border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Copy permissions from</Label>
              <Select
                value={cloneFromRoleId || defaultCloneRoleId}
                onValueChange={setCloneFromRoleId}
              >
                <SelectTrigger className="glass-card border-border/50">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.is_system ? ' (system)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                New role starts with the same permissions as this template. You can change them after
                creating.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-border/50">
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={creating || !newRoleName.trim()}
              className="btn-gradient border-0"
            >
              {creating ? 'Creating…' : 'Create role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RolesAndPermissionsPanel;
