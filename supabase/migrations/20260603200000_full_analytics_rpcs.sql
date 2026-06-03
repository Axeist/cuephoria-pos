-- Full server-side analytics: replaces client-side full bill/bill_items scans.

-- Payment breakdown (cash, UPI, credit, razorpay, split)
CREATE OR REPLACE FUNCTION public.get_payment_breakdown_stats(
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
  WITH base AS (
    SELECT *
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  )
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(
      CASE
        WHEN COALESCE(is_split_payment, false) THEN COALESCE(cash_amount, 0) + COALESCE(upi_amount, 0)
        ELSE total
      END
    ), 0),
    'total_transactions', COUNT(*)::int,
    'cash_total', COALESCE(SUM(
      CASE
        WHEN COALESCE(is_split_payment, false) THEN COALESCE(cash_amount, 0)
        WHEN lower(COALESCE(payment_method, '')) = 'cash' THEN total
        ELSE 0
      END
    ), 0),
    'upi_total', COALESCE(SUM(
      CASE
        WHEN COALESCE(is_split_payment, false) THEN COALESCE(upi_amount, 0)
        WHEN lower(COALESCE(payment_method, '')) = 'upi' THEN total
        ELSE 0
      END
    ), 0),
    'credit_total', COALESCE(SUM(total) FILTER (
      WHERE NOT COALESCE(is_split_payment, false)
        AND lower(COALESCE(payment_method, '')) = 'credit'
    ), 0),
    'razorpay_total', COALESCE(SUM(total) FILTER (
      WHERE NOT COALESCE(is_split_payment, false)
        AND lower(COALESCE(payment_method, '')) = 'razorpay'
    ), 0),
    'cash_only_count', COUNT(*) FILTER (
      WHERE NOT COALESCE(is_split_payment, false)
        AND lower(COALESCE(payment_method, '')) = 'cash'
    )::int,
    'upi_only_count', COUNT(*) FILTER (
      WHERE NOT COALESCE(is_split_payment, false)
        AND lower(COALESCE(payment_method, '')) = 'upi'
    )::int,
    'credit_only_count', COUNT(*) FILTER (
      WHERE NOT COALESCE(is_split_payment, false)
        AND lower(COALESCE(payment_method, '')) = 'credit'
    )::int,
    'razorpay_only_count', COUNT(*) FILTER (
      WHERE NOT COALESCE(is_split_payment, false)
        AND lower(COALESCE(payment_method, '')) = 'razorpay'
    )::int,
    'split_count', COUNT(*) FILTER (WHERE COALESCE(is_split_payment, false))::int,
    'split_cash_total', COALESCE(SUM(COALESCE(cash_amount, 0)) FILTER (
      WHERE COALESCE(is_split_payment, false)
    ), 0),
    'split_upi_total', COALESCE(SUM(COALESCE(upi_amount, 0)) FILTER (
      WHERE COALESCE(is_split_payment, false)
    ), 0)
  )
  FROM base;
$$;

-- Top customers by spend or visit count
CREATE OR REPLACE FUNCTION public.get_top_customers(
  p_location_id uuid,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_limit int DEFAULT 12,
  p_sort_by text DEFAULT 'spend'
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
        'customer_id', t.customer_id,
        'name', COALESCE(c.name, 'Unknown'),
        'total_spent', t.total_spent,
        'bill_count', t.bill_count,
        'avg_bill', CASE WHEN t.bill_count > 0 THEN t.total_spent / t.bill_count ELSE 0 END
      )
      ORDER BY
        CASE WHEN p_sort_by = 'count' THEN t.bill_count ELSE 0 END DESC,
        CASE WHEN p_sort_by <> 'count' THEN t.total_spent ELSE 0 END DESC
    ),
    '[]'::json
  )
  FROM (
    SELECT
      b.customer_id,
      SUM(b.total) AS total_spent,
      COUNT(*)::int AS bill_count
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND b.customer_id IS NOT NULL
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
    GROUP BY b.customer_id
    ORDER BY
      CASE WHEN p_sort_by = 'count' THEN COUNT(*) ELSE 0 END DESC,
      CASE WHEN p_sort_by <> 'count' THEN SUM(b.total) ELSE 0 END DESC
    LIMIT GREATEST(p_limit, 1)
  ) t
  LEFT JOIN public.customers c ON c.id = t.customer_id;
$$;

