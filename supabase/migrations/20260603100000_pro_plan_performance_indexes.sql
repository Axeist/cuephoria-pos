-- Pro plan performance: composite indexes for location-scoped list/sort queries
-- and server-side aggregates to reduce egress and client-side processing.

-- Bills: dominant pattern is WHERE location_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_bills_location_created_at_desc
  ON public.bills (location_id, created_at DESC);

-- Customers: paginated fetch per location
CREATE INDEX IF NOT EXISTS idx_customers_location_created_at_desc
  ON public.customers (location_id, created_at DESC);

-- Sessions: recent sessions per location
CREATE INDEX IF NOT EXISTS idx_sessions_location_created_at_desc
  ON public.sessions (location_id, created_at DESC);

-- Products & stations: POS bootstrap lists
CREATE INDEX IF NOT EXISTS idx_products_location_created_at_desc
  ON public.products (location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stations_location_created_at_desc
  ON public.stations (location_id, created_at DESC);

-- Bookings admin list
CREATE INDEX IF NOT EXISTS idx_bookings_location_date_desc
  ON public.bookings (location_id, booking_date DESC, start_time DESC);

-- Expenses dashboard
CREATE INDEX IF NOT EXISTS idx_expenses_location_date_desc
  ON public.expenses (location_id, date DESC);

-- Cafe revenue widget: completed orders by location + date range
CREATE INDEX IF NOT EXISTS idx_cafe_orders_location_status_created
  ON public.cafe_orders (location_id, created_at DESC)
  WHERE status = 'completed';

-- Server-side cafe revenue aggregate (avoids pulling every order row to the client)
CREATE OR REPLACE FUNCTION public.get_cafe_revenue_stats(
  p_location_id uuid,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_orders', COUNT(*)::int,
    'gross_revenue', COALESCE(SUM(total), 0),
    'partner_share', COALESCE(SUM(partner_share), 0),
    'cuephoria_share', COALESCE(SUM(cuephoria_share), 0),
    'self_orders', COUNT(*) FILTER (WHERE order_source = 'customer')::int
  )
  FROM public.cafe_orders
  WHERE location_id = p_location_id
    AND status = 'completed'
    AND (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at <= p_end);
$$;

GRANT EXECUTE ON FUNCTION public.get_cafe_revenue_stats(uuid, timestamptz, timestamptz) TO anon, authenticated;
