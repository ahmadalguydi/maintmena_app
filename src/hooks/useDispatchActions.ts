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

    /**
     * Find eligible online sellers for a category, rank by distance, and dispatch.
     */
    const triggerDispatch = async (
        jobId: string,
        jobType: 'request' | 'booking',
        category: string,
        buyerLat: number | null,
        buyerLng: number | null,
        waveSize = 3
    ): Promise<DispatchResult> => {
        try {
            // 1. Query ALL sellers who have deliberately set is_online = true.
            //    is_online is a persistent DB column — sellers who toggled online and then
            //    closed the app still have is_online=true until they explicitly go offline.
            //    This means a "logged out" seller who was online IS eligible.
            const { data: sellers, error: sellersError } = await (supabase as any)
                .from('profiles')
                .select('id, location_lat, location_lng, services_pricing, service_categories, is_online, user_type, service_radius_km')
                .eq('user_type', 'seller')   // profiles uses user_type, not role
                .eq('is_online', true);

            if (sellersError) {
                console.error('Error fetching sellers:', sellersError);
                return { sessionId: null, eligibleCount: 0, error: sellersError.message };
            }

            if (!sellers || sellers.length === 0) {
                return { sessionId: null, eligibleCount: 0, error: 'No online sellers found' };
            }

            // 2. Filter by category capability using flexible matching:
            //    - services_pricing[].serviceType  (normalised key)
            //    - service_categories[]            (direct category key array)
            //    Also filter by service_radius_km when buyer location is available.
            const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '_');
            const categoryNorm = normalize(category);

            const eligible = sellers.filter((s: any) => {
                // Service radius check — skip if no buyer location or seller hasn't set a radius
                if (buyerLat != null && buyerLng != null) {
                    const radiusKm: number | null = s.service_radius_km ?? null;
                    if (radiusKm != null && radiusKm > 0 && s.location_lat && s.location_lng) {
                        const distanceM = haversineDistance(buyerLat, buyerLng, s.location_lat, s.location_lng);
                        if (distanceM > radiusKm * 1000) return false;
                    }
                }

                // Check service_categories array (simple string array on the profile)
                const cats: string[] = Array.isArray(s.service_categories)
                    ? s.service_categories.filter(Boolean)
                    : [];
                if (cats.some((c: string) => normalize(c) === categoryNorm)) return true;

                // Check services_pricing (JSONB array — may use { serviceType } or { category })
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

            // 3. Rank by distance (if buyer location is available)
            let ranked: string[];
            if (buyerLat != null && buyerLng != null) {
                ranked = eligible
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
                // No buyer location — shuffle for fairness
                ranked = eligible
                    .map((s: any) => s.id as string)
                    .sort(() => Math.random() - 0.5);
            }

            // 4. Call start_job_dispatch RPC
            if (!jobId) {
                return { sessionId: null, eligibleCount: 0, error: 'Invalid job ID' };
            }
            const { data, error: rpcError } = await (supabase as any).rpc('start_job_dispatch', {
                p_job_id: jobId,
                p_job_type: jobType,
                p_seller_ids: ranked,
                p_wave_size: waveSize,
            });

            if (rpcError) {
                console.error('Dispatch RPC error:', rpcError);
                return { sessionId: null, eligibleCount: 0, error: rpcError.message };
            }

            return {
                sessionId: data as string,
                eligibleCount: Math.min(ranked.length, waveSize),
            };
        } catch (err: any) {
            console.error('triggerDispatch error:', err);
            return { sessionId: null, eligibleCount: 0, error: err.message };
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
                console.error('accept_job_offer RPC error:', error);
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
            console.error('acceptOffer error:', err);
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
                console.error('declineOffer error:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('declineOffer error:', err);
            return false;
        }
    };

    /**
     * Catch-up dispatch for a seller who just came online (or just loaded the app while online).
     * Finds unassigned open requests matching the seller's categories/radius that they haven't
     * received an offer for yet, then fires individual dispatch waves so they can see the jobs.
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
                .select('id, category, latitude, longitude, status')
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

            // 4. Category/radius filter (reuse same logic as triggerDispatch)
            const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '_');
            const cats: string[] = Array.isArray(profile.service_categories)
                ? profile.service_categories.filter(Boolean)
                : [];
            const pricing: any[] = Array.isArray(profile.services_pricing) ? profile.services_pricing : [];
            const radiusKm: number | null = profile.service_radius_km ?? null;

            const matched = requests.filter((req: any) => {
                if (alreadyOfferedIds.has(req.id)) return false;

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

            // 5. Dispatch up to 5 at a time, fire-and-forget individual waves
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

    return { triggerDispatch, acceptOffer, declineOffer, catchUpDispatch };
}
