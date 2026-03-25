-- Fix search_path for functions
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
BEGIN
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    IF TG_TABLE_NAME = 'maintenance_requests' AND NEW.assigned_seller_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.assigned_seller_id;
    END IF;
    
    IF TG_TABLE_NAME = 'booking_requests' AND NEW.seller_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_seller_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles 
  SET verified_reviews_count = COALESCE(verified_reviews_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.seller_id;
  
  IF (SELECT COALESCE(verified_reviews_count, 0) FROM public.profiles WHERE id = NEW.seller_id) >= 10 THEN
    UPDATE public.profiles
    SET founding_member = true,
        badges = COALESCE(badges, '[]'::jsonb) || '["founding_member", "elite_pro"]'::jsonb,
        elite_badge_expiry = NOW() + INTERVAL '1 year'
    WHERE id = NEW.seller_id
      AND (founding_member IS NULL OR founding_member = false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;