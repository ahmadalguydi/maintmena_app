import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { GC_TIME, REFETCH_INTERVAL } from '@/lib/queryConfig';
import {
  getRequestLocationLabel,
  isDispatchOfferActionable,
} from '@/lib/maintenanceRequest';
import { isRequestOpportunityVisible } from '@/lib/opportunityVisibility';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import { getCategoryIcon } from '@/lib/serviceCategories';

export interface Opportunity {
  id: string;
  offerId?: string;
  type: 'request';
  category: string;
  categoryIcon: string;
  title: string;
  subCategory?: string;
  description?: string;
  photos?: string[];
  location: string;
  locationDistrict?: string;
  distance?: number;
  lat?: number;
  lng?: number;
  urgency: 'urgent' | 'asap' | 'scheduled' | 'flexible';
  timing?: string;
  priceRange?: { min: number; max: number };
  min: number;
  max: number;
  priceExact?: number;
  buyerTags?: string[];
  expiresAt?: Date;
  receivedAt: Date;
  waitlistPosition?: number;
}

interface UseOpportunitiesResult {
  opportunities: Opportunity[];
  waitlistedOpportunities: Opportunity[];
  isLoading: boolean;
  refetch: () => void;
  declineOpportunity: (id: string) => void;
  lastFetchedAt: Date | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  plumbing: '🔧',
  electrical: '⚡',
  ac: '❄️',
  ac_cooling: '❄️',
  cleaning: '🧹',
  painting: '🎨',
  carpentry: '🪚',
  appliance_repair: '🔌',
  general: '🛠️',
};

// Persist declined IDs across remounts so they don't reappear on navigation
const declinedIdsCache = new Set<string>();

