import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type JobEventType =
    | 'seller_on_the_way'
    | 'seller_arrived'
    | 'seller_arrived_no_answer'
    | 'seller_delayed'
    | 'seller_cannot_attend'
    | 'seller_marked_complete'
    | 'seller_marked_returning'
    | 'buyer_confirmed_arrival'
    | 'buyer_confirmed_complete';

export type CorroborationType = 'gps' | 'time_delay';

export interface JobEvent {
    id: string;
    job_id: string;
    job_type: 'request' | 'booking';
    event_type: JobEventType;
    user_id: string;
    eta_minutes?: number;
    corroboration_type?: CorroborationType;
    location_lat?: number;
    location_lng?: number;
    metadata: Record<string, unknown>;
    created_at: string;
}

interface CreateEventParams {
    jobId: string;
    jobType: 'request' | 'booking';
    eventType: JobEventType;
    etaMinutes?: number;
    corroborationType?: CorroborationType;
    locationLat?: number;
    locationLng?: number;
}

export function useJobEvents(jobId: string, jobType: 'request' | 'booking') {
    return useQuery({
        queryKey: ['job-events', jobId, jobType],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_events')
                .select('*')
                .eq('job_id', jobId)
                .eq('job_type', jobType)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as JobEvent[];
        },
        enabled: !!jobId,
    });
}

export function useLatestEvent(jobId: string, jobType: 'request' | 'booking') {
    return useQuery({
        queryKey: ['job-events', jobId, jobType, 'latest'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_events')
                .select('*')
                .eq('job_id', jobId)
                .eq('job_type', jobType)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data as JobEvent | null;
        },
        enabled: !!jobId,
    });
}

export function useCreateJobEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: CreateEventParams) => {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('job_events')
                .insert({
                    job_id: params.jobId,
                    job_type: params.jobType,
                    event_type: params.eventType,
                    user_id: user.user.id,
                    eta_minutes: params.etaMinutes,
                    corroboration_type: params.corroborationType,
                    location_lat: params.locationLat,
                    location_lng: params.locationLng,
                })
                .select()
                .single();

            if (error) throw error;
            return data as JobEvent;
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ['job-events', params.jobId, params.jobType]
            });
        },
    });
}

// Helper to check if we can use "arrived no answer" with corroboration
export function canUseArrivedNoAnswer(
    lastOnMyWayEvent: JobEvent | null,
    hasLocationPermission: boolean,
    currentLocation: { lat: number; lng: number } | null,
    buyerLocation: { lat: number; lng: number } | null
): { allowed: boolean; corroborationType: CorroborationType | null } {
    // Option 1: GPS within 250m
    if (hasLocationPermission && currentLocation && buyerLocation) {
        const distance = calculateDistance(currentLocation, buyerLocation);
        if (distance <= 250) {
            return { allowed: true, corroborationType: 'gps' };
        }
    }

    // Option 2: 15+ minutes since "on my way"
    if (lastOnMyWayEvent) {
        const onMyWayTime = new Date(lastOnMyWayEvent.created_at);
        const minutesSince = (Date.now() - onMyWayTime.getTime()) / (1000 * 60);
        if (minutesSince >= 15) {
            return { allowed: true, corroborationType: 'time_delay' };
        }
    }

    return { allowed: false, corroborationType: null };
}

// Haversine distance calculation in meters
function calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
