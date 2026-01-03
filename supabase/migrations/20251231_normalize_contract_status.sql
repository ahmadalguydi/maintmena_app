-- Migration: Update old 'active' contracts to 'executed'
-- This migration normalizes all contract statuses to use the modern 'executed' value
-- Step 1: Update all contracts with status='active' to status='executed'
UPDATE contracts
SET status = 'executed',
    updated_at = NOW()
WHERE status = 'active';
-- Verify the update (optional, for logging)
-- SELECT COUNT(*) as updated_count FROM contracts WHERE status = 'executed';