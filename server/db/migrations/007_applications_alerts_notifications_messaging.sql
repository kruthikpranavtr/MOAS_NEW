-- ==============================================================================
-- MOAS Normalized PostgreSQL Schema Migration 007
-- Description: Applications Tracking, Status History, Job Alerts Matching, 
--              Notifications Inbox, and Real-Time Conversations/Messages
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS moas;
SET search_path TO moas, public;

-- 1. Upgrade Applications Table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'applications' AND column_name = 'resume_id'
  ) THEN
    ALTER TABLE moas.applications ADD COLUMN resume_id VARCHAR(128) REFERENCES moas.resumes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'applications' AND column_name = 'cover_letter'
  ) THEN
    ALTER TABLE moas.applications ADD COLUMN cover_letter TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'applications' AND column_name = 'withdrawn_at'
  ) THEN
    ALTER TABLE moas.applications ADD COLUMN withdrawn_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'applications' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE moas.applications ADD COLUMN rejection_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'applications' AND column_name = 'recruiter_notes'
  ) THEN
    ALTER TABLE moas.applications ADD COLUMN recruiter_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'applications' AND column_name = 'interview_scheduled_at'
  ) THEN
    ALTER TABLE moas.applications ADD COLUMN interview_scheduled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enforce policy: Prevent duplicate active applications per candidate per job
-- (Applications in 'Withdrawn' or 'Rejected' status can be re-applied for if allowed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_candidate_job_application 
ON moas.applications (candidate_id, job_id) 
WHERE status NOT IN ('Withdrawn', 'withdrawn', 'Rejected', 'rejected');

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON moas.applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON moas.applications (candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON moas.applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_resume_id ON moas.applications (resume_id);

-- 2. Application Status History Table
CREATE TABLE IF NOT EXISTS moas.application_history (
  id VARCHAR(128) PRIMARY KEY,
  application_id VARCHAR(128) NOT NULL REFERENCES moas.applications(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  stage VARCHAR(100),
  actor_id VARCHAR(128) NOT NULL REFERENCES moas.users(id) ON DELETE CASCADE,
  actor_role VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_history_app_id ON moas.application_history (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_history_actor ON moas.application_history (actor_id);

-- 3. Upgrade Job Alerts Table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'job_alerts' AND column_name = 'work_mode'
  ) THEN
    ALTER TABLE moas.job_alerts ADD COLUMN work_mode VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'job_alerts' AND column_name = 'min_salary'
  ) THEN
    ALTER TABLE moas.job_alerts ADD COLUMN min_salary NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'job_alerts' AND column_name = 'experience'
  ) THEN
    ALTER TABLE moas.job_alerts ADD COLUMN experience VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'job_alerts' AND column_name = 'skills'
  ) THEN
    ALTER TABLE moas.job_alerts ADD COLUMN skills JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'job_alerts' AND column_name = 'last_processed_at'
  ) THEN
    ALTER TABLE moas.job_alerts ADD COLUMN last_processed_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_alerts_user_active ON moas.job_alerts (user_id, active);

-- Job Alert Deliveries Table to track matched jobs and prevent duplicate alerts
CREATE TABLE IF NOT EXISTS moas.job_alert_deliveries (
  id VARCHAR(128) PRIMARY KEY,
  alert_id VARCHAR(128) NOT NULL REFERENCES moas.job_alerts(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL REFERENCES moas.users(id) ON DELETE CASCADE,
  job_id VARCHAR(128) NOT NULL REFERENCES moas.jobs(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  channel VARCHAR(50) DEFAULT 'in_app',
  CONSTRAINT uq_alert_job_delivery UNIQUE (alert_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_user ON moas.job_alert_deliveries (user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_job ON moas.job_alert_deliveries (job_id);

-- 4. Upgrade Notifications Table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE moas.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'notifications' AND column_name = 'channel'
  ) THEN
    ALTER TABLE moas.notifications ADD COLUMN channel VARCHAR(50) DEFAULT 'in_app';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'notifications' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE moas.notifications ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'delivered';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE moas.notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'notifications' AND column_name = 'archived'
  ) THEN
    ALTER TABLE moas.notifications ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_inbox ON moas.notifications (user_id, is_read, created_at DESC);

-- 5. Upgrade Conversations Table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'job_id'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN job_id VARCHAR(128) REFERENCES moas.jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'application_id'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN application_id VARCHAR(128) REFERENCES moas.applications(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'employer_id'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN employer_id VARCHAR(128) REFERENCES moas.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'candidate_id'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN candidate_id VARCHAR(128) REFERENCES moas.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN company_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'company_logo'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN company_logo TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'last_message_text'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN last_message_text TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'conversations' AND column_name = 'last_message_time'
  ) THEN
    ALTER TABLE moas.conversations ADD COLUMN last_message_time TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conv_candidate ON moas.conversations (candidate_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_employer ON moas.conversations (employer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_job ON moas.conversations (job_id);

-- 6. Upgrade Messages Table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE moas.messages ADD COLUMN read_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'messages' AND column_name = 'sender_role'
  ) THEN
    ALTER TABLE moas.messages ADD COLUMN sender_role VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'messages' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE moas.messages ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'delivered';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON moas.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON moas.messages (recipient_id, is_read) WHERE is_read = false;
