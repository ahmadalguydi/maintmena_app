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
                .select('id, location_lat, location_lng, services_pricing, service_categories, is_online, user_type')
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
            const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '_');
            const categoryNorm = normalize(category);
            console.log(`[Dispatch] category="${category}" normalised="${categoryNorm}"`);
            console.log(`[Dispatch] Total online sellers: ${sellers.length}`);

            const eligible = sellers.filter((s: any) => {
                // Check service_categories array (simple string array on the profile)
                const cats: string[] = Array.isArray(s.service_categories)
                    ? s.service_categories.filter(Boolean)
                    : [];
                if (cats.some((c: string) => normalize(c) === categoryNorm)) return true;

                // Check services_pricing (JSONB array — may use { serviceType } or { category })
                const pricing: any[] = Array.isArray(s.services_pricing) ? s.services_pricing : [];
                const matchesPricing = pricing.some(
                    (p: any) => (p.enabled || p.available) && (
                        normalize(p.serviceType || '') === categoryNorm ||
                        normalize(p.category || '') === categoryNorm
                    )
                );
                if (!matchesPricing) {
                    console.log(
                        `[Dispatch] Seller ${s.id} rejected: no match.`,
                        { cats, pricingTypes: pricing.map((p: any) => p.serviceType || p.category) }
                    );
                }
                return matchesPricing;
            });

            console.log(`[Dispatch] Eligible sellers: ${eligible.length}`);

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
    const acceptOffer = async (offerId: string, pricing?: any): Promise<AcceptResult> => {
        if (!user?.id) return { accepted: false, error: 'Not authenticated' };

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

    return { triggerDispatch, acceptOffer, declineOffer };
}
