
ALTER TABLE public.user_preferences
ADD COLUMN how_to_use_dismissed boolean NOT NULL DEFAULT false;
