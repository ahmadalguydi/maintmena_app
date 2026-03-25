-- Phase 1: Add system_generated flag to distinguish real users from mock data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_generated boolean DEFAULT false;

-- Phase 2A: Update existing 6 sellers with maximum diversity
-- First, let's identify and preserve real users by marking system_generated vendors

-- Vendor 1: Filipino freelancer - Mae
UPDATE public.profiles
SET 
  full_name = 'Mae',
  full_name_en = 'Mae',
  full_name_ar = 'ماي',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = 'Experienced home helper for cleaning and small repairs',
  bio_en = 'Experienced home helper for cleaning and small repairs',
  bio_ar = 'عاملة منزلية ذات خبرة في التنظيف والإصلاحات الصغيرة',
  service_categories = ARRAY['cleaning', 'handyman'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 2,
  years_of_experience = 3,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 0);

-- Vendor 2: Indian technician - Anil Kumar
UPDATE public.profiles
SET 
  full_name = 'Anil Kumar',
  full_name_en = 'Anil Kumar',
  full_name_ar = 'أنيل كومار',
  company_name = 'Kumar Electrical Services',
  company_name_en = 'Kumar Electrical Services',
  company_name_ar = 'خدمات كومار الكهربائية',
  bio = 'Licensed electrician with 10 years experience in commercial and residential projects',
  bio_en = 'Licensed electrician with 10 years experience in commercial and residential projects',
  bio_ar = 'كهربائي مرخص مع 10 سنوات خبرة في المشاريع التجارية والسكنية',
  service_categories = ARRAY['electrical', 'appliance_repair'],
  verified_seller = true,
  seller_rating = 4.2,
  completed_projects = 8,
  years_of_experience = 10,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966501234567',
  crew_size_range = '1-5',
  certifications = ARRAY['Licensed Electrician', 'Safety Certified'],
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 1);

-- Vendor 3: Arabic contractor - Khalid
UPDATE public.profiles
SET 
  full_name = 'خالد',
  full_name_en = 'Khalid',
  full_name_ar = 'خالد',
  company_name = 'شركة الصيانة السريعة',
  company_name_en = 'Fast Maintenance Company',
  company_name_ar = 'شركة الصيانة السريعة',
  bio = 'شركة صيانة متخصصة في جميع أعمال السباكة والكهرباء',
  bio_en = 'Maintenance company specialized in all plumbing and electrical work',
  bio_ar = 'شركة صيانة متخصصة في جميع أعمال السباكة والكهرباء',
  service_categories = ARRAY['plumbing', 'electrical', 'hvac'],
  verified_seller = false,
  seller_rating = 3.8,
  completed_projects = 15,
  years_of_experience = 7,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966502345678',
  crew_size_range = '6-15',
  system_generated = true,
  original_language = 'ar'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 2);

-- Vendor 4: Filipino handyman - Jomar Santos
UPDATE public.profiles
SET 
  full_name = 'Jomar Santos',
  full_name_en = 'Jomar Santos',
  full_name_ar = 'جومار سانتوس',
  company_name = 'Santos Repairs',
  company_name_en = 'Santos Repairs',
  company_name_ar = 'إصلاحات سانتوس',
  bio = 'Family business providing handyman services for homes',
  bio_en = 'Family business providing handyman services for homes',
  bio_ar = 'شركة عائلية تقدم خدمات الصيانة المنزلية',
  service_categories = ARRAY['handyman', 'carpentry', 'painting'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 1,
  years_of_experience = 2,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966503456789',
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 3);

-- Vendor 5: Indian electrician - Priya
UPDATE public.profiles
SET 
  full_name = 'Priya',
  full_name_en = 'Priya',
  full_name_ar = 'بريا',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = 'Specialist in home electrical repairs',
  bio_en = 'Specialist in home electrical repairs',
  bio_ar = 'متخصصة في إصلاحات الكهرباء المنزلية',
  service_categories = ARRAY['electrical'],
  verified_seller = true,
  seller_rating = 4.5,
  completed_projects = 23,
  years_of_experience = 6,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  certifications = ARRAY['Electrical License'],
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 4);

-- Vendor 6: Arabic plumber - Hassan
UPDATE public.profiles
SET 
  full_name = 'حسن',
  full_name_en = 'Hassan',
  full_name_ar = 'حسن',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = NULL,
  bio_en = NULL,
  bio_ar = NULL,
  service_categories = ARRAY['plumbing'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 0,
  years_of_experience = 1,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'ar'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 5);

-- Insert sample reviews for vendors with ratings
INSERT INTO public.seller_reviews (seller_id, buyer_id, request_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM public.profiles WHERE user_type IN ('buyer', 'both', 'buyer_individual') LIMIT 1),
  NULL,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 4
    WHEN p.full_name = 'خالد' THEN 4
    WHEN p.full_name = 'Priya' THEN 5
  END,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 'Good work, professional service'
    WHEN p.full_name = 'خالد' THEN 'عمل جيد وسريع'
    WHEN p.full_name = 'Priya' THEN 'Excellent electrician, highly recommended'
  END,
  now() - (random() * interval '60 days')
FROM public.profiles p
WHERE p.full_name IN ('Anil Kumar', 'خالد', 'Priya') AND p.system_generated = true
ON CONFLICT DO NOTHING;

INSERT INTO public.seller_reviews (seller_id, buyer_id, request_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM public.profiles WHERE user_type IN ('buyer', 'both', 'buyer_individual') LIMIT 1),
  NULL,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 5
    WHEN p.full_name = 'خالد' THEN 3
    WHEN p.full_name = 'Priya' THEN 4
  END,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 'Fixed our office electrical issues quickly'
    WHEN p.full_name = 'خالد' THEN 'خدمة جيدة لكن متأخر قليلاً'
    WHEN p.full_name = 'Priya' THEN 'Fast response and great work'
  END,
  now() - (random() * interval '30 days')
FROM public.profiles p
WHERE p.full_name IN ('Anil Kumar', 'خالد', 'Priya') AND p.system_generated = true
ON CONFLICT DO NOTHING;