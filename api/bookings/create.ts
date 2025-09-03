import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../src/integrations/supabase/client';
import { format } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    customerInfo,
    selectedStations,
    selectedDate,
    selectedSlot,
    appliedCoupons,
    discount,
    originalPrice,
    finalPrice
  } = req.body;

  try {
    let customerId = customerInfo.id;
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email || null,
          is_member: false,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0,
        })
        .select('id')
        .single();
      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    const couponCodes = appliedCoupons ? Object.values(appliedCoupons).join(',') : '';

    const rows = selectedStations.map((stationId: string) => ({
      station_id: stationId,
      customer_id: customerId,
      booking_date: selectedDate,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      duration: 60,
      status: 'confirmed',
      original_price: originalPrice,
      discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
      final_price: finalPrice,
      coupon_code: couponCodes || null,
      payment_mode: 'venue',
    }));

    const { data, error } = await supabase
      .from('bookings')
      .insert(rows)
      .select('id');
    
    if (error) throw error;

    res.status(200).json({ ok: true, bookingId: data[0].id });
  } catch (error) {
    console.error('Booking creation failed:', error);
    res.status(500).json({ ok: false, error: 'Booking creation failed' });
  }
}
