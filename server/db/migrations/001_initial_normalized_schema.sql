-- ==============================================================================
-- MOAS Normalized PostgreSQL Schema Migration 001
-- Description: Core tables, foreign keys, constraints, and indexes
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS moas;
SET search_path TO moas, public;

-- Migration Tracker Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Candidate',
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  phone VARCHAR(100),
  avatar_url TEXT,
  location VARCHAR(255),
  quote TEXT,
  about_me TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  experience_level VARCHAR(100),
  education JSONB DEFAULT '[]'::jsonb,
  company_name VARCHAR(255),
  company_email VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(100),
  contact_person VARCHAR(255),
  company_website TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255),
  industry VARCHAR(100),
  location VARCHAR(255),
  open_jobs_count INT DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 4.5,
  reviews_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT true,
  logo_url TEXT,
  culture_rating NUMERIC(3,2),
  work_life_rating NUMERIC(3,2),
  growth_rating NUMERIC(3,2),
  compensation_rating NUMERIC(3,2),
  featured_review TEXT,
  tagline TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Candidate Profiles Table
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline VARCHAR(255),
  bio TEXT,
  experience_years INT DEFAULT 0,
  skills JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  preferred_location VARCHAR(255),
  desired_salary VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Employer Profiles Table
CREATE TABLE IF NOT EXISTS employer_profiles (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_id VARCHAR(128) REFERENCES companies(id) ON DELETE SET NULL,
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  department VARCHAR(100),
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  company_id VARCHAR(128) REFERENCES companies(id) ON DELETE SET NULL,
  location VARCHAR(255),
  type VARCHAR(100),
  experience VARCHAR(100),
  salary VARCHAR(100),
  salary_text VARCHAR(100),
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  salary_currency VARCHAR(10) DEFAULT 'USD',
  description TEXT,
  requirements JSONB DEFAULT '[]'::jsonb,
  department VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb,
  posted_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'open',
  is_verified BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  posted_date VARCHAR(100),
  work_mode VARCHAR(50),
  logo_url TEXT,
  applicant_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(128) PRIMARY KEY,
  job_id VARCHAR(128) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  candidate_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_name VARCHAR(255) NOT NULL,
  candidate_email VARCHAR(255),
  applied_date VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Applied',
  stage VARCHAR(100) DEFAULT 'Initial Screening',
  match_score INT DEFAULT 85,
  resume_name VARCHAR(255),
  resume_url TEXT,
  cover_letter TEXT,
  notes TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_url TEXT,
  size VARCHAR(50),
  type VARCHAR(50) DEFAULT 'PDF',
  parsed_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Saved Jobs Table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id VARCHAR(128) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_date VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_saved_job UNIQUE (user_id, job_id)
);

-- 10. Job Alerts Table
CREATE TABLE IF NOT EXISTS job_alerts (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(255),
  location VARCHAR(255),
  role VARCHAR(255),
  category VARCHAR(100),
  frequency VARCHAR(50) DEFAULT 'Weekly',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Company Ratings Table
CREATE TABLE IF NOT EXISTS company_ratings (
  id VARCHAR(128) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  company_id VARCHAR(128) REFERENCES companies(id) ON DELETE SET NULL,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(100),
  user_avatar TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  culture_rating INT,
  work_life_rating INT,
  growth_rating INT,
  compensation_rating INT,
  review_title VARCHAR(255),
  review_text TEXT,
  pros TEXT,
  cons TEXT,
  recommend_to_friend BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(128) PRIMARY KEY,
  participant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(128) PRIMARY KEY,
  conversation_id VARCHAR(128) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Profile Views Table
CREATE TABLE IF NOT EXISTS profile_views (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
  viewer_type VARCHAR(100),
  viewer_name VARCHAR(255) NOT NULL,
  viewer_company VARCHAR(255) NOT NULL,
  viewer_role VARCHAR(255),
  viewer_avatar TEXT,
  source VARCHAR(255),
  viewed_at VARCHAR(100),
  duration_seconds INT DEFAULT 60,
  job_id VARCHAR(128),
  job_title VARCHAR(255),
  is_verified_recruiter BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_company_ratings_company ON company_ratings(company_name);
CREATE INDEX IF NOT EXISTS idx_profile_views_user ON profile_views(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
