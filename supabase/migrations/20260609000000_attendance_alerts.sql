-- Migration: Create attendance_alerts table for Phase 5.10.1

-- Drop existing constraint if exists to update source_type options safely
ALTER TABLE IF EXISTS hour_bank_transactions 
  DROP CONSTRAINT IF EXISTS hour_bank_transactions_source_type_check;

-- Create constraint again with alert_resolution
ALTER TABLE IF EXISTS hour_bank_transactions 
  ADD CONSTRAINT hour_bank_transactions_source_type_check 
  CHECK (source_type IN ('daily_summary', 'manual_adjustment', 'balance_transfer', 'request_approval', 'alert_resolution'));

-- Create the new alerts table
CREATE TABLE IF NOT EXISTS attendance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  summary_id uuid REFERENCES attendance_daily_summaries(id) ON DELETE SET NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('unauthorized_overtime', 'break_exceeded', 'open_lunch', 'manual_note')),
  alert_date date NOT NULL,
  detected_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'partially_resolved', 'dismissed')),
  resolution_action text CHECK (resolution_action IN ('approved', 'partially_approved', 'dismissed', 'warned', 'acknowledged')),
  regularized_minutes integer DEFAULT 0,
  admin_notes text,
  resolved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_org_emp ON attendance_alerts(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_date ON attendance_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_status ON attendance_alerts(status);

-- Unique index to prevent duplicate alerts for the same summary and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_alerts_unique_summary_type 
  ON attendance_alerts(summary_id, alert_type) 
  WHERE summary_id IS NOT NULL;

-- Enable RLS
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to be safe
DROP POLICY IF EXISTS "Users can view alerts of their organization" ON attendance_alerts;
DROP POLICY IF EXISTS "Admins can manage alerts" ON attendance_alerts;

-- Policies
CREATE POLICY "Users can view alerts of their organization" 
  ON attendance_alerts FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage alerts" 
  ON attendance_alerts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND organization_id = attendance_alerts.organization_id
      AND access_profile IN ('Master', 'Admin')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_attendance_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_attendance_alerts_updated_at_trigger ON attendance_alerts;
CREATE TRIGGER update_attendance_alerts_updated_at_trigger
  BEFORE UPDATE ON attendance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_alerts_updated_at();
