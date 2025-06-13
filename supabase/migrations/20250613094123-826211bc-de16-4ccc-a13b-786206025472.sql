
-- Enable RLS on notifications table (if not already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert notifications (since this is a single-user system)
CREATE POLICY "Allow notifications insert" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Create policy to allow anyone to select notifications (single-user system)
CREATE POLICY "Allow notifications select" ON public.notifications
FOR SELECT USING (true);

-- Create policy to allow anyone to update notifications (for marking as read)
CREATE POLICY "Allow notifications update" ON public.notifications
FOR UPDATE USING (true);

-- Create policy to allow anyone to delete notifications
CREATE POLICY "Allow notifications delete" ON public.notifications
FOR DELETE USING (true);
