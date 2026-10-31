-- ============================================================================
-- Migration 006: Complete Job Posting, Search, Filtering and Discovery System
-- ============================================================================

-- 1. Add Missing Job Lifecycle and Detailed Specification Columns to moas.jobs
ALTER TABLE moas.jobs
  ADD COLUMN IF NOT EXISTS responsibilities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS salary_period VARCHAR(50) DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS openings_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 2. Backfill Existing Columns for Consistency and High-Precision Search
UPDATE moas.jobs 
SET category = COALESCE(department, 'Engineering')
WHERE category IS NULL;

UPDATE moas.jobs
SET skills = COALESCE(tags, '[]'::jsonb)
WHERE skills IS NULL OR skills = '[]'::jsonb;

UPDATE moas.jobs
SET qualifications = COALESCE(requirements, '[]'::jsonb)
WHERE qualifications IS NULL;

UPDATE moas.jobs
SET published_at = created_at
WHERE published_at IS NULL AND status IN ('open', 'published', 'active');

-- 3. Add Status Constraint with Canonical Lifecycle Statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_status'
  ) THEN
    ALTER TABLE moas.jobs
      ADD CONSTRAINT chk_jobs_status
      CHECK (status IN ('draft', 'published', 'open', 'active', 'closed', 'archived', 'suspended'));
  END IF;
END $$;

-- 4. Full-Text Search Vector Column (FTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'jobs' AND column_name = 'fts'
  ) THEN
    ALTER TABLE moas.jobs
      ADD COLUMN fts tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
          coalesce(title, '') || ' ' || 
          coalesce(company, '') || ' ' || 
          coalesce(description, '') || ' ' || 
          coalesce(location, '') || ' ' || 
          coalesce(category, '') || ' ' || 
          coalesce(department, '')
        )
      ) STORED;
  END IF;
END $$;

-- 5. Full-Text Search GIN Index
CREATE INDEX IF NOT EXISTS idx_jobs_fts ON moas.jobs USING gin(fts);

-- 6. Indexes for Performance, Multi-Filter Queries, and Sorting
CREATE INDEX IF NOT EXISTS idx_jobs_category ON moas.jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode ON moas.jobs (work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON moas.jobs (type);
CREATE INDEX IF NOT EXISTS idx_jobs_salary_min ON moas.jobs (salary_min);
CREATE INDEX IF NOT EXISTS idx_jobs_salary_max ON moas.jobs (salary_max);
CREATE INDEX IF NOT EXISTS idx_jobs_experience ON moas.jobs (experience);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON moas.jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON moas.jobs (application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_public_discovery ON moas.jobs (status, created_at DESC) 
  WHERE status IN ('open', 'published', 'active');

-- 7. Indexes on Saved Jobs
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job ON moas.saved_jobs (job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_created ON moas.saved_jobs (user_id, created_at DESC);
