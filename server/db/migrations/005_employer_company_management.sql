-- ==============================================================================
-- MOAS Normalized PostgreSQL Schema Migration 005
-- Description: Complete Employer, Company Profile, Verification, Memberships,
--              Recruiter Invitations, Application Notes, and Review Uniqueness
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS moas;
SET search_path TO moas, public;

-- 1. Upgrade Companies Table with Full Profile, Verification, and Media Metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'size'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN size VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'website'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN website TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'logo_storage_key'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN logo_storage_key VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'headquarters'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN headquarters VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'locations'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN locations JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'benefits'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN benefits JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'culture'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN culture TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN contact_email VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN contact_phone VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'verification_notes'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN verification_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN verified_by VARCHAR(128) REFERENCES moas.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'companies' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE moas.companies ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Backfill verification_status from verified boolean
UPDATE moas.companies
SET verification_status = CASE 
  WHEN verified = true THEN 'verified'
  ELSE 'pending'
END
WHERE verification_status IS NULL OR verification_status = 'pending';

-- Add check constraint on verification_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_company_verification_status'
  ) THEN
    ALTER TABLE moas.companies
    ADD CONSTRAINT chk_company_verification_status 
    CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended'));
  END IF;
END $$;

-- 2. Upgrade Employer Profiles Table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'employer_profiles' AND column_name = 'business_email'
  ) THEN
    ALTER TABLE moas.employer_profiles ADD COLUMN business_email VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'employer_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE moas.employer_profiles ADD COLUMN phone VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'employer_profiles' AND column_name = 'designation'
  ) THEN
    ALTER TABLE moas.employer_profiles ADD COLUMN designation VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'employer_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE moas.employer_profiles ADD COLUMN location VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'employer_profiles' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE moas.employer_profiles ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Backfill employer_profiles from users table for existing employers
INSERT INTO moas.employer_profiles (id, user_id, company_id, company_name, job_title, department, business_email, phone, designation, location)
SELECT 
  'emp-prof-' || u.id,
  u.id,
  c.id,
  u.company_name,
  COALESCE(u.quote, 'Hiring Manager'),
  'Recruiting',
  COALESCE(u.company_email, u.email),
  u.phone,
  COALESCE(u.quote, 'Lead Recruiter'),
  u.location
FROM moas.users u
LEFT JOIN moas.companies c ON LOWER(TRIM(u.company_name)) = LOWER(TRIM(c.name))
WHERE LOWER(u.role) = 'employer'
ON CONFLICT (user_id) DO UPDATE SET
  company_name = COALESCE(EXCLUDED.company_name, employer_profiles.company_name),
  company_id = COALESCE(EXCLUDED.company_id, employer_profiles.company_id),
  business_email = COALESCE(EXCLUDED.business_email, employer_profiles.business_email),
  phone = COALESCE(EXCLUDED.phone, employer_profiles.phone),
  updated_at = NOW();

-- 3. Upgrade Company Members Table with Invitations and Member Status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'company_members' AND column_name = 'invitation_email'
  ) THEN
    ALTER TABLE moas.company_members ADD COLUMN invitation_email VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'company_members' AND column_name = 'invitation_token'
  ) THEN
    ALTER TABLE moas.company_members ADD COLUMN invitation_token VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'company_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE moas.company_members ADD COLUMN status VARCHAR(50) DEFAULT 'accepted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'company_members' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE moas.company_members ADD COLUMN invited_by VARCHAR(128) REFERENCES moas.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'company_members' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE moas.company_members ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 4. Upgrade Applications Table with Recruiter Notes and Interview Scheduling
DO $$
BEGIN
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
    ALTER TABLE moas.applications ADD COLUMN interview_scheduled_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Copy existing notes to recruiter_notes if recruiter_notes is empty
UPDATE moas.applications
SET recruiter_notes = notes
WHERE recruiter_notes IS NULL AND notes IS NOT NULL;

-- 5. Company Ratings Duplicate Prevention and Clean-up
-- Clean up any duplicates in company_ratings keeping the latest created_at
DELETE FROM moas.company_ratings
WHERE id NOT IN (
  SELECT DISTINCT ON (COALESCE(company_id, company_name), user_id) id
  FROM moas.company_ratings
  ORDER BY COALESCE(company_id, company_name), user_id, created_at DESC
);

-- Ensure unique constraint on (company_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_company_user_rating'
  ) THEN
    -- Ensure all rows have company_id populated from company_name where null
    UPDATE moas.company_ratings cr
    SET company_id = c.id
    FROM moas.companies c
    WHERE cr.company_id IS NULL AND LOWER(TRIM(cr.company_name)) = LOWER(TRIM(c.name));

    -- Create unique index
    CREATE UNIQUE INDEX IF NOT EXISTS uq_company_user_rating 
    ON moas.company_ratings (company_id, user_id) 
    WHERE company_id IS NOT NULL;
  END IF;
END $$;

-- 6. Indexes for Performance and Filtering
CREATE INDEX IF NOT EXISTS idx_companies_verification ON moas.companies (verification_status);
CREATE INDEX IF NOT EXISTS idx_companies_owner ON moas.companies (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON moas.jobs (company_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON moas.jobs (posted_by);
CREATE INDEX IF NOT EXISTS idx_applications_job_status ON moas.applications (job_id, status);
CREATE INDEX IF NOT EXISTS idx_company_members_status ON moas.company_members (company_id, status);
