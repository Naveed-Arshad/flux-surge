-- FLUX SURGE DATABASE SCHEMA (Web-Only Version)
-- Run this SQL in Supabase SQL editor
-- This creates all tables for Phase 1

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  coins BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  energy INT DEFAULT 100,
  energy_max INT DEFAULT 100,
  passive_per_sec INT DEFAULT 0,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  last_claim_date TIMESTAMP,
  streak INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE upgrades (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  upgrade_id VARCHAR(50), -- 'grip', 'tank', 'regen', 'bot', etc.
  level INT DEFAULT 0,
  UNIQUE(user_id, upgrade_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50), -- 'tap', 'upgrade', 'daily_reward', etc.
  amount BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE referrals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  referrer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  bonus_claimed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, referrer_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_upgrades_user_id ON upgrades(user_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_referrals_user_id ON referrals(user_id);
