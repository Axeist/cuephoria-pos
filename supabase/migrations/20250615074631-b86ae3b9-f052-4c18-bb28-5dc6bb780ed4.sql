
-- Create user_preferences table to store staff tutorial popup preference
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- references admin_users.id (local admin user management)
  how_to_use_dismissed boolean NOT NULL DEFAULT false,
  tutorial_progress int NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookup by user_id
CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_id_idx ON public.user_preferences(user_id);

-- (Optional, recommended) Add RLS for future-proofing multi-user support, but since you manage local auth, not Supabase Auth, you may restrict logic at the application level.

