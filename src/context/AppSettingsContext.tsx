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
import { normalizeSecuritySettings } from "@/utils/securitySettings";

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

import {
  defaultAppSettings,
  type AppSettings,
} from "@/hooks/useAppSettings.types";

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

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      if (activeLocationId) {
        const { data, error } = await (supabase as any)
          .from("location_settings")
          .select("key, value")
          .eq("location_id", activeLocationId);

        if (!error && data && data.length > 0) {
          const partial: Partial<AppSettings> = {};
          data.forEach((item: { key: string; value: unknown }) => {
            const key = item.key as keyof AppSettings;
            if (key in defaultAppSettings) {
              (partial as Record<string, unknown>)[key] = item.value;
            }
          });
          setSettings(mergeLoadedSettings(partial));
          return;
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
  }, [activeLocationId, toast]);

  const persistSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const updatesArray = Object.entries(updates).map(([key, value]) => ({
        key,
        value: value as unknown,
      }));

      if (activeLocationId) {
        for (const update of updatesArray) {
          const { error } = await (supabase as any)
            .from("location_settings")
            .upsert(
              {
                location_id: activeLocationId,
                key: update.key,
                value: update.value,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "location_id,key" },
            );
          if (error) throw error;
        }
        return;
      }

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
