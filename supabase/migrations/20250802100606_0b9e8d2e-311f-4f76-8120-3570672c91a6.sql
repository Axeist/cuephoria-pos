-- Fix the get_available_slots function to handle proper time slot generation
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
    
    -- Also check if there's an active session during this time for today
    IF p_date = CURRENT_DATE AND is_available THEN
      is_available := NOT EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.station_id = p_station_id
        AND s.end_time IS NULL
        AND DATE(s.start_time) = p_date
      );
    END IF;
    
    RETURN QUERY SELECT curr_time, slot_end_time, is_available;
    
    -- Move to next slot
    curr_time := curr_time + (p_slot_duration || ' minutes')::interval;
  END LOOP;
END;
$function$;

-- Fix the check_stations_availability function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.check_stations_availability(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_station_ids uuid[])
 RETURNS TABLE(station_id uuid, is_available boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Add proper logging
  RAISE NOTICE 'Checking availability for date: %, start: %, end: %, stations: %', 
    p_date, p_start_time, p_end_time, p_station_ids;

  -- Return a result set with station_id and availability status
  RETURN QUERY
  WITH booking_conflicts AS (
    SELECT 
      b.station_id
    FROM 
      public.bookings b
    WHERE 
      b.booking_date = p_date
      AND b.status IN ('confirmed', 'in-progress')
      AND b.station_id = ANY(p_station_ids)
      AND (
        -- Existing booking overlaps with requested time (all four cases):
        -- Case 1: Existing booking starts during the requested time
        (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
        -- Case 2: Existing booking ends during the requested time
        (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
        -- Case 3: Existing booking is contained within the requested time
        (b.start_time >= p_start_time AND b.end_time <= p_end_time) OR
        -- Case 4: Requested booking is contained within an existing booking
        (b.start_time <= p_start_time AND b.end_time >= p_end_time)
      )
  ),
  session_conflicts AS (
    SELECT 
      s.station_id
    FROM 
      public.sessions s
    WHERE 
      s.end_time IS NULL -- Active sessions
      AND DATE(s.start_time) = p_date
      AND s.station_id = ANY(p_station_ids)
  )
  SELECT 
    s.id AS station_id,
    NOT EXISTS (
      SELECT 1 FROM booking_conflicts bc WHERE bc.station_id = s.id
    ) AND NOT EXISTS (
      SELECT 1 FROM session_conflicts sc WHERE sc.station_id = s.id
    ) AS is_available
  FROM
    unnest(p_station_ids) AS s(id);
END;
$function$;