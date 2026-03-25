import { supabase } from '@/integrations/supabase/client';
import type { CanonicalRequest, CanonicalRequestRow } from '@/lib/maintenanceRequest';
import { toCanonicalRequest } from '@/lib/maintenanceRequest';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';

type MaintenanceRequest = CanonicalRequest;

const REQUEST_SELECT_FIELDS_FULL = [
  'id',
  'title',
  'description',
  'category',
  'status',
  'lifecycle_state',
  'urgency',
  'scheduled_for',
  'preferred_start_date',
  'created_at',
  'updated_at',
  'buyer_id',
  'assigned_seller_id',
  'location',
  'city',
  'location_address',
  'location_city',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'budget',
  'seller_pricing',
  'final_amount',
  'seller_marked_complete',
  'buyer_marked_complete',
  'buyer_price_approved',
  'job_completion_code',
].join(', ');

const REQUEST_SELECT_FIELDS_COMPAT = [
  'id',
  'title',
  'description',
  'category',
  'status',
  'urgency',
  'preferred_start_date',
  'created_at',
  'updated_at',
  'buyer_id',
  'assigned_seller_id',
  'location',
  'city',
  'latitude',
  'longitude',
  'budget',
  'seller_pricing',
  'final_amount',
  'seller_marked_complete',
  'buyer_marked_complete',
  'buyer_price_approved',
  'job_completion_code',
].join(', ');

const REQUEST_SELECT_FIELDS_MINIMAL = [
  'id',
  'category',
  'status',
  'preferred_start_date',
  'created_at',
  'buyer_id',
  'assigned_seller_id',
  'location',
  'city',
  'latitude',
  'longitude',
  'budget',
  'seller_marked_complete',
  'buyer_marked_complete',
  'buyer_price_approved',
].join(', ');

const REQUEST_SELECT_CANDIDATES = [
  REQUEST_SELECT_FIELDS_FULL,
  REQUEST_SELECT_FIELDS_COMPAT,
  REQUEST_SELECT_FIELDS_MINIMAL,
];

const isMissingColumnError = (error: any) => error?.code === '42703';

