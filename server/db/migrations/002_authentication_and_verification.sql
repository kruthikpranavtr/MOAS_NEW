-- ==============================================================================
-- MOAS Normalized PostgreSQL Schema Migration 002
-- Description: Authentication, OTP verification, Password Reset, and Email Verification
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS moas;
SET search_path TO moas, public;

-- 1. Add phone_verified column to users if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'users' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE moas.users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Enforce unique username constraint (case-insensitive) on moas.users
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower 
ON moas.users (LOWER(username)) 
WHERE username IS NOT NULL AND username != '';

-- 3. OTP Codes Table (hashed at rest with purpose binding and attempt counters)
CREATE TABLE IF NOT EXISTS moas.otp_codes (
  id VARCHAR(128) PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'phone_verification',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  resend_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier_purpose ON moas.otp_codes (identifier, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON moas.otp_codes (expires_at);

-- 4. Password Resets Table (expiring single-use reset tokens hashed at rest)
CREATE TABLE IF NOT EXISTS moas.password_resets (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES moas.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON moas.password_resets (user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON moas.password_resets (token_hash);

-- 5. Email Verifications Table
CREATE TABLE IF NOT EXISTS moas.email_verifications (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES moas.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verif_user_id ON moas.email_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_token_hash ON moas.email_verifications (token_hash);

-- 6. Add user agent and IP metadata to sessions table if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'moas' AND table_name = 'sessions' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE moas.sessions ADD COLUMN user_agent TEXT;
    ALTER TABLE moas.sessions ADD COLUMN ip_address VARCHAR(100);
  END IF;
END $$;
