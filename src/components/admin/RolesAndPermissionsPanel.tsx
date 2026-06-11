import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Save, Shield, Trash2 } from 'lucide-react';
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

  const loadRoles = useCallback(async (selectRoleId?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles', { credentials: 'same-origin' });
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
      const res = await fetch('/api/admin/roles', {
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
      const res = await fetch('/api/admin/roles', {
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

  const renderRoleButton = (role: WorkspaceRole) => (
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
      <span className="font-medium block truncate">{role.name}</span>
      {role.is_system ? (
        <span className="text-[10px] uppercase tracking-wide opacity-70">System</span>
      ) : (
        <span className="text-[10px] uppercase tracking-wide opacity-70 text-primary/80">Custom</span>
      )}
    </button>
  );

  return (
    <>
      <Card className="glass-card border-border/50 mb-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Roles &amp; permissions
            </CardTitle>
            <CardDescription>
              Edit system templates or create custom roles, then assign them to team members below.
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
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading roles…</p>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-48 shrink-0 space-y-3">
                {systemRoles.length > 0 && (
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      System
                    </p>
                    {systemRoles.map(renderRoleButton)}
                  </div>
                )}
                {customRoles.length > 0 && (
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Custom
                    </p>
                    {customRoles.map(renderRoleButton)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-4">
                {selectedRole && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{selectedRole.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRole.description || 'No description'}
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
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {p.key}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {canManage && (
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="btn-gradient border-0"
                      >
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
