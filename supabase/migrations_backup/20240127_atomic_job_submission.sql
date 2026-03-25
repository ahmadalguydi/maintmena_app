-- Function to handle atomic job submission
CREATE OR REPLACE FUNCTION public.create_maintenance_request(
        request_data jsonb,
        template_sections jsonb DEFAULT null
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_request_id uuid;
result_record jsonb;
BEGIN -- 1. Insert the Maintenance Request
INSERT INTO public.maintenance_requests (
        buyer_id,
        title,
        description,
        title_en,
        title_ar,
        description_en,
        description_ar,
        original_language,
        category,
        service_type,
        location,
        country,
        city,
        urgency,
        budget,
        estimated_budget_min,
        estimated_budget_max,
        deadline,
        preferred_start_date,
        project_duration_days,
        facility_type,
        scope_of_work,
        payment_method,
        tags,
        status,
        visibility,
        latitude,
        longitude
    )
VALUES (
        (request_data->>'buyer_id')::uuid,
        request_data->>'title',
        request_data->>'description',
        request_data->>'title_en',
        request_data->>'title_ar',
        request_data->>'description_en',
        request_data->>'description_ar',
        request_data->>'original_language',
        request_data->>'category',
        request_data->>'service_type',
        request_data->>'location',
        request_data->>'country',
        request_data->>'city',
        request_data->>'urgency',
        (request_data->>'budget')::numeric,
        (request_data->>'estimated_budget_min')::numeric,
        (request_data->>'estimated_budget_max')::numeric,
        (request_data->>'deadline')::timestamptz,
        (request_data->>'preferred_start_date')::timestamptz,
        (request_data->>'project_duration_days')::int,
        request_data->>'facility_type',
        request_data->>'scope_of_work',
        request_data->>'payment_method',
        (request_data->'tags')::jsonb,
        'open',
        'public',
        (request_data->>'latitude')::float,
        (request_data->>'longitude')::float
    )
RETURNING id INTO new_request_id;
-- 2. Insert Quote Template (if provided)
IF template_sections IS NOT NULL THEN
INSERT INTO public.request_quote_templates (
        request_id,
        sections,
        created_by
    )
VALUES (
        new_request_id,
        template_sections,
        (request_data->>'buyer_id')::uuid
    );
END IF;
-- 3. Auto-track the item for the buyer
INSERT INTO public.tracked_items (
        user_id,
        item_id,
        item_type
    )
VALUES (
        (request_data->>'buyer_id')::uuid,
        new_request_id,
        'request'
    );
-- Return the new ID
result_record := jsonb_build_object('id', new_request_id);
RETURN result_record;
END;
$$;