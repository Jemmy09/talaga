-- Talaga Notes App - Database Initialization Script
-- Run this in your Aiven PostgreSQL console

-- 1. Create the notes table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(50) CHECK (category IN ('info', 'todo', 'account')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create the feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Professional Check:
-- The 'id' uses SERIAL for auto-incrementing.
-- 'user_id' stores the Firebase UID.
-- 'category' uses a CHECK constraint to ensure data integrity.
-- 'created_at' uses TIMESTAMPTZ to avoid time zone issues.
