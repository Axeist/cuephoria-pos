export interface CafePartner {
  id: string;
  locationId: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  partnerRate: number;
  cuephoriaRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CafeUser {
  id: string;
  locationId: string;
  partnerId: string;
  username: string;
  displayName?: string;
  role: CafeUserRole;
  isActive: boolean;
  createdAt: Date;
}

export type CafeUserRole = 'cafe_admin' | 'cashier' | 'kitchen' | 'staff';

export interface CafeSessionUser {
  id: string;
  username: string;
  displayName: string;
  role: CafeUserRole;
  partnerId: string;
  locationId: string;
}

export interface CafeMenuCategory {
  id: string;
  locationId: string;
  partnerId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CafeMenuItem {
  id: string;
  categoryId: string;
  locationId: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  prepTimeMinutes?: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CafeTable {
  id: string;
  locationId: string;
  partnerId: string;
  tableName: string;
  zone: string;
  capacity: number;
  isAvailable: boolean;
  isOccupied: boolean;
  currentOrderId?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CafeOrderType = 'dine_in' | 'takeaway' | 'delivery_to_station' | 'self_order';
export type CafeOrderSource = 'pos' | 'customer';
export type CafePaymentMethod = 'cash' | 'upi' | 'split' | 'complimentary' | 'pending';
export type CafeOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface CafeOrder {
  id: string;
  locationId: string;
  partnerId: string;
  orderNumber: string;
  orderType: CafeOrderType;
  orderSource: CafeOrderSource;
  cafeTableId?: string | null;
  stationId?: string | null;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  partnerRateSnapshot: number;
  cuephoriaRateSnapshot: number;
  partnerShare: number;
  cuephoriaShare: number;
  paymentMethod: CafePaymentMethod;
  cashAmount?: number;
  upiAmount?: number;
  status: CafeOrderStatus;
  notes?: string;
  createdBy?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  // Joined data (populated in hooks)
  items?: CafeOrderItem[];
  table?: CafeTable | null;
  customerData?: { name: string; phone: string } | null;
}

export type KOTItemStatus = 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface CafeOrderItem {
  id: string;
  orderId: string;
  menuItemId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  kotStatus: KOTItemStatus;
  createdAt: Date;
}

export type KOTStatus = 'pending' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface KOTItem {
  item_id: string;
  name: string;
  qty: number;
  notes?: string;
}

export interface CafeKOT {
  id: string;
  orderId: string;
  locationId: string;
  kotNumber: string;
  status: KOTStatus;
  items: KOTItem[];
  createdBy?: string | null;
  createdAt: Date;
  acknowledgedAt?: Date | null;
  readyAt?: Date | null;
  servedAt?: Date | null;
  // Joined
  order?: CafeOrder | null;
}

export type SettlementStatus = 'draft' | 'confirmed' | 'paid';

export interface CafeSettlement {
  id: string;
  locationId: string;
  partnerId: string;
  settlementDate: string;
  periodStart: Date;
  periodEnd: Date;
  totalOrders: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  partnerPayout: number;
  cuephoriaRevenue: number;
  status: SettlementStatus;
  notes?: string;
  confirmedBy?: string | null;
  createdAt: Date;
}

// Cart types for POS and self-order
export interface CafeCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  notes?: string;
  isVeg: boolean;
}

export interface CafeCartState {
  items: CafeCartItem[];
  orderType: CafeOrderType;
  cafeTableId?: string | null;
  stationId?: string | null;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  discount: number;
  notes?: string;
}

// DB row shapes (snake_case — for Supabase query mapping)
export interface CafePartnerRow {
  id: string;
  location_id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  partner_rate: number;
  cuephoria_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CafeUserRow {
  id: string;
  location_id: string;
  partner_id: string;
  username: string;
  password: string;
  display_name: string | null;
  role: CafeUserRole;
  is_active: boolean;
  created_at: string;
}

export interface CafeMenuCategoryRow {
  id: string;
  location_id: string;
  partner_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CafeMenuItemRow {
  id: string;
  category_id: string;
  location_id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  prep_time_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CafeTableRow {
  id: string;
  location_id: string;
  partner_id: string;
  table_name: string;
  zone: string;
  capacity: number;
  is_available: boolean;
  is_occupied: boolean;
  current_order_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CafeOrderRow {
  id: string;
  location_id: string;
  partner_id: string;
  order_number: string;
  order_type: CafeOrderType;
  order_source: CafeOrderSource;
  cafe_table_id: string | null;
  station_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  partner_rate_snapshot: number;
  cuephoria_rate_snapshot: number;
  partner_share: number;
  cuephoria_share: number;
  payment_method: CafePaymentMethod;
  cash_amount: number | null;
  upi_amount: number | null;
  status: CafeOrderStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CafeOrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
  kot_status: KOTItemStatus;
  created_at: string;
}

export interface CafeKOTRow {
  id: string;
  order_id: string;
  location_id: string;
  kot_number: string;
  status: KOTStatus;
  items: KOTItem[];
  created_by: string | null;
  created_at: string;
  acknowledged_at: string | null;
  ready_at: string | null;
  served_at: string | null;
}

export interface CafeSettlementRow {
  id: string;
  location_id: string;
  partner_id: string;
  settlement_date: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  gross_revenue: number;
  total_discount: number;
  net_revenue: number;
  partner_payout: number;
  cuephoria_revenue: number;
  status: SettlementStatus;
  notes: string | null;
  confirmed_by: string | null;
  created_at: string;
}

// Transform helpers
export function transformPartnerRow(row: CafePartnerRow): CafePartner {
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    contactName: row.contact_name ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    partnerRate: Number(row.partner_rate),
    cuephoriaRate: Number(row.cuephoria_rate),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function transformMenuCategoryRow(row: CafeMenuCategoryRow): CafeMenuCategory {
  return {
    id: row.id,
    locationId: row.location_id,
    partnerId: row.partner_id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}

export function transformMenuItemRow(row: CafeMenuItemRow): CafeMenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    locationId: row.location_id,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.price),
    costPrice: row.cost_price != null ? Number(row.cost_price) : undefined,
    imageUrl: row.image_url ?? undefined,
    isVeg: row.is_veg,
    isAvailable: row.is_available,
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function transformTableRow(row: CafeTableRow): CafeTable {
  return {
    id: row.id,
    locationId: row.location_id,
    partnerId: row.partner_id,
    tableName: row.table_name,
    zone: row.zone,
    capacity: row.capacity,
    isAvailable: row.is_available,
    isOccupied: row.is_occupied,
    currentOrderId: row.current_order_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function transformOrderRow(row: CafeOrderRow): CafeOrder {
  return {
    id: row.id,
    locationId: row.location_id,
    partnerId: row.partner_id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    orderSource: row.order_source,
    cafeTableId: row.cafe_table_id,
    stationId: row.station_id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),
    partnerRateSnapshot: Number(row.partner_rate_snapshot),
    cuephoriaRateSnapshot: Number(row.cuephoria_rate_snapshot),
    partnerShare: Number(row.partner_share),
    cuephoriaShare: Number(row.cuephoria_share),
    paymentMethod: row.payment_method,
    cashAmount: row.cash_amount != null ? Number(row.cash_amount) : undefined,
    upiAmount: row.upi_amount != null ? Number(row.upi_amount) : undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

export function transformOrderItemRow(row: CafeOrderItemRow): CafeOrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    menuItemId: row.menu_item_id ?? undefined,
    itemName: row.item_name,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    notes: row.notes ?? undefined,
    kotStatus: row.kot_status,
    createdAt: new Date(row.created_at),
  };
}

export function transformKOTRow(row: CafeKOTRow): CafeKOT {
  return {
    id: row.id,
    orderId: row.order_id,
    locationId: row.location_id,
    kotNumber: row.kot_number,
    status: row.status,
    items: row.items || [],
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : null,
    readyAt: row.ready_at ? new Date(row.ready_at) : null,
    servedAt: row.served_at ? new Date(row.served_at) : null,
  };
}

export function transformSettlementRow(row: CafeSettlementRow): CafeSettlement {
  return {
    id: row.id,
    locationId: row.location_id,
    partnerId: row.partner_id,
    settlementDate: row.settlement_date,
    periodStart: new Date(row.period_start),
    periodEnd: new Date(row.period_end),
    totalOrders: row.total_orders,
    grossRevenue: Number(row.gross_revenue),
    totalDiscount: Number(row.total_discount),
    netRevenue: Number(row.net_revenue),
    partnerPayout: Number(row.partner_payout),
    cuephoriaRevenue: Number(row.cuephoria_revenue),
    status: row.status,
    notes: row.notes ?? undefined,
    confirmedBy: row.confirmed_by,
    createdAt: new Date(row.created_at),
  };
}

export function transformCafeUserRow(row: CafeUserRow): CafeUser {
  return {
    id: row.id,
    locationId: row.location_id,
    partnerId: row.partner_id,
    username: row.username,
    displayName: row.display_name ?? undefined,
    role: row.role,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}
