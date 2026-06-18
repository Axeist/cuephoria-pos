import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/LocationContext';

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
}

export interface LoyaltyPointsConfig {
  memberRate: number;
  nonMemberRate: number;
  pointsPerRupee: number;
}

export interface TaxSettings {
  gstEnabled: boolean;
  gstRate: number;
  serviceTaxEnabled: boolean;
  serviceTaxRate: number;
}

export interface ReceiptSettings {
  template: 'standard' | 'detailed' | 'minimal';
  showGST: boolean;
  showTax: boolean;
  showLoyaltyPoints: boolean;
  footerMessage: string;
}

export interface SessionSettings {
  defaultTimeout: number;
  autoPauseEnabled: boolean;
  pauseAfterMinutes: number;
}

export interface InventorySettings {
  lowStockThreshold: number;
  alertEnabled: boolean;
}

export interface PaymentSettings {
  cashEnabled: boolean;
  upiEnabled: boolean;
  creditEnabled: boolean;
  splitEnabled: boolean;
}

export interface NotificationSettings {
  lowStockAlerts: boolean;
  sessionTimeouts: boolean;
  dailyReports: boolean;
}

export interface GeneralSettings {
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
}

export interface AppSettings {
  businessInfo: BusinessInfo;
  loyaltyPoints: LoyaltyPointsConfig;
  taxSettings: TaxSettings;
  receiptSettings: ReceiptSettings;
  sessionSettings: SessionSettings;
  inventorySettings: InventorySettings;
  paymentSettings: PaymentSettings;
  notificationSettings: NotificationSettings;
  generalSettings: GeneralSettings;
}

const defaultSettings: AppSettings = {
  businessInfo: {
    name: 'Cuephoria Gaming Lounge',
    address: '',
    phone: '',
    email: '',
    gstin: ''
  },
  loyaltyPoints: {
    memberRate: 5,
    nonMemberRate: 2,
    pointsPerRupee: 100
  },
  taxSettings: {
    gstEnabled: false,
    gstRate: 0,
    serviceTaxEnabled: false,
    serviceTaxRate: 0
  },
  receiptSettings: {
    template: 'standard',
    showGST: false,
    showTax: false,
    showLoyaltyPoints: true,
    footerMessage: 'Thank you for visiting!'
  },
  sessionSettings: {
    defaultTimeout: 60,
    autoPauseEnabled: false,
    pauseAfterMinutes: 0
  },
  inventorySettings: {
    lowStockThreshold: 5,
    alertEnabled: true
  },
  paymentSettings: {
    cashEnabled: true,
    upiEnabled: true,
    creditEnabled: true,
    splitEnabled: true
  },
  notificationSettings: {
    lowStockAlerts: true,
    sessionTimeouts: true,
    dailyReports: false
  },
  generalSettings: {
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    timezone: 'Asia/Kolkata'
  }
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { activeLocationId } = useLocation();

  const loadSettings = async () => {
    try {
      setLoading(true);

      if (activeLocationId) {
        // Read per-branch settings from location_settings
        const { data, error } = await (supabase as any)
          .from('location_settings')
          .select('key, value')
          .eq('location_id', activeLocationId);

        if (!error && data && data.length > 0) {
          const loadedSettings: Partial<AppSettings> = { ...defaultSettings };
          data.forEach((item: { key: string; value: any }) => {
            const key = item.key as keyof AppSettings;
            if (key in defaultSettings) {
              (loadedSettings as any)[key] = item.value;
            }
          });
          setSettings(loadedSettings as AppSettings);
          return;
        }
      }

      // Fallback: global app_settings (used when no location is active or location_settings is empty)
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const loadedSettings: Partial<AppSettings> = { ...defaultSettings };

      if (data) {
        data.forEach((item) => {
          const key = item.key as keyof AppSettings;
          if (key in defaultSettings) {
            (loadedSettings as any)[key] = item.value;
          }
        });
      }

      setSettings(loadedSettings as AppSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error loading settings',
        description: 'Using default settings. Some features may not work correctly.',
        variant: 'destructive'
      });
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<AppSettings>) => {
    try {
      setSaving(true);
      
      const updatesArray = Object.entries(updates).map(([key, value]) => ({
        key,
        value: value as any
      }));

      if (activeLocationId) {
        // Save per-branch settings to location_settings
        for (const update of updatesArray) {
          const { error } = await (supabase as any)
            .from('location_settings')
            .upsert({
              location_id: activeLocationId,
              key: update.key,
              value: update.value,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'location_id,key'
            });

          if (error) throw error;
        }
      } else {
        // Fallback: save to global app_settings
        for (const update of updatesArray) {
          const { error } = await supabase
            .from('app_settings')
            .upsert({
              key: update.key,
              value: update.value,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'key'
            });

          if (error) throw error;
        }
      }

      setSettings(prev => ({ ...prev, ...updates }));
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully.'
      });

      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error saving settings',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [activeLocationId]);

  return {
    settings,
    loading,
    saving,
    loadSettings,
    saveSettings
  };
};

