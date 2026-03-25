-- Create function to increment seller completed projects when both parties confirm
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
BEGIN
  -- Only trigger when both parties have marked complete for the first time
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    -- For maintenance_requests, use assigned_seller_id
    IF TG_TABLE_NAME = 'maintenance_requests' AND NEW.assigned_seller_id IS NOT NULL THEN
      UPDATE profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.assigned_seller_id;
    END IF;
    
    -- For booking_requests, use seller_id
    IF TG_TABLE_NAME = 'booking_requests' AND NEW.seller_id IS NOT NULL THEN
      UPDATE profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for maintenance_requests
DROP TRIGGER IF EXISTS increment_completed_projects_request ON maintenance_requests;
CREATE TRIGGER increment_completed_projects_request
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Create trigger for booking_requests
DROP TRIGGER IF EXISTS increment_completed_projects_booking ON booking_requests;
CREATE TRIGGER increment_completed_projects_booking
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Also update verified_reviews_count when a review is added
CREATE OR REPLACE FUNCTION increment_seller_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET verified_reviews_count = COALESCE(verified_reviews_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.seller_id;
  
  -- Check if seller reached 10 reviews - award founding member badge
  IF (SELECT COALESCE(verified_reviews_count, 0) FROM profiles WHERE id = NEW.seller_id) >= 10 THEN
    UPDATE profiles
    SET founding_member = true,
        badges = COALESCE(badges, '[]'::jsonb) || '["founding_member", "elite_pro"]'::jsonb,
        elite_badge_expiry = NOW() + INTERVAL '1 year'
    WHERE id = NEW.seller_id
      AND (founding_member IS NULL OR founding_member = false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for seller_reviews
DROP TRIGGER IF EXISTS increment_reviews_count ON seller_reviews;
CREATE TRIGGER increment_reviews_count
  AFTER INSERT ON seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_reviews_count();