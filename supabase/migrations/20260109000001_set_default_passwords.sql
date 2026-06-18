-- Migration: Set default passwords for all existing customers
-- This migration sets the default password (CUE{phone}) for all customers who don't have a password set
-- NOTE: This should be run AFTER the main customer_auth_and_offers migration

-- Create a function to hash passwords (using pgcrypto extension)
-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a temporary function to generate default password hashes
CREATE OR REPLACE FUNCTION generate_default_password_hash(phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Generate password as 'CUE' + phone number
  -- Hash it using bcrypt (cost factor 10)
  RETURN crypt('CUE' || phone_number, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Update all customers without a password_hash
UPDATE customers
SET 
  password_hash = generate_default_password_hash(phone),
  is_first_login = TRUE
WHERE password_hash IS NULL OR password_hash = '';

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM customers
  WHERE password_hash IS NOT NULL;
  
  RAISE NOTICE 'Successfully set default passwords for % customers', updated_count;
END $$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_default_password_hash(TEXT);

-- Create a trigger function to automatically set default password for new customers
CREATE OR REPLACE FUNCTION set_default_customer_password()
RETURNS TRIGGER AS $$
BEGIN
  -- If password_hash is not provided, set default password
  IF NEW.password_hash IS NULL OR NEW.password_hash = '' THEN
    NEW.password_hash := crypt('CUE' || NEW.phone, gen_salt('bf', 10));
    NEW.is_first_login := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set password on customer creation
DROP TRIGGER IF EXISTS trigger_set_default_password ON customers;
CREATE TRIGGER trigger_set_default_password
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_default_customer_password();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_set_default_password ON customers IS 
  'Automatically sets default password (CUE{phone}) for new customers if not provided';

COMMENT ON FUNCTION set_default_customer_password() IS 
  'Trigger function that sets default password for new customers. Password format: CUE{phone_number}';
