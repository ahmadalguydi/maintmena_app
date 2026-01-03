-- Delete all existing system-generated vendors
DELETE FROM public.profiles WHERE system_generated = true;

-- Update the 6 existing real vendor profiles to be realistic for Arab community
-- Get the 6 oldest seller profiles by ID (these are likely the original sellers)
WITH oldest_sellers AS (
  SELECT id 
  FROM public.profiles 
  WHERE user_type IN ('seller', 'both') 
    AND (system_generated = false OR system_generated IS NULL)
  ORDER BY id ASC 
  LIMIT 6
),
vendor_updates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM oldest_sellers
)
UPDATE public.profiles p
SET
  full_name = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  full_name_ar = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  full_name_en = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  original_language = CASE v.rn
    WHEN 1 THEN 'ar'
    WHEN 2 THEN 'ar'
    WHEN 3 THEN 'en'
    WHEN 4 THEN 'en'
    WHEN 5 THEN 'ar'
    WHEN 6 THEN 'ar'
  END,
  company_name = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  company_name_ar = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  company_name_en = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  bio = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'فني كهرباء خبرة ١٥ سنة'
    WHEN 3 THEN 'Experienced handyman, quality work'
    WHEN 4 THEN 'Licensed electrician with 10 years experience'
    WHEN 5 THEN 'متخصص في التكييف والتبريد'
    WHEN 6 THEN NULL
  END,
  bio_ar = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'فني كهرباء خبرة ١٥ سنة'
    WHEN 3 THEN 'عامل صيانة ذو خبرة'
    WHEN 4 THEN 'فني كهرباء مرخص بخبرة ١٠ سنوات'
    WHEN 5 THEN 'متخصص في التكييف والتبريد'
    WHEN 6 THEN NULL
  END,
  bio_en = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'Electrician with 15 years experience'
    WHEN 3 THEN 'Experienced handyman, quality work'
    WHEN 4 THEN 'Licensed electrician with 10 years experience'
    WHEN 5 THEN 'HVAC specialist'
    WHEN 6 THEN NULL
  END,
  service_categories = CASE v.rn
    WHEN 1 THEN ARRAY['plumbing']
    WHEN 2 THEN ARRAY['electrical']
    WHEN 3 THEN ARRAY['handyman', 'painting']
    WHEN 4 THEN ARRAY['electrical', 'appliance_repair']
    WHEN 5 THEN ARRAY['hvac']
    WHEN 6 THEN ARRAY['cleaning']
  END,
  verified_seller = CASE v.rn
    WHEN 2 THEN true
    WHEN 4 THEN true
    WHEN 6 THEN true
    ELSE false
  END,
  seller_rating = CASE v.rn
    WHEN 1 THEN 0
    WHEN 2 THEN 4.2
    WHEN 3 THEN 3.8
    WHEN 4 THEN 4.5
    WHEN 5 THEN 4.7
    WHEN 6 THEN 0
  END,
  completed_projects = CASE v.rn
    WHEN 1 THEN 0
    WHEN 2 THEN 8
    WHEN 3 THEN 5
    WHEN 4 THEN 23
    WHEN 5 THEN 15
    WHEN 6 THEN 0
  END,
  years_of_experience = CASE v.rn
    WHEN 1 THEN 3
    WHEN 2 THEN 15
    WHEN 3 THEN 7
    WHEN 4 THEN 10
    WHEN 5 THEN 12
    WHEN 6 THEN 2
  END,
  availability_status = 'accepting_requests',
  discoverable = true,
  system_generated = false
FROM vendor_updates v
WHERE p.id = v.id;