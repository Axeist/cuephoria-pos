import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/context/PermissionsContext';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { useEmployeePinProtection } from '@/hooks/useEmployeePinProtection';
import { updateEmployeePinProtection } from '@/services/employeePinService';

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
          ? 'Staff must clock in and enter their My Portal PIN for sensitive actions.'
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

  return (
    <Card className={compact ? 'border-border/60' : 'glass-card border-border/50'}>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
          <Shield className="h-5 w-5 text-primary" />
          Employee PIN for sensitive actions
        </CardTitle>
        <CardDescription>
          When on, staff must be clocked in and enter their My Portal PIN before payments, stock
          changes, moving consoles, member changes, and more. All actions are recorded in the
          staff activity log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div>
            <Label htmlFor="employee-pin-protection" className="text-sm font-medium">
              Require employee PIN
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled ? 'Protection is active for this workspace.' : 'Protection is off — no PIN prompts.'}
            </p>
          </div>
          <Switch
            id="employee-pin-protection"
            checked={enabled}
            disabled={!canEdit || loading || saving || !organizationId}
            onCheckedChange={(v) => void onToggle(v)}
          />
        </div>
        {!canEdit && (
          <p className="text-xs text-muted-foreground mt-2">
            Only managers with HR policy access can change this setting.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
