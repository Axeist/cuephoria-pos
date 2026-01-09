-- =====================================================
-- CUSTOMER AUTHENTICATION & OFFERS SYSTEM
-- Created: 2026-01-09
-- =====================================================

-- =====================================================
-- SECTION 1: ADD AUTHENTICATION TO CUSTOMERS TABLE
-- =====================================================

-- Add password and auth fields to existing customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster phone/password lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone_auth ON public.customers(phone, password_hash);
CREATE INDEX IF NOT EXISTS idx_customers_last_login ON public.customers(last_login_at);

-- =====================================================
-- SECTION 2: CUSTOMER OFFERS TABLE
-- =====================================================

-- New customer offers table (separate from existing offers)
CREATE TABLE IF NOT EXISTS public.customer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Offer Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  offer_code TEXT UNIQUE,
  
  -- Offer Type
  offer_type TEXT CHECK (offer_type IN (
    'percentage_discount',
    'flat_discount',
    'free_hours',
    'loyalty_bonus',
    'birthday_special',
    'referral_reward',
    'first_booking',
    'combo_deal'
  )) NOT NULL DEFAULT 'percentage_discount',
  
  -- Discount Details
  discount_value NUMERIC DEFAULT 0,
  free_hours INTEGER DEFAULT 0,
  loyalty_points_multiplier NUMERIC DEFAULT 1.0,
  
  -- Eligibility Criteria
  target_customer_type TEXT CHECK (target_customer_type IN (
    'all',
    'new_customers',
    'members',
    'non_members',
    'birthday_month',
    'high_spenders',
    'frequent_users',
    'inactive_users'
  )) DEFAULT 'all',
  
  -- Usage Restrictions
  min_booking_amount NUMERIC DEFAULT 0,
  min_hours INTEGER DEFAULT 1,
  applicable_station_types TEXT[],
  applicable_days TEXT[],
  applicable_time_slots TEXT[],
  
  -- Limits
  max_redemptions_per_customer INTEGER DEFAULT 1,
  total_redemption_limit INTEGER,
  current_redemption_count INTEGER DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Display
  banner_image_url TEXT,
  priority INTEGER DEFAULT 0,
  terms_and_conditions TEXT,
  
  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Auto-assignment
  auto_assign_to_eligible BOOLEAN DEFAULT true,
  send_push_notification BOOLEAN DEFAULT false,
  
  -- Stats
  views_count INTEGER DEFAULT 0,
  redemptions_count INTEGER DEFAULT 0
);

