
-- Add a field to track if customer was created through tournament registration
ALTER TABLE customers 
ADD COLUMN created_via_tournament BOOLEAN DEFAULT FALSE;

-- Add a comment to document the field
COMMENT ON COLUMN customers.created_via_tournament IS 'Indicates if the customer was created through tournament registration';