-- Gaming + canteen revenue from bill_items
CREATE OR REPLACE FUNCTION public.get_gaming_revenue_breakdown(
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
  WITH items AS (
    SELECT
      bi.*,
      b.total AS bill_total,
      b.subtotal AS bill_subtotal,
      CASE WHEN COALESCE(b.subtotal, 0) > 0 THEN b.total / b.subtotal ELSE 1 END AS discount_ratio,
      lower(COALESCE(p.category, '')) AS product_category,
      lower(COALESCE(bi.name, '')) AS item_name_lower
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    LEFT JOIN public.products p ON p.id = bi.item_id AND bi.item_type = 'product'
    WHERE b.location_id = p_location_id
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  )
  SELECT json_build_object(
    'ps5_gaming', COALESCE(SUM(bi.total * bi.discount_ratio) FILTER (
      WHERE bi.item_type = 'session'
        AND (bi.item_name_lower LIKE '%ps5%' OR bi.item_name_lower LIKE '%playstation%')
    ), 0),
    'eight_ball_pool', COALESCE(SUM(bi.total * bi.discount_ratio) FILTER (
      WHERE bi.item_type = 'session'
        AND (
          bi.item_name_lower LIKE '%pool%'
          OR bi.item_name_lower LIKE '%8-ball%'
          OR bi.item_name_lower LIKE '%8 ball%'
        )
    ), 0),
    'challenges_revenue', COALESCE(SUM(bi.total * bi.discount_ratio) FILTER (
      WHERE bi.item_type = 'product'
        AND (
          bi.product_category IN ('challenges', 'challenge')
          OR bi.item_name_lower LIKE '%ps5 joystick%'
          OR bi.item_name_lower LIKE '%8 ball pool%'
          OR bi.item_name_lower LIKE '%8-ball pool%'
        )
    ), 0),
    'canteen_sales', COALESCE(SUM(bi.total * bi.discount_ratio) FILTER (
      WHERE bi.item_type = 'product'
        AND bi.product_category IN (
          'food', 'foods', 'drinks', 'drink', 'snacks',
          'beverage', 'beverages', 'tobacco'
        )
        AND bi.product_category NOT IN ('challenges', 'challenge')
    ), 0)
  )
  FROM items bi;
$$;

-- Canteen product sales + profit (food/drinks only, no tobacco/challenges)
CREATE OR REPLACE FUNCTION public.get_canteen_product_sales(
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
  WITH items AS (
    SELECT
      bi.name,
      bi.quantity,
      bi.total,
      lower(COALESCE(p.category, '')) AS product_category,
      COALESCE(
        p.profit,
        COALESCE(p.selling_price, p.price, 0) - COALESCE(p.buying_price, 0),
        0
      ) AS profit_per_unit
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    LEFT JOIN public.products p ON p.id = bi.item_id
    WHERE b.location_id = p_location_id
      AND bi.item_type = 'product'
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  ),
  canteen AS (
    SELECT *
    FROM items
    WHERE product_category IN (
      'food', 'foods', 'drinks', 'drink', 'snacks', 'beverage', 'beverages'
    )
      AND product_category NOT IN ('challenges', 'challenge', 'tobacco')
  ),
  by_product AS (
    SELECT
      name,
      SUM(total) AS sales,
      SUM(quantity)::int AS quantity,
      SUM(profit_per_unit * quantity) AS profit
    FROM canteen
    GROUP BY name
    ORDER BY SUM(total) DESC
  )
  SELECT json_build_object(
    'total_sales', COALESCE((SELECT SUM(sales) FROM by_product), 0),
    'total_profit', COALESCE((SELECT SUM(profit) FROM by_product), 0),
    'products', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'name', name,
          'sales', sales,
          'quantity', quantity,
          'profit', profit
        )
        ORDER BY sales DESC
      ) FROM by_product),
      '[]'::json
    )
  );
$$;

-- Hourly revenue: weekday vs weekend
CREATE OR REPLACE FUNCTION public.get_hourly_revenue_distribution(
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
        'hour', h.hour,
        'weekday', COALESCE(a.weekday, 0),
        'weekend', COALESCE(a.weekend, 0)
      )
      ORDER BY h.hour
    ),
    '[]'::json
  )
  FROM generate_series(0, 23) AS h(hour)
  LEFT JOIN (
    SELECT
      EXTRACT(HOUR FROM b.created_at AT TIME ZONE 'UTC')::int AS hour,
      SUM(b.total) FILTER (
        WHERE EXTRACT(DOW FROM b.created_at AT TIME ZONE 'UTC') NOT IN (0, 6)
      ) AS weekday,
      SUM(b.total) FILTER (
        WHERE EXTRACT(DOW FROM b.created_at AT TIME ZONE 'UTC') IN (0, 6)
      ) AS weekend
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND b.created_at >= (now() - make_interval(days => GREATEST(p_days, 1)))
    GROUP BY 1
  ) a ON a.hour = h.hour;
$$;

-- Top products by revenue
CREATE OR REPLACE FUNCTION public.get_product_performance(
  p_location_id uuid,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
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
        'name', t.name,
        'sales', t.sales,
        'count', t.qty,
        'category', t.category
      )
      ORDER BY t.sales DESC
    ),
    '[]'::json
  )
  FROM (
    SELECT
      bi.name,
      SUM(bi.total) AS sales,
      SUM(bi.quantity)::int AS qty,
      COALESCE(MAX(p.category), 'unknown') AS category
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    LEFT JOIN public.products p ON p.id = bi.item_id
    WHERE b.location_id = p_location_id
      AND bi.item_type = 'product'
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
    GROUP BY bi.name
    ORDER BY SUM(bi.total) DESC
    LIMIT GREATEST(p_limit, 1)
  ) t;
$$;

