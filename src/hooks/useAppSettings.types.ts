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
  template: "standard" | "detailed" | "minimal";
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
  timeFormat: "12h" | "24h";
  timezone: string;
}

export interface SecuritySettings {
  pinProtectionEnabled: boolean;
  adminPin: string;
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
  securitySettings: SecuritySettings;
}

export const defaultAppSettings: AppSettings = {
  businessInfo: {
    name: "Cuephoria Gaming Lounge",
    address: "",
    phone: "",
    email: "",
    gstin: "",
  },
  loyaltyPoints: {
    memberRate: 5,
    nonMemberRate: 2,
    pointsPerRupee: 100,
  },
  taxSettings: {
    gstEnabled: false,
    gstRate: 0,
    serviceTaxEnabled: false,
    serviceTaxRate: 0,
  },
  receiptSettings: {
    template: "standard",
    showGST: false,
    showTax: false,
    showLoyaltyPoints: true,
    footerMessage: "Thank you for visiting!",
  },
  sessionSettings: {
    defaultTimeout: 60,
    autoPauseEnabled: false,
    pauseAfterMinutes: 0,
  },
  inventorySettings: {
    lowStockThreshold: 5,
    alertEnabled: true,
  },
  paymentSettings: {
    cashEnabled: true,
    upiEnabled: true,
    creditEnabled: true,
    splitEnabled: true,
  },
  notificationSettings: {
    lowStockAlerts: true,
    sessionTimeouts: true,
    dailyReports: false,
  },
  generalSettings: {
    currency: "INR",
    currencySymbol: "₹",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    timezone: "Asia/Kolkata",
  },
  securitySettings: {
    pinProtectionEnabled: true,
    adminPin: "1234",
  },
};
