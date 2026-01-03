-- Fix contract statuses based on signature timestamps
-- This normalizes contracts where the status doesn't match the signature state
-- Contracts where buyer signed but seller hasn't -> should be pending_seller
UPDATE contracts
SET status = 'pending_seller'
WHERE signed_at_buyer IS NOT NULL
    AND signed_at_seller IS NULL
    AND status NOT IN (
        'pending_seller',
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );
-- Contracts where seller signed but buyer hasn't -> should be pending_buyer
UPDATE contracts
SET status = 'pending_buyer'
WHERE signed_at_seller IS NOT NULL
    AND signed_at_buyer IS NULL
    AND status NOT IN (
        'pending_buyer',
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );
-- Contracts where both signed but not executed -> should be executed
UPDATE contracts
SET status = 'executed',
    executed_at = COALESCE(
        executed_at,
        GREATEST(signed_at_buyer, signed_at_seller)
    )
WHERE signed_at_buyer IS NOT NULL
    AND signed_at_seller IS NOT NULL
    AND status NOT IN (
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );