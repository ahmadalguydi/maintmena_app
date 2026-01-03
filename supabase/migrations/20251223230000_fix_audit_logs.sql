CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS audit_logs_record_id_idx ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON audit_logs(table_name);

-- RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to admins
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Allow system/triggers to insert (auth.uid() might be null for system actions, but usually triggers run as user)
-- Since the function is SECURITY DEFINER, we don't strictly need a policy for the trigger if it bypasses RLS,
-- but standard insert policy for safety:
CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);
