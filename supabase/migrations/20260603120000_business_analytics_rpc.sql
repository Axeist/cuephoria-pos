-- Fast business summary + daily revenue series for dashboard / AI insights.
-- Aggregates in Postgres instead of downloading every bill + bill_items to the browser.

CREATE OR REPLACE FUNCTION public.get_business_summary_stats(
  p_location_id uuid,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_today_start timestamptz DEFAULT NULL,
  p_today_end timestamptz DEFAULT NULL,
  p_yesterday_start timestamptz DEFAULT NULL,
  p_yesterday_end timestamptz DEFAULT NULL,
  p_month_start timestamptz DEFAULT NULL,
  p_month_end timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'gross_income', COALESCE(SUM(b.total) FILTER (
      WHERE (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    ), 0),
    'transaction_count', COUNT(*) FILTER (
      WHERE (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    )::int,
    'avg_bill_value', COALESCE(AVG(b.total) FILTER (
      WHERE (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    ), 0),
    'today_sales', COALESCE(SUM(b.total) FILTER (
      WHERE p_today_start IS NOT NULL
        AND p_today_end IS NOT NULL
        AND b.created_at >= p_today_start
        AND b.created_at <= p_today_end
    ), 0),
    'yesterday_sales', COALESCE(SUM(b.total) FILTER (
      WHERE p_yesterday_start IS NOT NULL
        AND p_yesterday_end IS NOT NULL
        AND b.created_at >= p_yesterday_start
        AND b.created_at <= p_yesterday_end
    ), 0),
    'current_month_sales', COALESCE(SUM(b.total) FILTER (
      WHERE p_month_start IS NOT NULL
        AND p_month_end IS NOT NULL
        AND b.created_at >= p_month_start
        AND b.created_at <= p_month_end
    ), 0),
    'cash_total', COALESCE(SUM(b.total) FILTER (
      WHERE lower(COALESCE(b.payment_method, '')) = 'cash'
        AND (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    ), 0),
    'upi_total', COALESCE(SUM(b.total) FILTER (
      WHERE lower(COALESCE(b.payment_method, '')) = 'upi'
        AND (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    ), 0)
  )
  FROM public.bills b
  WHERE b.location_id = p_location_id
    AND lower(COALESCE(b.payment_method, '')) <> 'complimentary';
$$;

CREATE OR REPLACE FUNCTION public.get_daily_revenue_series(
  p_location_id uuid,
  p_days int DEFAULT 365
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'revenue', d.revenue,
        'txn_count', d.txn_count,
        'customer_count', d.customer_count
      )
      ORDER BY d.day
    ),
    '[]'::json
  )
  FROM (
    SELECT
      (b.created_at AT TIME ZONE 'UTC')::date AS day,
      SUM(b.total) AS revenue,
      COUNT(*)::int AS txn_count,
      COUNT(DISTINCT b.customer_id)::int AS customer_count
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND b.created_at >= (now() - make_interval(days => GREATEST(p_days, 1)))
    GROUP BY 1
  ) d;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_summary_stats(
  uuid, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_daily_revenue_series(uuid, int) TO anon, authenticated;
