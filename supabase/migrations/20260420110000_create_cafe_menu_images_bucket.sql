-- Create storage bucket for cafe menu item images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('cafe-menu-images', 'cafe-menu-images', true, 2097152)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read images (public bucket)
DO $$ BEGIN
  CREATE POLICY "Public read cafe-menu-images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cafe-menu-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow authenticated users to upload images
DO $$ BEGIN
  CREATE POLICY "Auth upload cafe-menu-images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cafe-menu-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow authenticated users to update images
DO $$ BEGIN
  CREATE POLICY "Auth update cafe-menu-images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'cafe-menu-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow authenticated users to delete images
DO $$ BEGIN
  CREATE POLICY "Auth delete cafe-menu-images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'cafe-menu-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
