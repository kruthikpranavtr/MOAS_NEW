-- ==============================================================================
-- MOAS Normalized PostgreSQL Schema Migration 004
-- Description: Candidate Profiles, Structured Resume Metadata, and Integrity Constraints
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS moas;
SET search_path TO moas, public;

-- 1. Upgrade Resumes Table with Storage and Metadata Columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'resumes' AND column_name = 'storage_key'
  ) THEN
    ALTER TABLE moas.resumes ADD COLUMN storage_key VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'resumes' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE moas.resumes ADD COLUMN file_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'resumes' AND column_name = 'original_filename'
  ) THEN
    ALTER TABLE moas.resumes ADD COLUMN original_filename VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'resumes' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE moas.resumes ADD COLUMN mime_type VARCHAR(100) DEFAULT 'application/pdf';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'resumes' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE moas.resumes ADD COLUMN file_size_bytes BIGINT DEFAULT 0;
  END IF;
END $$;

-- 2. Backfill existing resumes metadata where missing
UPDATE moas.resumes
SET 
  original_filename = COALESCE(original_filename, name),
  storage_key = COALESCE(storage_key, 'legacy-' || id),
  mime_type = CASE 
    WHEN LOWER(name) LIKE '%.docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ELSE 'application/pdf'
  END
WHERE original_filename IS NULL OR storage_key IS NULL;

-- 3. Enforce exactly one primary resume per candidate in PostgreSQL
WITH ranked_resumes AS (
  SELECT id, user_id, is_primary, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM moas.resumes
  WHERE is_primary = true
)
UPDATE moas.resumes r
SET is_primary = false
FROM ranked_resumes rr
WHERE r.id = rr.id AND rr.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_primary_resume 
ON moas.resumes (user_id) 
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON moas.resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_storage_key ON moas.resumes (storage_key);

-- 4. Upgrade Candidate Profiles Table with Structured Sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'candidate_profiles' AND column_name = 'work_experience'
  ) THEN
    ALTER TABLE moas.candidate_profiles ADD COLUMN work_experience JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'candidate_profiles' AND column_name = 'projects'
  ) THEN
    ALTER TABLE moas.candidate_profiles ADD COLUMN projects JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'candidate_profiles' AND column_name = 'certifications'
  ) THEN
    ALTER TABLE moas.candidate_profiles ADD COLUMN certifications JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'candidate_profiles' AND column_name = 'preferred_categories'
  ) THEN
    ALTER TABLE moas.candidate_profiles ADD COLUMN preferred_categories JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'candidate_profiles' AND column_name = 'completeness_score'
  ) THEN
    ALTER TABLE moas.candidate_profiles ADD COLUMN completeness_score INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'candidate_profiles' AND column_name = 'missing_sections'
  ) THEN
    ALTER TABLE moas.candidate_profiles ADD COLUMN missing_sections JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 5. Add avatar storage key to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'users' AND column_name = 'avatar_storage_key'
  ) THEN
    ALTER TABLE moas.users ADD COLUMN avatar_storage_key VARCHAR(255);
  END IF;
END $$;

-- 6. Backfill Candidate Profiles for all existing Candidate users
INSERT INTO moas.candidate_profiles (
  id, user_id, headline, bio, experience_years, skills, education, preferred_location, completeness_score
)
SELECT
  'cp-' || u.id,
  u.id,
  COALESCE(u.quote, u.role, 'Algorithmic Software Engineer'),
  COALESCE(u.about_me, 'Verified Candidate on MOAS platform.'),
  CASE 
    WHEN u.experience_level ILIKE '%fresher%' THEN 0
    WHEN u.experience_level ILIKE '%1%' THEN 2
    WHEN u.experience_level ILIKE '%3%' THEN 4
    WHEN u.experience_level ILIKE '%5%' THEN 6
    WHEN u.experience_level ILIKE '%8%' THEN 9
    ELSE 3
  END,
  COALESCE(u.skills, '[]'::jsonb),
  COALESCE(u.education, '[]'::jsonb),
  COALESCE(u.location, 'Bangalore, India'),
  75
FROM moas.users u
WHERE LOWER(u.role) = 'candidate'
ON CONFLICT (user_id) DO UPDATE SET
  skills = EXCLUDED.skills,
  education = EXCLUDED.education,
  headline = COALESCE(moas.candidate_profiles.headline, EXCLUDED.headline),
  bio = COALESCE(moas.candidate_profiles.bio, EXCLUDED.bio),
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON moas.candidate_profiles (user_id);
