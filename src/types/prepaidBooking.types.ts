/** Online booking already paid — linked to an active station session. */
export interface PrepaidBookingLink {
  bookingId: string;
  paidAmount: number;
  originalPrice?: number | null;
  durationMinutes: number;
  slotStartTime: string;
  slotEndTime: string;
  paymentMode: string;
  couponCode?: string | null;
}

export interface StationBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  final_price: number | null;
  original_price: number | null;
  coupon_code: string | null;
  payment_mode: string | null;
  payment_txn_id: string | null;
  customer_id: string;
  station_id: string;
}
