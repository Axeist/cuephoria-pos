-- Migration: Set default passwords for all existing customers (Optimized)
-- This migration sets the default password (CUE{phone}) for all customers

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Update existing customers without a password_hash (in smaller batches to avoid timeout)
-- This uses a simpler approach without the temporary function
UPDATE customers
SET 
  password_hash = crypt('CUE' || phone, gen_salt('bf', 10)),
  is_first_login = TRUE
WHERE password_hash IS NULL OR password_hash = '';
