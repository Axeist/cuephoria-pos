import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/context/LocationContext";
import { usePermissionsOptional } from "@/context/PermissionsContext";
import { normalizeSecuritySettings } from "@/utils/securitySettings";
import { adminFetch } from "@/services/adminFetch";

export type {
  AppSettings,
  BusinessInfo,
  GeneralSettings,
  InventorySettings,
  LoyaltyPointsConfig,
  NotificationSettings,
  PaymentSettings,
  ReceiptSettings,
  SecuritySettings,
  SessionSettings,
  TaxSettings,
} from "@/hooks/useAppSettings.types";

import { defaultAppSettings, type AppSettings } from "@/hooks/useAppSettings.types";

type AppSettingsContextValue = {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (
    updates: Partial<AppSettings>,
    options?: { silent?: boolean },
  ) => Promise<boolean>;
  saveSecuritySettings: (
    security: AppSettings["securitySettings"],
    options?: { silent?: boolean },
  ) => Promise<boolean>;
};

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(
  undefined,
);

function mergeLoadedSettings(raw: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = {
    ...defaultAppSettings,
    ...raw,
    securitySettings: normalizeSecuritySettings(raw.securitySettings),
  };
  return merged;
}

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const perms = usePermissionsOptional();

  const loadSettings = useCallback(async () => {
    if (activeLocationId && perms?.isLoading) {
      return;
    }

    try {
      setLoading(true);

      const canViewBranchSettings =
        !activeLocationId ||
        !perms ||
        perms.bypass ||
        perms.can("settings.general.view");

      if (activeLocationId && !canViewBranchSettings) {
        setSettings(defaultAppSettings);
        return;
      }

      if (activeLocationId) {
        const res = await fetch(
          `/api/admin/location-settings?location_id=${encodeURIComponent(activeLocationId)}`,
          { credentials: "same-origin" },
        );
        const json = await res.json().catch(() => ({}));
        if (json?.ok && Array.isArray(json.settings)) {
          const partial: Partial<AppSettings> = {};
          json.settings.forEach((item: { key: string; value: unknown }) => {
            const key = item.key as keyof AppSettings;
            if (key in defaultAppSettings) {
              (partial as Record<string, unknown>)[key] = item.value;
            }
          });
          setSettings(mergeLoadedSettings(partial));
          return;
        }
        if (!json?.ok) {
          const permissionDenied =
            res.status === 403 ||
            json?.error === "You do not have permission for this action.";
          if (permissionDenied) {
            setSettings(defaultAppSettings);
            return;
          }
          throw new Error(json?.error || "Failed to load branch settings");
        }
      }

      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (error) throw error;

      const partial: Partial<AppSettings> = {};
      if (data) {
        data.forEach((item) => {
          const key = item.key as keyof AppSettings;
          if (key in defaultAppSettings) {
            (partial as Record<string, unknown>)[key] = item.value;
          }
        });
      }

      setSettings(mergeLoadedSettings(partial));
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error loading settings",
        description: "Using default settings. Some features may not work correctly.",
        variant: "destructive",
      });
      setSettings(defaultAppSettings);
    } finally {
      setLoading(false);
    }
  }, [activeLocationId, toast, perms]);

  const persistSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const updatesRecord = Object.fromEntries(
        Object.entries(updates).filter(([key]) => key in defaultAppSettings),
      ) as Partial<AppSettings>;

      if (activeLocationId) {
        const res = await adminFetch("/api/admin/location-settings", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            location_id: activeLocationId,
            updates: updatesRecord,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!json?.ok) {
          throw new Error(json?.error || "Failed to save branch settings");
        }
        return;
      }

      const updatesArray = Object.entries(updatesRecord).map(([key, value]) => ({
        key,
        value: value as unknown,
      }));

      for (const update of updatesArray) {
        const { error } = await supabase.from("app_settings").upsert(
          {
            key: update.key,
            value: update.value as never,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
        if (error) throw error;
      }
    },
    [activeLocationId],
  );

  const saveSettings = useCallback(
    async (updates: Partial<AppSettings>, options?: { silent?: boolean }) => {
      try {
        setSaving(true);

        const normalized: Partial<AppSettings> = { ...updates };
        if (updates.securitySettings) {
          normalized.securitySettings = normalizeSecuritySettings(
            updates.securitySettings,
          );
        }

        await persistSettings(normalized);

        setSettings((prev) => ({
          ...prev,
          ...normalized,
          securitySettings: normalized.securitySettings
            ? normalized.securitySettings
            : prev.securitySettings,
        }));

        if (!options?.silent) {
          toast({
            title: "Settings saved",
            description: "Your settings have been updated successfully.",
          });
        }

        return true;
      } catch (error) {
        console.error("Error saving settings:", error);
        toast({
          title: "Error saving settings",
          description: "Failed to save settings. Please try again.",
          variant: "destructive",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [persistSettings, toast],
  );

  const saveSecuritySettings = useCallback(
    async (
      security: AppSettings["securitySettings"],
      options?: { silent?: boolean },
    ) => saveSettings({ securitySettings: security }, options),
    [saveSettings],
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      loadSettings,
      saveSettings,
      saveSecuritySettings,
    }),
    [settings, loading, saving, loadSettings, saveSettings, saveSecuritySettings],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
};

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return ctx;
}

/** Safe outside provider (e.g. rare public routes). */
export function useAppSettingsOptional(): AppSettingsContextValue | null {
  return useContext(AppSettingsContext) ?? null;
}
