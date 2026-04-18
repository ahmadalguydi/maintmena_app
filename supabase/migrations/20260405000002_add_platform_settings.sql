-- Platform settings key-value store for admin-toggleable features
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'true'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read platform settings"
  ON platform_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can manage platform settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed default values
INSERT INTO platform_settings (key, value) VALUES
  ('seasonal_alerts_enabled', 'true'::jsonb),
  ('soft_opening', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
