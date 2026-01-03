-- Admin Moderation Features Migration
-- Run this in Supabase SQL Editor

-- 1. Audit Logs - Track all admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'approve_resort', 'suspend_user', 'resolve_dispute', etc.
  entity_type TEXT NOT NULL, -- 'resort', 'user', 'booking', 'dispute', etc.
  entity_id UUID,
  details JSONB DEFAULT '{}', -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- 2. Disputes - Handle booking conflicts
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  against_user UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('open', 'under_review', 'resolved', 'escalated', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_booking ON disputes(booking_id);
CREATE INDEX idx_disputes_priority ON disputes(priority);

-- 3. System Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error', 'maintenance')) DEFAULT 'info',
  target_audience TEXT CHECK (target_audience IN ('all', 'guests', 'owners', 'admins')) DEFAULT 'all',
  display_type TEXT CHECK (display_type IN ('banner', 'modal', 'toast')) DEFAULT 'banner',
  is_active BOOLEAN DEFAULT TRUE,
  is_dismissible BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_active ON announcements(is_active, starts_at, ends_at);

-- 4. Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INT DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_users TEXT[] DEFAULT '{}', -- Specific user IDs
  target_roles TEXT[] DEFAULT '{}', -- 'guest', 'owner', 'admin'
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled);

-- 5. Resort Quality Scores
CREATE TABLE IF NOT EXISTS resort_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID REFERENCES resorts(id) ON DELETE CASCADE UNIQUE,
  overall_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 5.00
  response_time_score DECIMAL(3,2) DEFAULT 0,
  completion_rate_score DECIMAL(3,2) DEFAULT 0,
  review_sentiment_score DECIMAL(3,2) DEFAULT 0,
  photo_quality_score DECIMAL(3,2) DEFAULT 0,
  total_bookings INT DEFAULT 0,
  completed_bookings INT DEFAULT 0,
  cancelled_bookings INT DEFAULT 0,
  avg_response_minutes INT,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quality_scores_resort ON resort_quality_scores(resort_id);
CREATE INDEX idx_quality_scores_overall ON resort_quality_scores(overall_score DESC);

-- 6. Content Flags (for automated/manual content moderation)
CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'resort', 'review', 'message', 'profile'
  content_id UUID NOT NULL,
  flag_reason TEXT NOT NULL, -- 'inappropriate', 'spam', 'fake', 'duplicate', 'suspicious_pricing'
  flag_source TEXT CHECK (flag_source IN ('automated', 'user_report', 'admin')) DEFAULT 'automated',
  flagged_text TEXT,
  confidence_score DECIMAL(3,2), -- For automated flags, 0.00 to 1.00
  status TEXT CHECK (status IN ('pending', 'reviewed', 'approved', 'removed')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_flags_status ON content_flags(status);
CREATE INDEX idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX idx_content_flags_reason ON content_flags(flag_reason);

-- 7. User Verification Queue
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'id', 'business_permit', 'dti_certificate', 'phone', 'email'
  document_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
  rejection_reason TEXT,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_status ON user_verifications(status);
CREATE INDEX idx_user_verifications_type ON user_verifications(verification_type);

-- 8. Fraud Alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'multiple_accounts', 'suspicious_booking', 'payment_anomaly', 'cancellation_abuse'
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT,
  evidence JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('new', 'investigating', 'confirmed', 'dismissed')) DEFAULT 'new',
  investigated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  investigated_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_severity ON fraud_alerts(severity);

-- 9. System Health Metrics (for caching aggregated metrics)
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,2),
  metric_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name, recorded_at DESC);

-- 10. Email Templates (customizable)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'booking_confirmation', 'password_reset', etc.
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables TEXT[] DEFAULT '{}', -- ['{{user_name}}', '{{booking_id}}']
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_name ON email_templates(name);

-- Add helper function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_admin_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE resort_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only for most tables
CREATE POLICY "Admins can manage audit_logs" ON audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can manage disputes" ON disputes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Users can view own disputes" ON disputes
  FOR SELECT USING (
    initiated_by = auth.uid() OR against_user = auth.uid()
  );

CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (is_active = TRUE AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW()));

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can manage feature_flags" ON feature_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Anyone can read enabled feature_flags" ON feature_flags
  FOR SELECT USING (is_enabled = TRUE);

CREATE POLICY "Admins can manage quality_scores" ON resort_quality_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can manage content_flags" ON content_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can manage user_verifications" ON user_verifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Users can view own verifications" ON user_verifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can submit verifications" ON user_verifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage fraud_alerts" ON fraud_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can manage system_metrics" ON system_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can manage email_templates" ON email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
