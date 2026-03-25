-- Add columns for weighted ratings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS effective_rating float DEFAULT 0,
    ADD COLUMN IF NOT EXISTS high_value_badge boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_rating_recalc timestamp with time zone;
-- Function to calculate weighted rating
CREATE OR REPLACE FUNCTION public.calculate_seller_rating(seller_uuid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_weight float := 0;
weighted_sum float := 0;
review_record RECORD;
review_age_days int;
weight float;
-- High Value Stats
high_value_count int := 0;
high_value_sum float := 0;
is_high_value boolean := false;
BEGIN -- Loop through all reviews for this seller
FOR review_record IN
SELECT r.rating,
    r.created_at,
    m.budget
FROM public.seller_reviews r
    LEFT JOIN public.maintenance_requests m ON r.request_id = m.id
WHERE r.seller_id = seller_uuid LOOP -- Calculate Age in Days
    review_age_days := EXTRACT(
        DAY
        FROM (NOW() - review_record.created_at)
    );
-- Determine Weight based on Recency
IF review_age_days < 90 THEN weight := 1.0;
ELSIF review_age_days < 180 THEN weight := 0.8;
ELSE weight := 0.5;
END IF;
-- Add to sums
weighted_sum := weighted_sum + (review_record.rating * weight);
total_weight := total_weight + weight;
-- High Value Logic (Jobs > 1000)
IF review_record.budget IS NOT NULL
AND review_record.budget > 1000 THEN high_value_count := high_value_count + 1;
high_value_sum := high_value_sum + review_record.rating;
END IF;
END LOOP;
-- Determine High Value Badge (e.g., > 5 high value jobs with > 4.5 avg)
IF high_value_count >= 5
AND (high_value_sum / high_value_count) >= 4.5 THEN is_high_value := true;
END IF;
-- Update Profile
UPDATE public.profiles
SET effective_rating = CASE
        WHEN total_weight > 0 THEN (weighted_sum / total_weight)
        ELSE 0
    END,
    seller_rating = CASE
        WHEN total_weight > 0 THEN (weighted_sum / total_weight)
        ELSE 0
    END,
    -- Sync legacy column for now
    high_value_badge = is_high_value,
    last_rating_recalc = NOW()
WHERE id = seller_uuid;
END;
$$;
-- Trigger to run on review changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_rating() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF (TG_OP = 'DELETE') THEN PERFORM public.calculate_seller_rating(OLD.seller_id);
ELSE PERFORM public.calculate_seller_rating(NEW.seller_id);
END IF;
RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS on_review_change ON public.seller_reviews;
CREATE TRIGGER on_review_change
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.seller_reviews FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_rating();