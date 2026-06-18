
-- Create offers table to store marketing offers
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_item')) DEFAULT 'percentage',
  discount_value NUMERIC,
  validity_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  target_audience TEXT CHECK (target_audience IN ('all', 'members', 'non_members', 'new_customers', 'vip')) DEFAULT 'all',
  min_spend NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert some sample offers
INSERT INTO public.offers (title, description, discount_type, discount_value, target_audience) VALUES
('Welcome Offer', 'Get 20% off on your next gaming session!', 'percentage', 20, 'new_customers'),
('Member Special', 'Enjoy a complimentary snack with your next visit!', 'free_item', 0, 'members'),
('Gaming Bonus', 'Free extra 30 minutes on your favorite game!', 'free_item', 0, 'all'),
('VIP Discount', 'Special member discount - 15% off food & drinks!', 'percentage', 15, 'members'),
('Friend Referral', 'Bring a friend and get 2-for-1 gaming hours!', 'bogo', 0, 'all'),
('Weekend Special', 'Get ₹100 off on bills above ₹500', 'fixed', 100, 'all'),
('Student Discount', 'Show your student ID and get 25% off gaming!', 'percentage', 25, 'all'),
('Loyalty Reward', 'Spend your loyalty points and get extra 10% off!', 'percentage', 10, 'members'),
('Birthday Special', 'Celebrate with us - 30% off on your birthday month!', 'percentage', 30, 'all'),
('Tournament Winner', 'Previous tournament winners get 50% off practice sessions!', 'percentage', 50, 'all');

-- Add RLS policies for offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Allow read access for all users
CREATE POLICY "Allow read access for offers" 
ON public.offers FOR SELECT USING (true);

-- Allow full access for authenticated users (admin functionality)
CREATE POLICY "Allow full access for authenticated users on offers" 
ON public.offers FOR ALL USING (auth.role() = 'authenticated');
