-- Phase 1: Add unique constraints to prevent duplicate contracts
CREATE UNIQUE INDEX contracts_request_id_unique 
ON contracts (request_id) 
WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX contracts_booking_id_unique 
ON contracts (booking_id) 
WHERE booking_id IS NOT NULL;