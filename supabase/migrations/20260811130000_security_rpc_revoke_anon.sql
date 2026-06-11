-- Revoke sensitive RPC EXECUTE from anon (browser publishable key).
-- Admin SPA uses /api/admin/analytics and /api/admin/station-migrate proxies.
-- Rollback: re-GRANT EXECUTE ... TO anon for each function below.

REVOKE EXECUTE ON FUNCTION public.get_payment_breakdown_stats(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_customers(uuid, timestamptz, timestamptz, int, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_gaming_revenue_breakdown(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_canteen_product_sales(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_hourly_revenue_distribution(uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_product_performance(uuid, timestamptz, timestamptz, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bill_aggregate_metrics(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_revenue_series(uuid, int, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_revenue_series(uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_business_summary_stats(
  uuid, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cafe_revenue_stats(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.migrate_station_data(UUID[], UUID, TEXT) FROM anon;
