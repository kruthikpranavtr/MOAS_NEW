-- ==============================================================================
-- MOAS Normalized PostgreSQL Schema Migration 003
-- Description: RBAC, Company Memberships, Audit Logs, and Resource Ownership
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS moas;
SET search_path TO moas, public;

-- 1. Add owner_user_id to companies table if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN owner_user_id VARCHAR(128) REFERENCES moas.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Company Members Table (verified employer-company relationships)
CREATE TABLE IF NOT EXISTS moas.company_members (
  id VARCHAR(128) PRIMARY KEY,
  company_id VARCHAR(128) NOT NULL REFERENCES moas.companies(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL REFERENCES moas.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'recruiter', -- 'owner', 'admin', 'recruiter', 'member'
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_company_user UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_user ON moas.company_members (user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON moas.company_members (company_id);

-- 3. Audit Logs Table (tracks administrative actions, role elevations, and moderations)
CREATE TABLE IF NOT EXISTS moas.audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  actor_id VARCHAR(128) REFERENCES moas.users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(128),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(100),
  outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'DENIED', 'FAILURE'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON moas.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON moas.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON moas.audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON moas.audit_logs (created_at);

-- 4. Automatically backfill company_members for existing employers
INSERT INTO moas.company_members (id, company_id, user_id, role, is_verified)
SELECT 
  'cm-' || u.id || '-' || c.id,
  c.id,
  u.id,
  'owner',
  true
FROM moas.users u
JOIN moas.companies c ON LOWER(TRIM(u.company_name)) = LOWER(TRIM(c.name))
WHERE LOWER(u.role) = 'employer'
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 5. Automatically backfill jobs.company_id from companies matching company name
UPDATE moas.jobs j
SET company_id = c.id
FROM moas.companies c
WHERE j.company_id IS NULL AND LOWER(TRIM(j.company)) = LOWER(TRIM(c.name));
