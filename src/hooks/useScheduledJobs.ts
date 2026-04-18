import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import { GC_TIME, REFETCH_INTERVAL } from '@/lib/queryConfig';
import {
  getRequestLocationLabel,
  toCanonicalRequest,
  CanonicalRequestRow,
} from '@/lib/maintenanceRequest';

export interface ScheduledJob {
  id: string;
  category: string;
  title?: string;
  description?: string;
  location?: string;
  lat?: number;
  lng?: number;
  status: string;
  lifecycle: string;
  urgency?: string;
  scheduled_for?: string | null;
  created_at: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_avatar?: string;
  sellerPricing?: unknown;
}

export async function fetchSellerScheduledJobs(
  sellerId: string,
): Promise<ScheduledJob[]> {
  const requests = await executeSupabaseQuery<CanonicalRequestRow[]>(
    () =>
      (supabase as any)
        .from('maintenance_requests')
        .select(
          'id, category, title, description, location, city, latitude, longitude, status, urgency, preferred_start_date, created_at, buyer_id, seller_pricing, seller_marked_complete, buyer_marked_complete, buyer_price_approved',
        )
        .eq('assigned_seller_id', sellerId)
        .in('status', ['open', 'accepted', 'seller_assigned'])
        .order('preferred_start_date', { ascending: true, nullsFirst: true }),
    {
      context: 'seller-scheduled-jobs',
      fallbackData: [],
      relationName: 'maintenance_requests',
    },
  );

  const validRequests = requests
    .map((request) => toCanonicalRequest(request))
    .filter((request): request is NonNullable<typeof request> => Boolean(request))
    .filter((request) => request.lifecycle === 'scheduled_confirmed');

  if (validRequests.length === 0) {
    return [];
  }

  const buyerIds = [...new Set(validRequests.map((request) => request.buyer_id))];
  const buyerProfiles = buyerIds.length
    ? await executeSupabaseQuery<any[]>(
        () =>
          (supabase as any)
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', buyerIds) as any,
        {
          context: 'seller-scheduled-jobs-buyers',
          fallbackData: [],
          relationName: 'profiles',
        },
      )
    : [];

  const buyerMap = new Map(
    buyerProfiles.map((profile) => [profile.id, profile]),
  );

  return validRequests.map((request) => ({
    id: request.id,
    category: request.category || 'General',
    title: request.title,
    description: request.description,
    location: getRequestLocationLabel(request, 'Location pending'),
    lat: request.latitude ?? undefined,
    lng: request.longitude ?? undefined,
    status: request.status,
    lifecycle: request.lifecycle,
    urgency: request.urgency,
    scheduled_for: request.scheduledFor,
    created_at: request.created_at,
    buyer_id: request.buyer_id,
    buyer_name: buyerMap.get(request.buyer_id)?.full_name || undefined,
    buyer_avatar: buyerMap.get(request.buyer_id)?.avatar_url || undefined,
    sellerPricing: request.seller_pricing,
  }));
}

export function useScheduledJobs() {
  const { user } = useAuth();

  const { data: jobs = [], isLoading, refetch, error } = useQuery({
    queryKey: ['seller-scheduled-jobs', user?.id],
    queryFn: async (): Promise<ScheduledJob[]> => {
      if (!user?.id) return [];
      return fetchSellerScheduledJobs(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5_000,
    gcTime: GC_TIME.SHORT,
    placeholderData: (previousData) => previousData ?? [],
    refetchInterval: REFETCH_INTERVAL.ACTIVE_JOB,
  });

  return { jobs, isLoading, refetch, error };
}
