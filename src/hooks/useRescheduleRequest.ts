import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RescheduleRequest {
  requestId: string;
  requestedBy: string;
  requestedAt: string;
  newDate: string;
  newTimeSlot: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requesterName?: string;
  /** Whether the current user is the one who made the request */
  isOwnRequest: boolean;
}

/**
 * Check if a maintenance request has a pending reschedule.
 * Returns null if no pending reschedule, or the reschedule details.
 */
export function useRescheduleRequest(requestId: string | undefined) {
  const { user } = useAuth();

  const { data: reschedule, isLoading, refetch } = useQuery({
    queryKey: ['reschedule-request', requestId],
    queryFn: async (): Promise<RescheduleRequest | null> => {
      if (!requestId || !user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('maintenance_requests')
        .select('reschedule_requested_by, reschedule_requested_at, reschedule_new_date, reschedule_new_time_slot, reschedule_status, buyer_id, assigned_seller_id')
        .eq('id', requestId)
        .maybeSingle();

      if (error || !data) return null;
      if (data.reschedule_status !== 'pending') return null;

      // Fetch requester's name
      let requesterName: string | undefined;
      if (data.reschedule_requested_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', data.reschedule_requested_by)
          .maybeSingle();
        requesterName = (profile as any)?.company_name || (profile as any)?.full_name || undefined;
      }

      return {
        requestId,
        requestedBy: data.reschedule_requested_by,
        requestedAt: data.reschedule_requested_at,
        newDate: data.reschedule_new_date,
        newTimeSlot: data.reschedule_new_time_slot,
        status: data.reschedule_status,
        requesterName,
        isOwnRequest: data.reschedule_requested_by === user.id,
      };
    },
    enabled: !!requestId && !!user?.id,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  return { reschedule, isLoading, refetch };
}
