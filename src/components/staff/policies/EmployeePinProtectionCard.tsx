import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/context/PermissionsContext';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { useEmployeePinProtection } from '@/hooks/useEmployeePinProtection';
import { updateEmployeePinProtection } from '@/services/employeePinService';
import { cn } from '@/lib/utils';

export default function EmployeePinProtectionCard({ compact = false }: { compact?: boolean }) {
  const { toast } = useToast();
  const { can } = usePermissions();
  const orgCtx = useOrganizationOptional();
  const organizationId = orgCtx?.organization?.id ?? null;
  const { enabled, loading, reload } = useEmployeePinProtection();
  const [saving, setSaving] = useState(false);

  const canEdit = can('hr.policies.edit');

  const onToggle = async (next: boolean) => {
    if (!organizationId || !canEdit) return;
    setSaving(true);
    try {
      await updateEmployeePinProtection(organizationId, next);
      await reload();
      toast({
        title: next ? 'Employee PIN protection enabled' : 'Employee PIN protection disabled',
        description: next
          ? 'On-duty staff enter their own My Portal PIN at the POS — even on a shared floor login.'
          : 'Sensitive actions no longer require an employee PIN.',
      });
    } catch (e) {
      toast({
        title: 'Could not save setting',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/40 bg-muted/5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base">Employee PIN protection</CardTitle>
              <CardDescription className="text-xs mt-0.5 line-clamp-2">
                On-duty staff enter their own PIN at POS — works on shared floor logins.
              </CardDescription>
            </div>
          </div>
          <Switch
            id="employee-pin-protection-compact"
            checked={enabled}
            disabled={!canEdit || loading || saving || !organizationId}
            onCheckedChange={(v) => void onToggle(v)}
            aria-label="Require employee PIN"
          />
        </CardHeader>
        {!canEdit && (
          <CardContent className="py-2.5 px-4 text-xs text-muted-foreground">
            HR policy access required to change this setting.
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50 mb-6 overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b border-border/40 bg-muted/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg leading-tight">Employee PIN protection</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              When enabled, on-duty staff enter their own My Portal PIN before payments, stock
              changes, console moves, and member updates — even on a shared floor login. The
              activity log records who actually performed each action.
            </CardDescription>
          </div>
        </div>

        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 sm:justify-end sm:min-w-[200px]',
            enabled
              ? 'border-primary/30 bg-primary/5'
              : 'border-border/50 bg-card/30',
          )}
        >
          <div className="sm:text-right">
            <Label
              htmlFor="employee-pin-protection"
              className="text-sm font-medium cursor-pointer"
            >
              {enabled ? 'Protection on' : 'Protection off'}
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {loading || saving
                ? 'Saving…'
                : enabled
                  ? 'PIN required for sensitive actions'
                  : 'No PIN prompts'}
            </p>
          </div>
          <Switch
            id="employee-pin-protection"
            checked={enabled}
            disabled={!canEdit || loading || saving || !organizationId}
            onCheckedChange={(v) => void onToggle(v)}
          />
        </div>
      </CardHeader>

      {!canEdit && (
        <CardContent className="py-3 text-xs text-muted-foreground">
          Only managers with HR policy access can change this setting.
        </CardContent>
      )}
    </Card>
  );
}
