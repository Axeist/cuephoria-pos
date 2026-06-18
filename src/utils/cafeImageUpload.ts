import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'cafe-menu-images';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_SIZE });
  }
}

export async function uploadMenuItemImage(
  file: File,
  locationId: string,
  itemId?: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { url: null, error: 'Only JPEG, PNG and WebP images are allowed' };
  }
  if (file.size > MAX_SIZE) {
    return { url: null, error: 'Image must be under 2 MB' };
  }

  try {
    await ensureBucket();
  } catch {
    // bucket may already exist or RLS might prevent listing — continue
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${locationId}/${itemId || crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) {
    console.error('Upload error:', uploadErr);
    return { url: null, error: uploadErr.message };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, error: null };
}

export async function deleteMenuItemImage(imageUrl: string): Promise<void> {
  try {
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
    if (pathParts[1]) {
      await supabase.storage.from(BUCKET).remove([pathParts[1]]);
    }
  } catch {
    // best-effort
  }
}