export function useOpportunities(): UseOpportunitiesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [declinedIds, setDeclinedIds] = useState<string[]>(() => Array.from(declinedIdsCache));

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['seller-opportunities', user?.id],
    queryFn: async (): Promise<{ opportunities: Opportunity[]; waitlisted: Opportunity[] }> => {
      if (!user?.id) {
        return { opportunities: [], waitlisted: [] };
      }

      const offers = await executeSupabaseQuery<any[]>(
        () =>
          (supabase as any)
            .from('job_dispatch_offers')
            .select('id, job_id, job_type, offer_status, sent_at, expires_at')
            .eq('seller_id', user.id)
            .in('offer_status', ['sent', 'delivered', 'seen'])
            .order('sent_at', { ascending: false }),
        {
          context: 'seller-opportunities-offers',
          fallbackData: [],
          relationName: 'job_dispatch_offers',
        },
      );

      const actionableOffers = offers.filter((offer) => isDispatchOfferActionable(offer));
      if (actionableOffers.length === 0) {
        return { opportunities: [], waitlisted: [] };
      }

      const requestIds = actionableOffers.map((offer) => offer.job_id);
      const requests = await executeSupabaseQuery<any[]>(
        () =>
          (supabase as any)
            .from('maintenance_requests')
            .select(
              'id, category, title, description, budget, urgency, preferred_start_date, created_at, status, location, city, photos, estimated_budget_min, estimated_budget_max, latitude, longitude, assigned_seller_id',
            )
            .in('id', requestIds),
        {
          context: 'seller-opportunities-requests',
          fallbackData: [],
          relationName: 'maintenance_requests',
        },
      );

      const requestsMap = new Map(
        requests.map((request) => [request.id, request]),
      );

      const opportunities = actionableOffers
        .map((offer) => {
          const request = requestsMap.get(offer.job_id);
          if (!request) return null;
          if (!isRequestOpportunityVisible(request.status)) return null;
          // Don't show opportunities the seller is already assigned to
          if (request.assigned_seller_id === user?.id) return null;

          const serviceType = request.category || 'general';
          const categoryKey = serviceType.toLowerCase().replace(/[\s-]+/g, '_');
          const urgency = getOpportunityUrgency(request.urgency, request.preferred_start_date);
          const budgetMin =
            request.estimated_budget_min ||
            (request.budget ? Math.floor((request.budget * 0.8) / 10) * 10 : 0);
          const budgetMax =
            request.estimated_budget_max ||
            (request.budget ? Math.ceil((request.budget * 1.2) / 10) * 10 : 0);

          return {
            id: offer.job_id,
            offerId: offer.id,
            type: 'request' as const,
            category: serviceType,
            categoryIcon: getCategoryIcon(serviceType) || CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.general,
            title: formatServiceTitle(serviceType),
            subCategory: request.title ? request.title.split(' - ').pop() : undefined,
            description: request.description
              ? request.description.replace(/^.*\n{2,}/, '').substring(0, 100)
              : undefined,
            photos: request.photos || undefined,
            location: getRequestLocationLabel(request, 'Location pending'),
            lat: request.latitude ?? undefined,
            lng: request.longitude ?? undefined,
            urgency,
            timing: formatOpportunityTiming(
              request.preferred_start_date,
              urgency,
              user?.user_metadata?.language,
            ),
            priceRange:
              budgetMin && budgetMax ? { min: budgetMin, max: budgetMax } : undefined,
            min: budgetMin || 0,
            max: budgetMax || 0,
            priceExact: request.budget,
            receivedAt: new Date(offer.sent_at),
            expiresAt: offer.expires_at ? new Date(offer.expires_at) : undefined,
            buyerTags: [],
          };
        })
        .filter(Boolean) as Opportunity[];

      opportunities.sort((a, b) => {
        const urgencyOrder = { urgent: 0, asap: 1, scheduled: 2, flexible: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

      return { opportunities, waitlisted: [] };
    },
    enabled: !!user?.id,
    staleTime: 15_000,
    gcTime: GC_TIME.STANDARD,
    refetchInterval: REFETCH_INTERVAL.OPPORTUNITIES,
    placeholderData: (previousData) =>
      previousData ?? { opportunities: [], waitlisted: [] },
  });

  const opportunities = useMemo(
    () => (data?.opportunities || []).filter((opportunity) => !declinedIds.includes(opportunity.id)),
    [data?.opportunities, declinedIds],
  );

  const declineOpportunity = useCallback((id: string) => {
    // Persist in module-level cache so it survives remounts
    declinedIdsCache.add(id);
    // Optimistically hide from UI immediately
    setDeclinedIds((previous) => [...previous, id]);

    // Persist the decline to the DB so the offer is marked and dispatch engine skips this seller
    const opportunity = data?.opportunities.find((o) => o.id === id);
    if (opportunity?.offerId) {
      (supabase as any)
        .from('job_dispatch_offers')
        .update({
          offer_status: 'declined',
          responded_at: new Date().toISOString(),
          response_type: 'decline',
          updated_at: new Date().toISOString(),
        })
        .eq('id', opportunity.offerId)
        .then(({ error }: { error: any }) => {
          if (error) {
            console.error('[declineOpportunity] Failed to persist decline:', error);
          } else {
            // DB succeeded — clear from local cache so future refetches exclude it server-side
            declinedIdsCache.delete(id);
            // Invalidate so next refetch gets clean server state
            queryClient.invalidateQueries({ queryKey: ['seller-opportunities'] });
          }
        });
    }
  }, [data?.opportunities, queryClient]);

  return {
    opportunities,
    waitlistedOpportunities: data?.waitlisted || [],
    isLoading,
    refetch,
    declineOpportunity,
    lastFetchedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}

function getOpportunityUrgency(
  rawUrgency?: string | null,
  preferredStartDate?: string | null,
): Opportunity['urgency'] {
  if (rawUrgency === 'emergency' || rawUrgency === 'urgent' || rawUrgency === 'high') {
    return 'urgent';
  }
  if (rawUrgency === 'asap' || rawUrgency === 'medium') {
    return 'asap';
  }
  if (preferredStartDate) {
    return 'scheduled';
  }
  return 'flexible';
}

function formatOpportunityTiming(
  scheduledAt?: string | null,
  urgency?: Opportunity['urgency'],
  language?: string,
) {
  if (!scheduledAt) {
    return urgency === 'urgent' || urgency === 'asap' ? 'Earliest' : 'Flexible';
  }

  const date = new Date(scheduledAt);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const locale = language === 'ar' ? ar : undefined;
  const timeStr = format(date, 'h:mm a', { locale });

  if (diffDays <= 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Tomorrow, ${timeStr}`;
  if (diffDays <= 7) return `In ${diffDays} days, ${timeStr}`;
  return format(date, 'MMM d, h:mm a', { locale });
}

function formatServiceTitle(serviceType: string | null): string {
  if (!serviceType) return 'Service Request';
  return serviceType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