-- Indexes for customer_offers
CREATE INDEX IF NOT EXISTS idx_customer_offers_active ON public.customer_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_offers_valid ON public.customer_offers(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_customer_offers_type ON public.customer_offers(target_customer_type);
CREATE INDEX IF NOT EXISTS idx_customer_offers_code ON public.customer_offers(offer_code);
CREATE INDEX IF NOT EXISTS idx_customer_offers_priority ON public.customer_offers(priority DESC);

-- =====================================================
-- SECTION 3: CUSTOMER OFFER ASSIGNMENTS TABLE
-- =====================================================

-- Track which customers have which offers
CREATE TABLE IF NOT EXISTS public.customer_offer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.customer_offers(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT CHECK (status IN (
    'assigned',
    'viewed',
    'applied',
    'redeemed',
    'expired',
    'cancelled'
  )) DEFAULT 'assigned',
  
  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  
  -- Redemption details
  booking_id UUID REFERENCES public.bookings(id),
  discount_given NUMERIC DEFAULT 0,
  loyalty_points_awarded INTEGER DEFAULT 0,
  
  -- Metadata
  assignment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure customer doesn't get same offer multiple times (configurable per offer)
  UNIQUE(customer_id, offer_id)
);

-- Indexes for customer_offer_assignments
CREATE INDEX IF NOT EXISTS idx_customer_offer_assignments_customer ON public.customer_offer_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_offer_assignments_offer ON public.customer_offer_assignments(offer_id);
CREATE INDEX IF NOT EXISTS idx_customer_offer_assignments_status ON public.customer_offer_assignments(status);
CREATE INDEX IF NOT EXISTS idx_customer_offer_assignments_booking ON public.customer_offer_assignments(booking_id);

-- =====================================================
-- SECTION 4: RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.customer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_offer_assignments ENABLE ROW LEVEL SECURITY;

-- Customer Offers Policies
CREATE POLICY "Anyone can view active offers"
ON public.customer_offers FOR SELECT
USING (is_active = true AND valid_from <= now() AND (valid_until IS NULL OR valid_until >= now()));

CREATE POLICY "Admin full access on customer_offers"
ON public.customer_offers FOR ALL
USING (true);

-- Customer Offer Assignments Policies
CREATE POLICY "Customers view own assignments"
ON public.customer_offer_assignments FOR SELECT
USING (customer_id IN (SELECT id FROM public.customers WHERE phone = current_setting('app.current_customer_phone', true)));

CREATE POLICY "Customers update own assignments"
ON public.customer_offer_assignments FOR UPDATE
USING (customer_id IN (SELECT id FROM public.customers WHERE phone = current_setting('app.current_customer_phone', true)));

CREATE POLICY "Admin full access on assignments"
ON public.customer_offer_assignments FOR ALL
USING (true);

-- =====================================================
-- SECTION 5: HELPER FUNCTIONS
-- =====================================================

-- Function to auto-assign offers to eligible customers
CREATE OR REPLACE FUNCTION assign_offer_to_eligible_customers(offer_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  offer_record RECORD;
  customer_record RECORD;
  assigned_count INTEGER := 0;
BEGIN
  -- Get offer details
  SELECT * INTO offer_record FROM customer_offers WHERE id = offer_id_param;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Only proceed if auto_assign is enabled
  IF NOT offer_record.auto_assign_to_eligible THEN
    RETURN 0;
  END IF;
  
  -- Find eligible customers based on target_customer_type
  FOR customer_record IN
    SELECT id FROM customers
    WHERE 
      CASE offer_record.target_customer_type
        WHEN 'all' THEN true
        WHEN 'members' THEN is_member = true
        WHEN 'non_members' THEN is_member = false
        WHEN 'new_customers' THEN created_at >= (now() - INTERVAL '30 days')
        WHEN 'birthday_month' THEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM now())
        WHEN 'high_spenders' THEN total_spent > 5000
        WHEN 'frequent_users' THEN total_play_time > 50
        WHEN 'inactive_users' THEN last_login_at < (now() - INTERVAL '30 days') OR last_login_at IS NULL
        ELSE false
      END
  LOOP
    -- Try to assign (will fail silently if already assigned due to UNIQUE constraint)
    BEGIN
      INSERT INTO customer_offer_assignments (
        customer_id,
        offer_id,
        status,
        assignment_reason,
        expired_at
      ) VALUES (
        customer_record.id,
        offer_id_param,
        'assigned',
        'Auto-assigned based on eligibility: ' || offer_record.target_customer_type,
        offer_record.valid_until
      );
      assigned_count := assigned_count + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Customer already has this offer, skip
      CONTINUE;
    END;
  END LOOP;
  
  RETURN assigned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update offer statistics
CREATE OR REPLACE FUNCTION update_offer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'viewed' AND OLD.status != 'viewed' THEN
      UPDATE customer_offers SET views_count = views_count + 1 WHERE id = NEW.offer_id;
    END IF;
    
    IF NEW.status = 'redeemed' AND OLD.status != 'redeemed' THEN
      UPDATE customer_offers 
      SET redemptions_count = redemptions_count + 1,
          current_redemption_count = current_redemption_count + 1
      WHERE id = NEW.offer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for offer stats
DROP TRIGGER IF EXISTS trigger_update_offer_stats ON customer_offer_assignments;
CREATE TRIGGER trigger_update_offer_stats
AFTER UPDATE ON customer_offer_assignments
FOR EACH ROW
EXECUTE FUNCTION update_offer_stats();

-- =====================================================
-- SECTION 6: COMMENTS
-- =====================================================

COMMENT ON TABLE public.customer_offers IS 'Customer-specific offers managed by admin';
COMMENT ON TABLE public.customer_offer_assignments IS 'Tracks which customers have which offers';
COMMENT ON COLUMN public.customers.password_hash IS 'Bcrypt hashed password for customer login';
COMMENT ON COLUMN public.customers.is_first_login IS 'True if customer needs to change password on first login';
COMMENT ON FUNCTION assign_offer_to_eligible_customers IS 'Auto-assigns offer to eligible customers based on target criteria';
