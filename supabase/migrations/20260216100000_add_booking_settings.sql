-- Create booking_settings table for configurable booking options
CREATE TABLE IF NOT EXISTS booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access for booking settings
CREATE POLICY "booking_settings_public_read" ON booking_settings
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Only authenticated users can modify
CREATE POLICY "booking_settings_admin_write" ON booking_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default event name setting
INSERT INTO booking_settings (setting_key, setting_value, description)
VALUES (
  'event_name',
  '{"name": "IIM Event", "description": "Choose VR (15m) or PS5 Gaming (30m)"}',
  'Name and description for the special event booking category'
) ON CONFLICT (setting_key) DO NOTHING;

-- Insert default coupons setting with existing coupons
INSERT INTO booking_settings (setting_key, setting_value, description)
VALUES (
  'booking_coupons',
  '[
    {
      "code": "CUEPHORIA20",
      "description": "20% off on all bookings",
      "discount_type": "percentage",
      "discount_value": 20,
      "enabled": true
    },
    {
      "code": "CUEPHORIA35",
      "description": "35% off on all bookings",
      "discount_type": "percentage",
      "discount_value": 35,
      "enabled": true
    },
    {
      "code": "HH99",
      "description": "Happy hours special",
      "discount_type": "percentage",
      "discount_value": 99,
      "enabled": true
    },
    {
      "code": "NIT35",
      "description": "NIT special discount",
      "discount_type": "percentage",
      "discount_value": 35,
      "enabled": true
    },
    {
      "code": "AAVEG50",
      "description": "Aaveg event special",
      "discount_type": "percentage",
      "discount_value": 50,
      "enabled": true
    },
    {
      "code": "AXEIST",
      "description": "Axeist special discount",
      "discount_type": "percentage",
      "discount_value": 50,
      "enabled": true
    },
    {
      "code": "TEST210198$",
      "description": "Test discount code",
      "discount_type": "percentage",
      "discount_value": 20,
      "enabled": true
    },
    {
      "code": "GAMEINSIDER50",
      "description": "Game Insider special",
      "discount_type": "percentage",
      "discount_value": 50,
      "enabled": true
    }
  ]',
  'List of available coupon codes for bookings'
) ON CONFLICT (setting_key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER booking_settings_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_settings_updated_at();

-- Add comment
COMMENT ON TABLE booking_settings IS 'Stores configurable settings for public booking system including event names and coupon codes';
