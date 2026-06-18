
-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default categories if they don't exist
INSERT INTO categories (name)
VALUES 
  ('food'),
  ('drinks'),
  ('tobacco'),
  ('challenges'),
  ('membership')
ON CONFLICT (name) DO NOTHING;
