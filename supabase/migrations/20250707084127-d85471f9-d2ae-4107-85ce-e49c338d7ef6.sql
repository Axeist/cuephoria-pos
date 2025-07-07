
-- Create a table to store tournament winner images
CREATE TABLE public.tournament_winner_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    winner_name TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT DEFAULT 'admin'
);

-- Create storage bucket for tournament images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tournament-images', 'tournament-images', true);

-- Create RLS policies for tournament winner images
ALTER TABLE public.tournament_winner_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access for displaying images
CREATE POLICY "Allow public read access to tournament winner images" 
ON public.tournament_winner_images FOR SELECT 
USING (true);

-- Allow authenticated users to insert images
CREATE POLICY "Allow authenticated users to insert tournament winner images" 
ON public.tournament_winner_images FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete tournament winner images" 
ON public.tournament_winner_images FOR DELETE 
USING (true);

-- Create storage policies for the bucket
CREATE POLICY "Allow public read access to tournament images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tournament-images');

CREATE POLICY "Allow authenticated users to upload tournament images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tournament-images');

CREATE POLICY "Allow authenticated users to delete tournament images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tournament-images');
