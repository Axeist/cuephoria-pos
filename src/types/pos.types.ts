// Types for the POS system
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
  image?: string;
  originalPrice?: number;
  offerPrice?: number;
  studentPrice?: number;
  duration?: 'weekly' | 'monthly';
  membershipHours?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isMember: boolean;
  membershipExpiryDate?: Date;
  membershipStartDate?: Date;
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
}

export interface Session {
  id: string;
  stationId: string;
  customerId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  hourlyRate?: number;          // ADDED: To store the rate used for this session
  couponCode?: string;          // ADDED: Coupon applied to session
  originalRate?: number;        // ADDED: Original rate before discount
  discountAmount?: number;      // ADDED: Amount discounted
}

export interface CartItem {
  id: string;
  type: 'product' | 'session';
  name: string;
  price: number;
  quantity: number;
  total: number;
  category?: string;
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
  paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary';
  status?: 'completed' | 'complimentary';
  compNote?: string;
  isSplitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
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
  startSession: (stationId: string, customerId: string, hourlyRate?: number, couponCode?: string) => Promise<void>;
  endSession: (stationId: string) => Promise<void>;
  deleteStation: (stationId: string) => Promise<boolean>;
  updateStation: (stationId: string, name: string, type: string, hourlyRate: number) => Promise<boolean>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (customer: Customer) => void;
  updateCustomerMembership: (customerId: string, membershipData: {
    membershipPlan?: string;
    membershipDuration?: 'weekly' | 'monthly';
    membershipHoursLeft?: number;
  }) => Customer | null;
  deleteCustomer: (id: string) => void;
  selectCustomer: (id: string | null) => void;
  
  checkMembershipValidity: (customerId: string) => boolean;
  deductMembershipHours: (customerId: string, hours: number) => boolean;
  
  addToCart: (item: Omit<CartItem, 'total'>) => void;
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  setDiscount: (amount: number, type: 'percentage' | 'fixed') => void;
  setLoyaltyPointsUsed: (points: number) => void;
  calculateTotal: () => number;
  completeSale: (
    paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary',
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
    paymentMethod?: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary'
  ) => Promise<Bill | null>;
  
  exportBills: () => void;
  exportCustomers: () => void;
  
  resetToSampleData: (options?: ResetOptions) => void;
  addSampleIndianData: () => void;
  
  deleteBill: (billId: string, customerId: string) => Promise<boolean>;
}
