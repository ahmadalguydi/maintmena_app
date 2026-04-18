import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Haversine distance between two lat/lng points, returns meters.
 */
function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoordinate(lat: number | null, lng: number | null): boolean {
    if (lat == null || lng == null) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function isWithinSaudiArabia(lat: number, lng: number): boolean {
    // Approximate bounding box for Saudi Arabia + neighboring Gulf states
    return lat >= 16.0 && lat <= 32.5 && lng >= 34.5 && lng <= 56.0;
}

interface DispatchResult {
    sessionId: string | null;
    eligibleCount: number;
    error?: string;
}

interface AcceptResult {
    accepted: boolean;
    jobId?: string;
    jobType?: string;
    reason?: string;
    error?: string;
}

export function useDispatchActions() {
    const { user } = useAuth();

    /** Estimated job duration in hours by default (used for schedule conflict checks). */
    const DEFAULT_JOB_DURATION_HOURS = 3;

    /**
     * Find eligible online sellers for a category, rank by distance, and dispatch.
     * Now supports smart timeouts and schedule conflict prevention.
     */
    const triggerDispatch = async (
        jobId: string,
        jobType: 'request' | 'booking',
        category: string,
        buyerLat: number | null,
        buyerLng: number | null,
        waveSize = 3,
        options?: {
            isScheduled?: boolean;
            scheduledFor?: string | null;
        }
    ): Promise<DispatchResult> => {
        try {
            const isScheduled = options?.isScheduled ?? false;
            const scheduledFor = options?.scheduledFor ?? null;

            // Validate coordinates
            if (buyerLat != null && buyerLng != null) {
                if (!isValidCoordinate(buyerLat, buyerLng)) {
                    return { sessionId: null, eligibleCount: 0, error: 'Invalid coordinates' };
                }
            }

            // Prevent scheduling in the past
            if (isScheduled && scheduledFor) {
                const scheduledTime = new Date(scheduledFor).getTime();
                if (scheduledTime < Date.now() - 5 * 60 * 1000) { // 5 min grace
                    return { sessionId: null, eligibleCount: 0, error: 'Cannot schedule a request in the past' };
                }
            }

            // 1. Query ALL sellers who have deliberately set is_online = true.
            const { data: sellers, error: sellersError } = await (supabase as any)
                .from('profiles')
                .select('id, location_lat, location_lng, services_pricing, service_categories, is_online, user_type, service_radius_km')
                .eq('user_type', 'seller')
                .eq('is_online', true);

            if (sellersError) {
                if (import.meta.env.DEV) console.error('Error fetching sellers:', sellersError);
                return { sessionId: null, eligibleCount: 0, error: sellersError.message };
            }

            if (!sellers || sellers.length === 0) {
                return { sessionId: null, eligibleCount: 0, error: 'No online sellers found' };
            }

            // 2. Filter by category capability and service radius
            const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '_');
            const categoryNorm = normalize(category);

            const eligible = sellers.filter((s: any) => {
                if (buyerLat != null && buyerLng != null) {
                    const radiusKm: number | null = s.service_radius_km ?? null;
                    if (radiusKm != null && radiusKm > 0 && s.location_lat && s.location_lng) {
                        const distanceM = haversineDistance(buyerLat, buyerLng, s.location_lat, s.location_lng);
                        if (distanceM > radiusKm * 1000) return false;
                    }
                }

                const cats: string[] = Array.isArray(s.service_categories)
                    ? s.service_categories.filter(Boolean)
                    : [];
                if (cats.some((c: string) => normalize(c) === categoryNorm)) return true;

                const pricing: any[] = Array.isArray(s.services_pricing) ? s.services_pricing : [];
                return pricing.some(
                    (p: any) => (p.enabled || p.available) && (
                        normalize(p.serviceType || '') === categoryNorm ||
                        normalize(p.category || '') === categoryNorm
                    )
                );
            });

            if (eligible.length === 0) {
                return { sessionId: null, eligibleCount: 0, error: 'No sellers available for this category' };
            }

            // 3. Filter out sellers with conflicting active jobs
            const eligibleIds = eligible.map((s: any) => s.id as string);
            let availableIds = new Set(eligibleIds);

            // Fetch sellers who have active ASAP jobs (mission mode) — they should not get
            // new ASAP requests. For scheduled requests, they CAN receive them as long as
            // the scheduled time doesn't conflict.
            const { data: busySellers } = await (supabase as any)
                .from('maintenance_requests')
                .select('assigned_seller_id, status, preferred_start_date, urgency')
                .in('assigned_seller_id', eligibleIds)
                .in('status', ['accepted', 'en_route', 'arrived', 'in_progress']);

            if (busySellers && busySellers.length > 0) {
                for (const job of busySellers) {
                    const sellerId = job.assigned_seller_id as string;
                    const jobIsAsap = !job.preferred_start_date || job.urgency === 'high' || job.urgency === 'emergency';
                    const jobStatus = job.status as string;
                    const inMissionMode = ['en_route', 'arrived', 'in_progress'].includes(jobStatus);

                    if (!isScheduled) {
                        // ASAP request: exclude sellers currently in mission mode
                        if (inMissionMode) {
                            availableIds.delete(sellerId);
                        }
                    } else if (scheduledFor) {
                        // Scheduled request: check for time conflicts
                        const newStart = new Date(scheduledFor).getTime();
                        const newEnd = newStart + DEFAULT_JOB_DURATION_HOURS * 3600 * 1000;

                        if (job.preferred_start_date) {
                            const existingStart = new Date(job.preferred_start_date).getTime();
                            const existingEnd = existingStart + DEFAULT_JOB_DURATION_HOURS * 3600 * 1000;
                            // Check overlap: new job overlaps with existing job's time window
                            if (newStart < existingEnd && newEnd > existingStart) {
                                availableIds.delete(sellerId);
                            }
                        } else if (inMissionMode && jobIsAsap) {
                            // Seller is in an active ASAP job — if the scheduled time is
                            // within the next few hours, there could be a conflict
                            const hoursUntilScheduled = (newStart - Date.now()) / 3600000;
                            if (hoursUntilScheduled < DEFAULT_JOB_DURATION_HOURS) {
                                availableIds.delete(sellerId);
                            }
                        }
                    }
                }
            }

            const filteredEligible = eligible.filter((s: any) => availableIds.has(s.id));

            if (filteredEligible.length === 0) {
                return { sessionId: null, eligibleCount: 0, error: 'No available sellers for this time slot' };
            }

            // 4. Rank by distance (if buyer location is available)
            let ranked: string[];
            if (buyerLat != null && buyerLng != null) {
                ranked = filteredEligible
                    .map((s: any) => ({
                        id: s.id as string,
                        distance:
                            s.location_lat && s.location_lng
                                ? haversineDistance(buyerLat, buyerLng, s.location_lat, s.location_lng)
                                : Infinity,
                    }))
                    .sort((a, b) => a.distance - b.distance)
                    .map((s) => s.id);
            } else {
                ranked = filteredEligible
                    .map((s: any) => s.id as string)
                    .sort(() => Math.random() - 0.5);
            }

            // 5. Call start_job_dispatch RPC (server-side handles status transition)
            if (!jobId) {
                return { sessionId: null, eligibleCount: 0, error: 'Invalid job ID' };
            }
            const { data, error: rpcError } = await (supabase as any).rpc('start_job_dispatch', {
                p_job_id: jobId,
                p_job_type: jobType,
                p_seller_ids: ranked,
                p_wave_size: waveSize,
                p_is_scheduled: isScheduled,
                p_scheduled_for: scheduledFor || null,
            });

            if (rpcError) {
                if (import.meta.env.DEV) console.error('Dispatch RPC error:', rpcError);
                return { sessionId: null, eligibleCount: 0, error: rpcError.message };
            }

            return {
                sessionId: data as string,
                eligibleCount: Math.min(ranked.length, waveSize),
            };
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('triggerDispatch error:', err);
            return { sessionId: null, eligibleCount: 0, error: err.message };
        }
    };

    /**
     * Expire stale dispatch sessions that have timed out.
     * Call this periodically (e.g., on buyer home load) to clean up stuck dispatches.
     */
    const expireStaleDispatches = async (): Promise<number> => {
        try {
            const { data, error } = await (supabase as any).rpc('expire_stale_dispatch_sessions');
            if (error) {
                if (import.meta.env.DEV) console.error('expire_stale_dispatch_sessions error:', error);
                return 0;
            }
            return (data as number) || 0;
        } catch {
            return 0;
        }
    };

    /**
     * Accept a dispatched job offer via the atomic RPC.
     * After RPC success, updates the original job record app-side.
     */
    const acceptOffer = async (offerId: string, pricing?: Record<string, unknown>): Promise<AcceptResult> => {
        if (!user?.id) return { accepted: false, error: 'Not authenticated' };
        if (!offerId) return { accepted: false, error: 'Invalid offer ID' };

        try {
            // accept_job_offer is a new RPC not yet in generated types
            const { data, error } = await (supabase as any).rpc('accept_job_offer', {
                p_offer_id: offerId,
                p_seller_id: user.id,
                p_pricing: pricing || null,
            });

            if (error) {
                if (import.meta.env.DEV) console.error('accept_job_offer RPC error:', error);
                return { accepted: false, error: error.message };
            }

            const result = data as any;

            if (!result?.accepted) {
                return { accepted: false, reason: result?.reason || 'unknown' };
            }

            // The RPC now atomically updates maintenance_requests server-side
            // (client-side update was blocked by RLS)
            const { job_id, job_type } = result;

            return { accepted: true, jobId: job_id, jobType: job_type };
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('acceptOffer error:', err);
            return { accepted: false, error: err.message };
        }
    };

    /**
     * Decline a dispatched job offer.
     */
    const declineOffer = async (offerId: string, reason?: string): Promise<boolean> => {
        try {
            // job_dispatch_offers is a new table not yet in generated types
            const { error } = await (supabase as any)
                .from('job_dispatch_offers')
                .update({
                    offer_status: 'declined',
                    responded_at: new Date().toISOString(),
                    response_type: 'decline',
                    decline_reason: reason || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', offerId);

            if (error) {
                if (import.meta.env.DEV) console.error('declineOffer error:', error);
                return false;
            }
            return true;
        } catch (err) {
            if (import.meta.env.DEV) console.error('declineOffer error:', err);
            return false;
        }
    };

    /**
     * Catch-up dispatch for a seller who just came online (or just left mission mode).
     * Finds unassigned open requests matching the seller's categories/radius that they haven't
     * received an offer for yet, then fires individual dispatch waves so they can see the jobs.
     * Now also checks for schedule conflicts with the seller's existing accepted jobs.
     */
    const catchUpDispatch = async (): Promise<{ dispatched: number }> => {
        if (!user?.id) return { dispatched: 0 };

        try {
            // 1. Fetch this seller's profile
            const { data: profile, error: profileError } = await (supabase as any)
                .from('profiles')
                .select('service_categories, services_pricing, location_lat, location_lng, service_radius_km, is_online')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError || !profile?.is_online) return { dispatched: 0 };

            // 2. Fetch open/unassigned requests (limit 20 to avoid spam)
            const { data: requests, error: requestsError } = await (supabase as any)
                .from('maintenance_requests')
                .select('id, category, latitude, longitude, status, preferred_start_date, urgency')
                .in('status', ['open', 'submitted', 'matching', 'dispatching'])
                .is('assigned_seller_id', null)
                .limit(20);

            if (requestsError || !requests || requests.length === 0) return { dispatched: 0 };

            // 3. Fetch existing offers for this seller so we don't re-dispatch
            const requestIds = requests.map((r: any) => r.id as string);
            const { data: existingOffers } = await (supabase as any)
                .from('job_dispatch_offers')
                .select('job_id')
                .eq('seller_id', user.id)
                .in('job_id', requestIds);

            const alreadyOfferedIds = new Set<string>(
                (existingOffers ?? []).map((o: any) => o.job_id as string)
            );

            // 4. Fetch seller's accepted/active jobs to check schedule conflicts
            const { data: sellerJobs } = await (supabase as any)
                .from('maintenance_requests')
                .select('status, preferred_start_date, urgency')
                .eq('assigned_seller_id', user.id)
                .in('status', ['accepted', 'en_route', 'arrived', 'in_progress']);

            const sellerActiveJobs = (sellerJobs ?? []) as {
                status: string;
                preferred_start_date: string | null;
                urgency: string | null;
            }[];

            const isSellerInMissionMode = sellerActiveJobs.some(
                j => ['en_route', 'arrived', 'in_progress'].includes(j.status)
            );

            // 5. Category/radius/schedule-conflict filter
            const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '_');
            const cats: string[] = Array.isArray(profile.service_categories)
                ? profile.service_categories.filter(Boolean)
                : [];
            const pricing: any[] = Array.isArray(profile.services_pricing) ? profile.services_pricing : [];
            const radiusKm: number | null = profile.service_radius_km ?? null;

            const matched = requests.filter((req: any) => {
                if (alreadyOfferedIds.has(req.id)) return false;

                // If seller is in mission mode, skip ASAP requests (they'll get them when done)
                const reqIsAsap = !req.preferred_start_date || req.urgency === 'high' || req.urgency === 'emergency';
                if (isSellerInMissionMode && reqIsAsap) return false;

                // Schedule conflict check for scheduled requests
                if (req.preferred_start_date) {
                    const newStart = new Date(req.preferred_start_date).getTime();
                    const newEnd = newStart + DEFAULT_JOB_DURATION_HOURS * 3600 * 1000;

                    for (const existing of sellerActiveJobs) {
                        if (existing.preferred_start_date) {
                            const existStart = new Date(existing.preferred_start_date).getTime();
                            const existEnd = existStart + DEFAULT_JOB_DURATION_HOURS * 3600 * 1000;
                            if (newStart < existEnd && newEnd > existStart) return false;
                        }
                    }
                }

                // Radius check
                if (radiusKm != null && radiusKm > 0 && profile.location_lat && profile.location_lng && req.latitude && req.longitude) {
                    const distM = haversineDistance(profile.location_lat, profile.location_lng, req.latitude, req.longitude);
                    if (distM > radiusKm * 1000) return false;
                }

                // Category check
                const catNorm = normalize(req.category || '');
                if (cats.some((c: string) => normalize(c) === catNorm)) return true;
                return pricing.some(
                    (p: any) => (p.enabled || p.available) && (
                        normalize(p.serviceType || '') === catNorm ||
                        normalize(p.category || '') === catNorm
                    )
                );
            });

            if (matched.length === 0) return { dispatched: 0 };

            // 6. Dispatch up to 5 at a time
            const batch = matched.slice(0, 5);
            let dispatched = 0;
            await Promise.all(
                batch.map(async (req: any) => {
                    try {
                        const { error } = await (supabase as any).rpc('start_job_dispatch', {
                            p_job_id: req.id,
                            p_job_type: 'request',
                            p_seller_ids: [user.id],
                            p_wave_size: 1,
                        });
                        if (!error) dispatched++;
                    } catch {
                        // Non-fatal — best effort
                    }
                })
            );

            return { dispatched };
        } catch {
            return { dispatched: 0 };
        }
    };

    return { triggerDispatch, acceptOffer, declineOffer, catchUpDispatch, expireStaleDispatches };
}