-- Reports / summary bill aggregates (no bill_items download)
CREATE OR REPLACE FUNCTION public.get_bill_aggregate_metrics(
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
  WITH paid AS (
    SELECT *
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  ),
  comp AS (
    SELECT *
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND lower(COALESCE(b.payment_method, '')) = 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  ),
  daily AS (
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS day,
      SUM(total) AS revenue
    FROM paid
    GROUP BY 1
  ),
  top_cust AS (
    SELECT customer_id, SUM(total) AS spend
    FROM paid
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
    ORDER BY SUM(total) DESC
    LIMIT 1
  ),
  loyalty AS (
    SELECT
      COALESCE(SUM(loyalty_points_used), 0) AS points_used,
      COALESCE(SUM(loyalty_points_earned), 0) AS points_earned
    FROM public.bills b
    WHERE b.location_id = p_location_id
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  ),
  gaming AS (
    SELECT public.get_gaming_revenue_breakdown(p_location_id, p_start, p_end) AS data
  ),
  payment AS (
    SELECT public.get_payment_breakdown_stats(p_location_id, p_start, p_end) AS data
  ),
  units AS (
    SELECT COALESCE(SUM(bi.quantity), 0)::int AS total_units
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    WHERE b.location_id = p_location_id
      AND bi.item_type = 'product'
      AND lower(COALESCE(b.payment_method, '')) <> 'complimentary'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
  ),
  popular AS (
    SELECT bi.item_id, SUM(bi.quantity) AS freq
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    WHERE b.location_id = p_location_id
      AND bi.item_type = 'product'
      AND (p_start IS NULL OR b.created_at >= p_start)
      AND (p_end IS NULL OR b.created_at <= p_end)
    GROUP BY bi.item_id
    ORDER BY SUM(bi.quantity) DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'total_revenue', COALESCE((SELECT SUM(total) FROM paid), 0),
    'transaction_count', (SELECT COUNT(*)::int FROM paid),
    'all_transaction_count', (
      SELECT COUNT(*)::int FROM public.bills b
      WHERE b.location_id = p_location_id
        AND (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    ),
    'average_bill_value', COALESCE((SELECT AVG(total) FROM paid), 0),
    'total_discounts', COALESCE((
      SELECT SUM(discount_value) FROM public.bills b
      WHERE b.location_id = p_location_id
        AND (p_start IS NULL OR b.created_at >= p_start)
        AND (p_end IS NULL OR b.created_at <= p_end)
    ), 0),
    'cash_sales', COALESCE((SELECT (data->>'cash_total')::numeric FROM payment), 0),
    'upi_sales', COALESCE((SELECT (data->>'upi_total')::numeric FROM payment), 0),
    'credit_sales', COALESCE((SELECT (data->>'credit_total')::numeric FROM payment), 0),
    'razorpay_sales', COALESCE((SELECT (data->>'razorpay_total')::numeric FROM payment), 0),
    'split_cash', COALESCE((SELECT (data->>'split_cash_total')::numeric FROM payment), 0),
    'split_upi', COALESCE((SELECT (data->>'split_upi_total')::numeric FROM payment), 0),
    'complimentary_sales', COALESCE((SELECT SUM(total) FROM comp), 0),
    'complimentary_count', (SELECT COUNT(*)::int FROM comp),
    'highest_revenue_day', (SELECT to_char(day, 'YYYY-MM-DD') FROM daily ORDER BY revenue DESC LIMIT 1),
    'highest_revenue', COALESCE((SELECT MAX(revenue) FROM daily), 0),
    'loyalty_points_used', (SELECT points_used FROM loyalty),
    'loyalty_points_earned', (SELECT points_earned FROM loyalty),
    'top_customer_id', (SELECT customer_id FROM top_cust),
    'top_customer_spend', COALESCE((SELECT spend FROM top_cust), 0),
    'returning_customer_count', (
      SELECT COUNT(*)::int FROM (
        SELECT customer_id FROM paid WHERE customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(*) > 1
      ) r
    ),
    'total_units_sold', (SELECT total_units FROM units),
    'most_popular_product_id', (SELECT item_id FROM popular),
    'gaming', (SELECT data FROM gaming)
  );
$$;

-- Extend daily series with optional date bounds
CREATE OR REPLACE FUNCTION public.get_daily_revenue_series(
  p_location_id uuid,
  p_days int DEFAULT 365,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
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
      AND (
        (p_start IS NOT NULL AND b.created_at >= p_start AND (p_end IS NULL OR b.created_at <= p_end))
        OR (p_start IS NULL AND b.created_at >= (now() - make_interval(days => GREATEST(p_days, 1))))
      )
    GROUP BY 1
  ) d;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_breakdown_stats(uuid, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_customers(uuid, timestamptz, timestamptz, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_gaming_revenue_breakdown(uuid, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_canteen_product_sales(uuid, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_revenue_distribution(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_performance(uuid, timestamptz, timestamptz, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bill_aggregate_metrics(uuid, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_revenue_series(uuid, int, timestamptz, timestamptz) TO anon, authenticated;
