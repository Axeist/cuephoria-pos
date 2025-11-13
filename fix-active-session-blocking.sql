-- Fix get_available_slots function to only block slots that overlap with active sessions
-- Currently it blocks ALL slots if there's any active session - this fixes it to only block overlapping slots

CREATE OR REPLACE FUNCTION public.get_available_slots(p_date date, p_station_id uuid, p_slot_duration integer DEFAULT 60)
RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_available boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
  opening_time TIME := '11:00:00';  -- 11 AM opening time
  closing_time TIME := '23:00:00';  -- 11 PM (last regular slot start)
  curr_time TIME;
  slot_end_time TIME;
BEGIN
  -- Generate time slots from opening to closing (including 11 PM - 12 AM slot)
  curr_time := opening_time;
  
  WHILE curr_time <= closing_time LOOP
    -- Calculate the end time for this slot
    slot_end_time := curr_time + (p_slot_duration || ' minutes')::interval;
    
    -- Handle midnight crossover: if slot_end_time wraps around (becomes less than curr_time), it's 00:00:00
    IF slot_end_time < curr_time THEN
      slot_end_time := '00:00:00';
    END IF;
    
    -- For the 11 PM slot, ensure end_time is 00:00:00 (midnight)
    IF curr_time = '23:00:00' THEN
      slot_end_time := '00:00:00';
    END IF;
    
    -- Check if this time slot overlaps with any existing booking
    -- Special handling for midnight crossover (end_time = 00:00:00)
    IF slot_end_time = '00:00:00' THEN
      -- For 23:00-00:00 slot, check for bookings that overlap
      is_available := NOT EXISTS (
        SELECT 1 
        FROM public.bookings b
        WHERE b.station_id = p_station_id 
          AND b.booking_date = p_date
          AND b.status IN ('confirmed', 'in-progress')
          AND (
            b.start_time = '23:00:00' OR
            (b.start_time < '23:00:00' AND (b.end_time > '23:00:00' OR b.end_time = '00:00:00'))
          )
      );
    ELSE
      is_available := NOT EXISTS (
        SELECT 1 
        FROM public.bookings b
        WHERE b.station_id = p_station_id 
          AND b.booking_date = p_date
          AND b.status IN ('confirmed', 'in-progress')
          AND (
            -- Check for time overlap using proper time comparison
            (b.start_time <= curr_time AND b.end_time > curr_time) OR
            (b.start_time < slot_end_time AND b.end_time >= slot_end_time) OR
            (b.start_time >= curr_time AND b.end_time <= slot_end_time)
          )
      );
    END IF;
    
    -- FIXED: Only block slots that the active session is CURRENTLY occupying
    -- Don't block all slots - only block the specific slot(s) that overlap with the running session
    IF p_date = CURRENT_DATE AND is_available THEN
      is_available := NOT EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.station_id = p_station_id
        AND s.end_time IS NULL
        AND DATE(s.start_time) = p_date
        AND (
          -- Only block if the session start time is within this slot's time range
          -- Example: If checking 14:00-15:00 slot and session started at 14:30, block it
          -- But if checking 13:00-14:00 slot and session started at 14:30, don't block it
          (s.start_time::time >= curr_time AND s.start_time::time < slot_end_time)
          OR
          -- Also block if session started before this slot and is still running (overlaps)
          (s.start_time::time < curr_time AND slot_end_time != '00:00:00')
          OR
          -- For midnight crossover slot
          (slot_end_time = '00:00:00' AND s.start_time::time >= '23:00:00')
        )
      );
    END IF;
    
    RETURN QUERY SELECT curr_time, slot_end_time, is_available;
    
    -- Exit after processing the 23:00 slot (which ends at 00:00:00)
    IF curr_time = '23:00:00' THEN
      EXIT;
    END IF;
    
    -- Move to next slot
    curr_time := curr_time + (p_slot_duration || ' minutes')::interval;
  END LOOP;
END;
$function$;

