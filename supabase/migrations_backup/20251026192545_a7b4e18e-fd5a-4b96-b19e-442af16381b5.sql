-- Update service_type based on category for legacy requests
UPDATE maintenance_requests
SET service_type = CASE
  WHEN category IN ('plumbing', 'electrical', 'hvac', 'painting', 'cleaning', 'handyman', 'appliances', 'landscaping_home', 'ac_repair') THEN 'home'
  WHEN category IN ('fitout', 'tiling', 'gypsum', 'carpentry', 'mep', 'waterproofing', 'landscaping_commercial', 'renovation') THEN 'project'
  ELSE service_type
END
WHERE service_type IS NULL;

-- Update tags.audience to match service_type
UPDATE maintenance_requests
SET tags = jsonb_set(
  COALESCE(tags, '{}'::jsonb),
  '{audience}',
  to_jsonb(service_type)
)
WHERE service_type IS NOT NULL 
  AND (tags->'audience' IS NULL OR tags->'audience'::text = 'null');

-- Update tags.service_category to match category
UPDATE maintenance_requests
SET tags = jsonb_set(
  COALESCE(tags, '{}'::jsonb),
  '{service_category}',
  to_jsonb(category)
)
WHERE category IS NOT NULL 
  AND (tags->'service_category' IS NULL OR tags->'service_category'::text = 'null');