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

export { defaultAppSettings } from "@/hooks/useAppSettings.types";

export {
  AppSettingsProvider,
  useAppSettings,
  useAppSettingsOptional,
} from "@/context/AppSettingsContext";
