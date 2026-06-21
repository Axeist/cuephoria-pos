import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import type { DurationTier } from '@/utils/timeBasedPricing.utils';
import type { EarlyEndBillingMode } from '@/hooks/stations/session-actions/useEndSession';
import type { WalletTopUpOffer } from './membership.types';

export type { PrepaidBookingLink };
export interface Product {
  id: string;
  name: string;
  customerId: string; 
  price: number;
  buyingPrice?: number;
  sellingPrice?: number;
  profit?: number;
  category: string;
  stock: number;
  /** Maximum on-hand capacity; restock cannot exceed this when set. */
  maxStock?: number;
  image?: string;
  originalPrice?: number;
  offerPrice?: number;
  studentPrice?: number;
  duration?: 'weekly' | 'monthly';
  membershipHours?: number;
  membershipTierId?: string;
}

export interface Customer {
  id: string;
  customerId?: string; // Custom customer ID (e.g., CUE1234ABCD)
  name: string;
  phone: string;
  email?: string;
  /** @deprecated use membershipTierId — kept for DB transition */
  isMember: boolean;
  membershipTierId?: string;
  membershipTierName?: string;
  /** NFC UID of the member's active linked card. */
  activeCardUid?: string;
  playtimeDiscountPct?: number;
  cardBalance?: number;
  membershipExpiryDate?: Date;
  membershipStartDate?: Date;
  /** @deprecated use membershipTierName */
  membershipPlan?: string;
  membershipHoursLeft?: number;
  membershipDuration?: 'weekly' | 'monthly';
  loyaltyPoints: number;
  totalSpent: number;
  totalPlayTime: number;
  createdAt: Date;
}

export interface Station {
  id: string;
  name: string;
  type: string;
  hourlyRate: number;
  isOccupied: boolean;
  currentSession: Session | null;
  category?: string | null;
  eventEnabled?: boolean | null;
  slotDuration?: number | null;
  maxPlayers: number;
  occupancyRates: Record<string, number>;
  pricingMode: 'static' | 'per_player' | 'time_based';
  /** Duration tiers for time_based pricing (minutes → flat price). */
  durationTiers?: DurationTier[];
  /** @deprecated Legacy controller grouping */
  teamName?: string | null;
  teamColor?: string | null;
  maxCapacity?: number | null;
  singleRate?: number | null;
  /** Optional hex or gradient tint override (e.g. #8B5CF6 or gradient:8B5CF6:EC4899:135). */
  accentColor?: string | null;
  /** Grid display order on Station Command (lower = first). */
  sortOrder?: number;
  /** Temporary maintenance closure — blocks sessions and public booking. */
  maintenanceMode?: boolean;
  maintenanceStartedAt?: Date | null;
  maintenancePlannedEndAt?: Date | null;
  maintenanceStartedBy?: string | null;
}

export interface Session {
  id: string;
  stationId: string;
  customerId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  hourlyRate?: number;
  couponCode?: string;
  originalRate?: number;
  discountAmount?: number;
  playerCount?: number;
  perPersonRate?: number;
  isPaused?: boolean;
  pausedAt?: Date;
  totalPausedMs?: number;
  /** Target billable play time set at session start (minutes). */
  plannedDurationMinutes?: number;
  /** Shared id when started via group start (multiple stations, one customer). */
  sessionGroupId?: string;
  /** Linked online booking — session time pre-paid; bill overtime / shop only. */
  prepaidBooking?: PrepaidBookingLink;
  /** Locked package price for time_based sessions. */
  timeTierPrice?: number;
  /** Per-minute rate when play exceeds planned duration (time_based). */
  overtimePerMinute?: number;
}

export interface ProductCategoryMeta {
  name: string;
  accentColor: string | null;
  quickShopEnabled: boolean;
}

export interface CartItem {
  id: string;
  type: 'product' | 'session';
  name: string;
  price: number;
  quantity: number;
  total: number;
  category?: string;
  /** Set when the item was ordered from a station quick shop. */
  stationName?: string;
}

export interface Bill {
  id: string;
  customerId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  total: number;
  taxableAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  gstinSnapshot?: string;
  paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary' | 'razorpay' | 'card';
  status?: 'completed' | 'complimentary';
  compNote?: string;
  isSplitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
  transactionFee?: number; // Transaction fee for online payments (2.5% of total)
  createdAt: Date;
}

export interface ResetOptions {
  products: boolean;
  customers: boolean;
  sales: boolean;
  sessions: boolean;
}

export interface SessionResult {
  updatedSession?: Session;
  sessionCartItem?: CartItem;
  customer?: Customer;
}

export interface SessionGroupResult {
  sessionCartItems: CartItem[];
  customer?: Customer;
}

/** How ending a session resolves checkout — POS handoff vs backend draft only. */
export type SessionEndCheckoutMode = 'pos' | 'draft';

export interface SavedCartSummary {
  customerId: string;
  customerName: string;
  itemCount: number;
  timestamp: number;
  record: {
    items: CartItem[];
    discount: number;
    discount_type: 'percentage' | 'fixed';
    loyalty_points_used: number;
  };
}

