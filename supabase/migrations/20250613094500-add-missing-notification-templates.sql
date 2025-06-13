
-- Add missing notification templates
INSERT INTO notification_templates (name, title_template, message_template, type, is_active) VALUES
('theme_changed', 'Theme Updated', 'Application theme changed to {theme} mode', 'info', true),
('settings_updated', 'Settings Updated', 'Your application settings have been saved successfully', 'success', true),
('tournament_created', 'Tournament Created', 'New {game_type} tournament "{tournament_name}" has been created', 'success', true),
('tournament_deleted', 'Tournament Deleted', 'Tournament "{tournament_name}" has been deleted', 'warning', true)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;
