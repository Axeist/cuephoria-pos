
-- Allow read access for all users (already exists but ensuring it's there)
DROP POLICY IF EXISTS "Allow read access for offers" ON public.offers;
CREATE POLICY "Allow read access for offers" 
ON public.offers FOR SELECT USING (true);

-- Allow full access for authenticated users (this is missing and causing the insert failures)
DROP POLICY IF EXISTS "Allow full access for authenticated users on offers" ON public.offers;
CREATE POLICY "Allow full access for authenticated users on offers" 
ON public.offers FOR ALL USING (true);