async function fetchCanonicalRequestRows(
  buildQuery: (selectFields: string) => Promise<{ data: CanonicalRequestRow[] | CanonicalRequestRow | null; error: any }>,
  context: string,
  fallbackData: CanonicalRequestRow[] | CanonicalRequestRow | null,
  selectCandidates = REQUEST_SELECT_CANDIDATES,
) {
  let lastError: unknown;

  for (let index = 0; index < selectCandidates.length; index += 1) {
    const selectFields = selectCandidates[index];
    const candidateContext = index === 0 ? context : `${context}-fallback-${index}`;

    try {
      return await executeSupabaseQuery<CanonicalRequestRow[] | CanonicalRequestRow | null>(
        () => buildQuery(selectFields),
        {
          context: candidateContext,
          fallbackData,
          relationName: 'maintenance_requests',
          throwOnError: true,
        },
      );
    } catch (error) {
      lastError = error;

      if (!isMissingColumnError(error) || index === selectCandidates.length - 1) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch maintenance_requests for ${context}`);
}

const mapRowsToCanonicalRequests = (rows: CanonicalRequestRow[] | null | undefined) =>
  (rows ?? [])
    .map((row) => toCanonicalRequest(row))
    .filter((row): row is CanonicalRequest => Boolean(row));

export async function fetchBuyerRequests(buyerId: string): Promise<CanonicalRequest[]> {
  const rows = await fetchCanonicalRequestRows(
    (selectFields) =>
      (supabase as any)
        .from('maintenance_requests')
        .select(selectFields)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false }),
    'job-service-fetch-buyer-requests',
    [],
    [REQUEST_SELECT_FIELDS_COMPAT, REQUEST_SELECT_FIELDS_FULL, REQUEST_SELECT_FIELDS_MINIMAL],
  );

  return mapRowsToCanonicalRequests(rows as CanonicalRequestRow[]);
}

export async function fetchBuyerActivityRequests(buyerId: string): Promise<CanonicalRequest[]> {
  const rows = await fetchCanonicalRequestRows(
    (selectFields) =>
      (supabase as any)
        .from('maintenance_requests')
        .select(selectFields)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false })
        .limit(50),
    'job-service-fetch-buyer-activity-requests',
    [],
    [REQUEST_SELECT_FIELDS_COMPAT, REQUEST_SELECT_FIELDS_MINIMAL],
  );

  return mapRowsToCanonicalRequests(rows as CanonicalRequestRow[]);
}

export async function fetchRequestById(requestId: string): Promise<CanonicalRequest | null> {
  const row = await fetchCanonicalRequestRows(
    (selectFields) =>
      (supabase as any)
        .from('maintenance_requests')
        .select(selectFields)
        .eq('id', requestId)
        .maybeSingle(),
    'job-service-fetch-request-by-id',
    null,
  );

  return toCanonicalRequest(row as CanonicalRequestRow | null);
}

export async function fetchDispatchableRequests(options?: {
  serviceCategories?: string[];
  limit?: number;
}): Promise<MaintenanceRequest[]> {
  const rows = await fetchCanonicalRequestRows(
    (selectFields) => {
      let query = (supabase as any)
        .from('maintenance_requests')
        .select(selectFields)
        .eq('status', 'open')
        .gt(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('created_at', { ascending: false }) as any;

      if (options?.serviceCategories?.length) {
        query = query.in('category', options.serviceCategories) as any;
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      return query;
    },
    'job-service-fetch-dispatchable-requests',
    [],
  );

  return mapRowsToCanonicalRequests(rows as CanonicalRequestRow[]);
}

export async function fetchSellerAssignedActiveRequests(sellerId: string): Promise<CanonicalRequest[]> {
  const rows = await fetchCanonicalRequestRows(
    (selectFields) =>
      (supabase as any)
        .from('maintenance_requests')
        .select(selectFields)
        .eq('assigned_seller_id', sellerId)
        .in('status', ['accepted', 'en_route', 'arrived', 'in_progress', 'completed'])
        .order('created_at', { ascending: false }),
    'job-service-fetch-seller-assigned-active-requests',
    [],
  );

  return mapRowsToCanonicalRequests(rows as CanonicalRequestRow[]).filter(
    (request) =>
      request.lifecycle === 'seller_assigned' ||
      request.lifecycle === 'in_route' ||
      request.lifecycle === 'in_progress' ||
      request.lifecycle === 'seller_marked_complete',
  );
}

export async function updateRequestStatus(
  requestId: string,
  status: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('maintenance_requests')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('[jobService] updateRequestStatus error:', error);
    throw error;
  }
}

export async function createRequest(
  request: any,
): Promise<MaintenanceRequest> {
  const { data, error } = await (supabase as any)
    .from('maintenance_requests')
    .insert(request)
    .select()
    .single();

  if (error) {
    console.error('[jobService] createRequest error:', error);
    throw error;
  }

  const canonicalRequest = toCanonicalRequest(data as CanonicalRequestRow);
  if (!canonicalRequest) {
    throw new Error('Request insert succeeded but canonical mapping failed.');
  }

  return canonicalRequest;
}

export async function checkQuoteLimit(sellerId: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
}> {
  const LIMIT = 15;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await executeSupabaseQuery<number | null>(
    async () => {
      const { count, error } = await (supabase as any)
        .from('job_dispatch_offers')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .gte('created_at', today.toISOString());

      return { data: count ?? 0, error };
    },
    {
      context: 'job-service-check-quote-limit',
      fallbackData: null,
      relationName: 'job_dispatch_offers',
      throwOnError: true,
    },
  );

  return {
    allowed: (count || 0) < LIMIT,
    count: count || 0,
    limit: LIMIT,
  };
}

export async function fetchSellerQuotes(sellerId: string): Promise<any[]> {
  return executeSupabaseQuery<any[]>(
    () =>
      (supabase as any)
        .from('job_dispatch_offers')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false }),
    {
      context: 'job-service-fetch-seller-quotes',
      fallbackData: [],
      relationName: 'job_dispatch_offers',
      throwOnError: true,
    },
  );
}

export async function submitQuote(quoteData: any): Promise<void> {
  const dbQuote = {
    job_id: quoteData.request_id,
    seller_id: quoteData.seller_id,
    offer_status: quoteData.status || 'pending',
    pricing: {
      price: quoteData.price,
      duration: quoteData.estimated_duration,
      start_date: quoteData.start_date,
      proposal: quoteData.proposal,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from('job_dispatch_offers')
    .insert(dbQuote);

  if (error) {
    console.error('[jobService] submitQuote error:', error);
    throw error;
  }
}

export async function updateJobStatus(
  jobId: string,
  status: string,
  type: 'request' = 'request',
): Promise<void> {
  if (type !== 'request') {
    throw new Error('Only request lifecycle updates are supported.');
  }

  await updateRequestStatus(jobId, status);
}
