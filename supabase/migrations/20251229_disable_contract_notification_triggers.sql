-- Migration: Disable contract creation notification triggers to prevent duplicates
-- The front-end handles contract notifications now with duplicate prevention

-- Drop the contract creation notification trigger
DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts;

-- Drop the contract version updated notification trigger
DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts;

-- Optional: Keep the functions but they won't be triggered
-- This allows re-enabling if needed later
