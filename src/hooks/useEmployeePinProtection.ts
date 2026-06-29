import { useCallback, useEffect, useState } from 'react';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { fetchEmployeePinProtection } from '@/services/employeePinService';
import type { StaffHrSettings } from '@/types/staff.types';

const defaultSettings: StaffHrSettings = {
  organizationId: '',
  payrollPayoutThreshold: 15000,
  breakMaxMinutes: 60,
  employeePinProtectionEnabled: false,
};

export function useEmployeePinProtection() {
  const orgCtx = useOrganizationOptional();
  const organizationId = orgCtx?.organization?.id ?? null;
  const [settings, setSettings] = useState<StaffHrSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!organizationId) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchEmployeePinProtection(organizationId);
      setSettings(row);
    } catch {
      setSettings({ ...defaultSettings, organizationId });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    settings,
    enabled: settings.employeePinProtectionEnabled,
    reload,
  };
}
