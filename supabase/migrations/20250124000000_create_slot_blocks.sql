-- =====================================================
-- SLOT BLOCKS TABLE
-- Prevents duplicate bookings by temporarily reserving slots
-- Similar to RedBus/BookMyShow slot blocking mechanism
-- =====================================================

-- Create slot_blocks table
CREATE TABLE IF NOT EXISTS public.slot_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  session_id TEXT, -- Optional: client session identifier
  customer_phone TEXT, -- Optional: customer phone for tracking
  is_confirmed BOOLEAN DEFAULT false, -- Set to true when booking is confirmed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique blocks per station/date/time combination
  CONSTRAINT unique_slot_block UNIQUE (station_id, booking_date, start_time, end_time)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_slot_blocks_station_date ON public.slot_blocks(station_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_slot_blocks_expires_at ON public.slot_blocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_slot_blocks_confirmed ON public.slot_blocks(is_confirmed);

-- Function to clean up expired blocks
CREATE OR REPLACE FUNCTION public.cleanup_expired_slot_blocks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete expired blocks that haven't been confirmed
  DELETE FROM public.slot_blocks
  WHERE expires_at < now()
  AND is_confirmed = false;
END;
$$;

-- Function to check if a slot is blocked
CREATE OR REPLACE FUNCTION public.is_slot_blocked(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  block_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.slot_blocks
    WHERE station_id = p_station_id
      AND booking_date = p_booking_date
      AND start_time = p_start_time
      AND end_time = p_end_time
      AND expires_at > now()
      AND is_confirmed = false
      AND (p_exclude_session_id IS NULL OR session_id != p_exclude_session_id)
  ) INTO block_exists;
  
  RETURN block_exists;
END;
$$;

-- Function to create a slot block
CREATE OR REPLACE FUNCTION public.create_slot_block(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_block_duration_minutes INTEGER DEFAULT 5,
  p_session_id TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  block_id UUID;
  expires_at_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration time
  expires_at_ts := now() + (p_block_duration_minutes || ' minutes')::interval;
  
  -- Try to insert the block
  INSERT INTO public.slot_blocks (
    station_id,
    booking_date,
    start_time,
    end_time,
    expires_at,
    session_id,
    customer_phone
  )
  VALUES (
    p_station_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    expires_at_ts,
    p_session_id,
    p_customer_phone
  )
  ON CONFLICT (station_id, booking_date, start_time, end_time) 
  DO UPDATE SET
    blocked_at = now(),
    expires_at = expires_at_ts,
    session_id = COALESCE(EXCLUDED.session_id, slot_blocks.session_id),
    customer_phone = COALESCE(EXCLUDED.customer_phone, slot_blocks.customer_phone)
  RETURNING id INTO block_id;
  
  RETURN block_id;
END;
$$;

-- Function to confirm a slot block (mark as confirmed when booking is created)
CREATE OR REPLACE FUNCTION public.confirm_slot_block(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.slot_blocks
  SET is_confirmed = true
  WHERE station_id = p_station_id
    AND booking_date = p_booking_date
    AND start_time = p_start_time
    AND end_time = p_end_time
    AND expires_at > now()
    AND is_confirmed = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

-- Function to release a slot block
CREATE OR REPLACE FUNCTION public.release_slot_block(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.slot_blocks
  WHERE station_id = p_station_id
    AND booking_date = p_booking_date
    AND start_time = p_start_time
    AND end_time = p_end_time
    AND is_confirmed = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.slot_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (can be restricted later if needed)
CREATE POLICY "Allow all operations on slot_blocks"
ON public.slot_blocks
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.slot_blocks IS 'Temporary slot reservations to prevent duplicate bookings. Blocks expire after 5 minutes by default.';
COMMENT ON COLUMN public.slot_blocks.expires_at IS 'Timestamp when the block expires. Default is 5 minutes from creation.';
COMMENT ON COLUMN public.slot_blocks.is_confirmed IS 'Set to true when the booking is confirmed. Confirmed blocks are not automatically deleted.';

