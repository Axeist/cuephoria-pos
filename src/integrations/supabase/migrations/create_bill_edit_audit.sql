
-- Create bill_edit_audit table to track changes
CREATE TABLE IF NOT EXISTS bill_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id),
  editor_name TEXT NOT NULL,
  changes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add comment to table
COMMENT ON TABLE bill_edit_audit IS 'Tracks edits made to bills';

-- Add index for faster lookups by bill_id
CREATE INDEX IF NOT EXISTS idx_bill_edit_audit_bill_id ON bill_edit_audit(bill_id);

-- Enable RLS
ALTER TABLE bill_edit_audit ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow full access for authenticated users" 
ON bill_edit_audit FOR ALL USING (true);
