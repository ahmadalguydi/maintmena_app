-- ROLLBACK SCRIPT 
-- Run this in Supabase SQL Editor to undo all changes from the Job Issue Resolution System
-- 1. Drop Tables (Cascade to remove policies and indexes)
DROP TABLE IF EXISTS job_issues CASCADE;
DROP TABLE IF EXISTS job_events CASCADE;
-- 2. Drop RPC Functions
DROP FUNCTION IF EXISTS raise_issue;
DROP FUNCTION IF EXISTS respond_to_issue;
DROP FUNCTION IF EXISTS close_issue;
DROP FUNCTION IF EXISTS reopen_issue;
-- 3. Drop Helper Functions
DROP FUNCTION IF EXISTS map_outcome_to_type;
DROP FUNCTION IF EXISTS calculate_issue_deadline;
DROP FUNCTION IF EXISTS capture_context_snapshot;
DROP FUNCTION IF EXISTS is_issue_counterparty;
DROP FUNCTION IF EXISTS is_job_participant;
-- 4. Drop Processing Functions
DROP FUNCTION IF EXISTS process_issue_timeouts;
DROP FUNCTION IF EXISTS update_seller_reliability;
-- 5. Remove Columns from Profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS reliability_rate,
    DROP COLUMN IF EXISTS total_jobs_30d,
    DROP COLUMN IF EXISTS incidents_30d,
    DROP COLUMN IF EXISTS on_time_rate,
    DROP COLUMN IF EXISTS first_issue_raised_at,
    DROP COLUMN IF EXISTS first_issue_received_at;
-- Confirmation
SELECT 'Rollback successful: Job Issue System removed' as result;