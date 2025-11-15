-- Create app_settings table for global application settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" 
ON public.app_settings FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow insert/update/delete for authenticated users (admins will be handled by application logic)
CREATE POLICY "Allow full access for authenticated users" 
ON public.app_settings FOR ALL 
USING (auth.role() = 'authenticated');

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
('business_info', '{"name": "Cuephoria Gaming Lounge", "address": "", "phone": "", "email": "", "gstin": ""}', 'Business information'),
('loyalty_points', '{"memberRate": 5, "nonMemberRate": 2, "pointsPerRupee": 100}', 'Loyalty points configuration'),
('tax_settings', '{"gstEnabled": false, "gstRate": 0, "serviceTaxEnabled": false, "serviceTaxRate": 0}', 'Tax configuration'),
('receipt_settings', '{"template": "standard", "showGST": false, "showTax": false, "showLoyaltyPoints": true, "footerMessage": "Thank you for visiting!"}', 'Receipt settings'),
('session_settings', '{"defaultTimeout": 60, "autoPauseEnabled": false, "pauseAfterMinutes": 0}', 'Session management settings'),
('inventory_settings', '{"lowStockThreshold": 5, "alertEnabled": true}', 'Inventory management settings'),
('payment_settings', '{"cashEnabled": true, "upiEnabled": true, "creditEnabled": true, "splitEnabled": true}', 'Payment method settings'),
('notification_settings', '{"lowStockAlerts": true, "sessionTimeouts": true, "dailyReports": false}', 'Notification preferences'),
('general_settings', '{"currency": "INR", "currencySymbol": "₹", "dateFormat": "DD/MM/YYYY", "timeFormat": "12h", "timezone": "Asia/Kolkata"}', 'General application settings')
ON CONFLICT (key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_app_settings_timestamp
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION update_app_settings_updated_at();

