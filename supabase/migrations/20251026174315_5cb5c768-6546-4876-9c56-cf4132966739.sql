-- Strip "Request #" from titles and descriptions
UPDATE maintenance_requests 
SET title = regexp_replace(title, 'Request\s*#\d*\s*[-:]?\s*', '', 'gi')
WHERE title ~* 'Request\s*#';

UPDATE maintenance_requests 
SET description = regexp_replace(description, 'Request\s*#\d*\s*[-:]?\s*', '', 'gi')
WHERE description ~* 'Request\s*#';

-- Normalize urgency from 'normal' to 'medium'
UPDATE maintenance_requests 
SET urgency = 'medium' 
WHERE urgency = 'normal';

-- Lower and round budgets for home services (many under 500 SAR)
UPDATE maintenance_requests
SET 
  estimated_budget_min = CASE 
    WHEN tags->>'audience' = 'home' THEN (floor(random() * 4 + 1) * 100)::numeric
    ELSE (floor(random() * 10 + 5) * 100)::numeric
  END,
  estimated_budget_max = CASE 
    WHEN tags->>'audience' = 'home' THEN (floor(random() * 4 + 1) * 100 + floor(random() * 3) * 100)::numeric
    ELSE (floor(random() * 10 + 5) * 100 + floor(random() * 5 + 2) * 100)::numeric
  END
WHERE estimated_budget_min IS NOT NULL;

-- Update existing vendors for more diversity
UPDATE profiles SET
  discoverable = true,
  user_type = 'seller',
  availability_status = CASE 
    WHEN random() < 0.6 THEN 'accepting_requests'
    WHEN random() < 0.8 THEN 'busy'
    ELSE 'not_taking_work'
  END,
  verified_seller = random() < 0.4,
  seller_rating = CASE 
    WHEN random() < 0.3 THEN 0
    WHEN random() < 0.5 THEN NULL
    ELSE (random() * 2.4 + 2.5)::numeric(3,1)
  END,
  completed_projects = floor(random() * 41)::integer,
  full_name = CASE floor(random() * 15)
    WHEN 0 THEN 'Ahmed'
    WHEN 1 THEN 'Jomar'
    WHEN 2 THEN 'Anil'
    WHEN 3 THEN 'Mae'
    WHEN 4 THEN 'Priya'
    WHEN 5 THEN 'محمد'
    WHEN 6 THEN 'فاطمة'
    WHEN 7 THEN 'Ricardo'
    WHEN 8 THEN 'Joseph'
    WHEN 9 THEN 'Maria'
    WHEN 10 THEN 'Ali'
    WHEN 11 THEN 'Hassan'
    WHEN 12 THEN 'Omar'
    WHEN 13 THEN 'Yusuf'
    ELSE 'Khalid'
  END,
  company_name = CASE 
    WHEN random() < 0.4 THEN NULL
    WHEN random() < 0.6 THEN 'Service Co'
    WHEN random() < 0.8 THEN full_name || ' Services'
    ELSE NULL
  END,
  bio = CASE 
    WHEN random() < 0.3 THEN NULL
    ELSE 'Experienced professional'
  END,
  phone = CASE 
    WHEN random() < 0.2 THEN NULL
    ELSE '+966' || floor(random() * 900000000 + 500000000)::text
  END,
  response_time_hours = floor(random() * 48 + 1)::integer
WHERE user_type = 'seller' OR user_type = 'both';

-- Insert sample reviews for vendors with ratings > 0
INSERT INTO seller_reviews (seller_id, buyer_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM profiles WHERE user_type IN ('buyer', 'both') ORDER BY random() LIMIT 1),
  floor(random() * 2 + 4)::integer,
  CASE floor(random() * 8)
    WHEN 0 THEN 'Great service, very professional'
    WHEN 1 THEN 'Quick response and good quality work'
    WHEN 2 THEN 'Excellent work, highly recommend'
    WHEN 3 THEN 'Professional and efficient'
    WHEN 4 THEN 'Good value for money'
    WHEN 5 THEN 'Very satisfied with the service'
    WHEN 6 THEN 'Reliable and trustworthy'
    ELSE 'Would hire again'
  END,
  now() - (floor(random() * 180) || ' days')::interval
FROM profiles p
WHERE p.seller_rating > 0 
  AND p.seller_rating IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM seller_reviews WHERE seller_id = p.id)
LIMIT 20;