export interface POSContextType {
  products: Product[];
  productsLoading?: boolean;
  productsError?: string | null;
  stations: Station[];
  customers: Customer[];
  sessions: Session[];
  bills: Bill[];
  cart: CartItem[];
  selectedCustomer: Customer | null;
  discount: number;
  discountType: 'percentage' | 'fixed';
  loyaltyPointsUsed: number;
  isStudentDiscount: boolean;
  categories: string[];
  categoryMeta: Record<string, ProductCategoryMeta>;
  getCategoryAccentColor: (category: string) => string;
  isCategoryInQuickShop: (category: string) => boolean;
  updateCategoryAppearance: (
    category: string,
    patch: { accentColor?: string | null; quickShopEnabled?: boolean }
  ) => Promise<void>;
  isSplitPayment: boolean;
  cashAmount: number;
  upiAmount: number;
  setIsStudentDiscount: (value: boolean) => void;
  setIsSplitPayment: (value: boolean) => void;
  setCashAmount: (amount: number) => void;
  setUpiAmount: (amount: number) => void;
  updateSplitAmounts: (cash: number, upi: number) => boolean;
  
  setBills?: (bills: Bill[] | ((prevBills: Bill[]) => Bill[])) => void;
  setCustomers?: (customers: Customer[] | ((prevCustomers: Customer[]) => Customer[])) => void;
  
  setStations: (stations: Station[]) => void;
  
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  
  addCategory: (category: string) => void;
  updateCategory: (oldCategory: string, newCategory: string) => void;
  deleteCategory: (category: string) => void;
  
  // UPDATED: Added hourlyRate and couponCode parameters
  startSession: (
    stationId: string,
    customerId: string,
    hourlyRate?: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number,
    plannedDurationMinutes?: number,
    prepaidBooking?: PrepaidBookingLink,
    sessionGroupId?: string,
    customStartTime?: Date
  ) => Promise<void>;
  extendSession: (stationId: string, extraMinutes: number) => Promise<void>;
  moveSession: (fromStationId: string, toStationId: string) => Promise<void>;
  startMaintenance: (stationId: string, durationMinutes: number, startedByName: string) => Promise<boolean>;
  endMaintenance: (stationId: string) => Promise<void>;
  endSession: (stationId: string, billingMode?: EarlyEndBillingMode) => Promise<SessionEndCheckoutMode | void>;
  endSessionGroup: (stationId: string) => Promise<SessionEndCheckoutMode | void>;
  pauseSession: (stationId: string) => Promise<void>;
  resumeSession: (stationId: string) => Promise<void>;
  deleteStation: (stationId: string) => Promise<boolean>;
  updateStation: (
    stationId: string,
    updates: {
      name: string;
      hourlyRate: number;
      maxPlayers?: number;
      occupancyRates?: Record<string, number>;
      slotDuration?: number | null;
      eventEnabled?: boolean;
      category?: string | null;
      type?: string;
      pricingMode?: 'static' | 'per_player' | 'time_based';
      durationTiers?: DurationTier[];
      accentColor?: string | null;
    }
  ) => Promise<boolean>;
  refreshStations: (silent?: boolean) => Promise<void>;
  reorderStations: (orderedIds: string[]) => Promise<boolean>;
  applyAccentToStationType: (typeSlug: string, accentColor: string | null) => Promise<boolean>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (customer: Customer) => void;
  updateCustomerMembership: (customerId: string, membershipData: {
    membershipPlan?: string;
    membershipDuration?: 'weekly' | 'monthly';
    membershipHoursLeft?: number;
  }) => Customer | null;
  deleteCustomer: (id: string) => void;
  selectCustomer: (id: string | null) => void;
  /** Load a saved cart into checkout, including session-only drafts from group/partial ends. */
  loadSavedCartForCheckout: (customerId: string) => void;
  deductMembershipHours: (customerId: string, hours: number) => boolean;
  
  addToCart: (item: Omit<CartItem, 'total'>) => void;
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, quantity: number, stationName?: string) => void;
  clearCart: (options?: { silent?: boolean; skipSavedCartDelete?: boolean }) => void;

  savedCarts: SavedCartSummary[];
  savedCartsLoading: boolean;
  refreshSavedCarts: () => Promise<void>;
  removeSavedCart: (customerId: string) => Promise<void>;
  removeAllSavedCarts: () => Promise<number>;
  moveCartToSaved: () => Promise<void>;

  getStationQuickShopItems: (sessionId: string) => CartItem[];
  addToStationQuickShop: (sessionId: string, product: Product, quantity?: number, stationName?: string) => void;
  updateStationQuickShopQuantity: (sessionId: string, productId: string, quantity: number, product?: Product) => void;
  removeFromStationQuickShop: (sessionId: string, productId: string) => void;
  
  setDiscount: (amount: number, type: 'percentage' | 'fixed') => void;
  setLoyaltyPointsUsed: (points: number) => void;
  calculateTotal: () => number;
  pendingWalletTopUp: WalletTopUpOffer | null;
  clearPendingWalletTopUp: () => void;
  completeSale: (
    paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary' | 'razorpay',
    status?: 'completed' | 'complimentary',
    compNote?: string
  ) => Promise<Bill | undefined>;
  updateBill: (
    originalBill: Bill, 
    updatedItems: CartItem[], 
    customer: Customer, 
    discount: number, 
    discountType: 'percentage' | 'fixed', 
    loyaltyPointsUsed: number, 
    isSplitPayment?: boolean, 
    cashAmount?: number, 
    upiAmount?: number,
    paymentMethod?: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary' | 'razorpay'
  ) => Promise<Bill | null>;

  /** Mark a credit bill as collected: cash, UPI, or split (updates DB only; no line-item rewrite). */
  realiseCreditPayment: (
    bill: Bill,
    mode: 'cash' | 'upi' | 'split',
    options?: { splitCash?: number; splitUpi?: number; silent?: boolean }
  ) => Promise<Bill | null>;
  
  exportBills: () => void;
  exportCustomers: () => void;
  
  resetToSampleData: (options?: ResetOptions) => void;
  addSampleIndianData: () => void;
  
  deleteBill: (billId: string, customerId: string) => Promise<boolean>;
}
