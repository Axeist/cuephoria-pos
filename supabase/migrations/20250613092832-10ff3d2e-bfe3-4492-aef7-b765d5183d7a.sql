
-- Create user preferences table for storing user-specific settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  theme VARCHAR(10) NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  default_timeout INTEGER NOT NULL DEFAULT 60,
  receipt_template VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (receipt_template IN ('standard', 'detailed', 'minimal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences 
  FOR SELECT 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences 
  FOR UPDATE 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences 
  FOR INSERT 
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id IS NULL);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow public read access to templates
CREATE POLICY "Anyone can view notification templates" 
  ON public.notification_templates 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Anyone can view email templates" 
  ON public.email_templates 
  FOR SELECT 
  TO public 
  USING (true);

-- Insert default notification templates
INSERT INTO public.notification_templates (name, title_template, message_template, type) VALUES
('low_stock', 'Low Stock Alert', 'Product "{product_name}" is running low with only {stock_count} items remaining.', 'warning'),
('session_timeout', 'Session Timeout Warning', 'Station "{station_name}" session will timeout in {minutes} minutes.', 'warning'),
('daily_report', 'Daily Report Ready', 'Your daily sales report for {date} is now available.', 'info'),
('product_sold_out', 'Product Sold Out', 'Product "{product_name}" is now out of stock.', 'error'),
('new_customer', 'New Customer Registered', 'New customer "{customer_name}" has been registered.', 'success');

-- Insert default email templates
INSERT INTO public.email_templates (name, subject_template, body_template) VALUES
('daily_report', 'Daily Sales Report - {date}', 'Your daily sales report for {date} is attached. Total sales: ₹{total_sales}'),
('low_stock_alert', 'Low Stock Alert - {product_name}', 'Product {product_name} is running low. Current stock: {stock_count}'),
('weekly_summary', 'Weekly Business Summary', 'Here is your weekly business summary with key metrics and insights.');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;

-- Set replica identity for realtime updates
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;
