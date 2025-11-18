-- Enable realtime replication for bookings table
-- This is required for postgres_changes subscriptions to work

-- Enable replication for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- If the above doesn't work, try this alternative:
-- ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Verify replication is enabled (run this to check):
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bookings';

