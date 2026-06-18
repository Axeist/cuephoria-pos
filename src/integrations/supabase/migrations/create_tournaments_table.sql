
-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    game_variant VARCHAR(50),
    game_title VARCHAR(255),
    date VARCHAR(50) NOT NULL,
    players JSONB DEFAULT '[]'::jsonb NOT NULL,
    matches JSONB DEFAULT '[]'::jsonb NOT NULL,
    status VARCHAR(20) NOT NULL,
    budget NUMERIC,
    winner_prize NUMERIC,
    runner_up_prize NUMERIC,
    winner JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment to table
COMMENT ON TABLE public.tournaments IS 'Stores information about tournaments';

-- Create RLS policies
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Allow read access for all users
CREATE POLICY "Allow read access for all users" 
ON public.tournaments FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users
CREATE POLICY "Allow full access for authenticated users" 
ON public.tournaments FOR ALL USING (auth.role() = 'authenticated');
