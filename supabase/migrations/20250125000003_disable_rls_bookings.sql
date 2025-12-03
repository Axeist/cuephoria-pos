-- Disable Row Level Security on bookings and booking_views tables
-- This removes RLS restrictions to allow unrestricted access

-- Drop all existing policies on bookings table
DROP POLICY IF EXISTS "Allow all operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow public booking creation" ON public.bookings;

-- Drop all existing policies on booking_views table
DROP POLICY IF EXISTS "Allow anyone to view booking views" ON public.booking_views;
DROP POLICY IF EXISTS "Allow public booking views access" ON public.booking_views;

-- Disable Row Level Security on bookings table
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Disable Row Level Security on booking_views table
ALTER TABLE public.booking_views DISABLE ROW LEVEL SECURITY;




