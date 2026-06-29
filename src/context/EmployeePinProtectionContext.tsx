import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { fetchEmployeePinProtectionStatus } from '@/services/employeePinService';

type EmployeePinProtectionContextValue = {
  enabled: boolean;
  loading: boolean;
  fetchError: string | null;
  reload: () => Promise<void>;
};

const EmployeePinProtectionContext = createContext<EmployeePinProtectionContextValue | undefined>(
  undefined,
);

export const EmployeePinProtectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const orgCtx = useOrganizationOptional();
  const organizationId = orgCtx?.organization?.id ?? null;
  const orgLoading = orgCtx?.status === 'loading';

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (orgLoading || !organizationId) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const on = await fetchEmployeePinProtectionStatus();
      setEnabled(on);
    } catch (e) {
      setEnabled(false);
      setFetchError(e instanceof Error ? e.message : 'Could not load PIN protection status');
    } finally {
      setLoading(false);
    }
  }, [organizationId, orgLoading]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ enabled, loading, fetchError, reload }),
    [enabled, loading, fetchError, reload],
  );

  return (
    <EmployeePinProtectionContext.Provider value={value}>
      {children}
    </EmployeePinProtectionContext.Provider>
  );
};

export function useEmployeePinProtection(): EmployeePinProtectionContextValue {
  const ctx = useContext(EmployeePinProtectionContext);
  if (!ctx) {
    throw new Error('useEmployeePinProtection must be used within EmployeePinProtectionProvider');
  }
  return ctx;
}
