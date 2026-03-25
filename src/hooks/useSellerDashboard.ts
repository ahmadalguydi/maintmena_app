import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { Job, Quote, TrackedItem, Opportunity, BuyerInfo } from '@/types/sellerDashboard';
import { STALE_TIME, GC_TIME } from '@/lib/queryConfig';

const getCoordinatesForLocation = (location: string) => {
    const cityCoords: { [key: string]: { lat: number; lng: number } } = {
        'riyadh': { lat: 24.7136, lng: 46.6753 },
        'jeddah': { lat: 21.4858, lng: 39.1925 },
        'mecca': { lat: 21.3891, lng: 39.8579 },
        'medina': { lat: 24.5247, lng: 39.5692 },
        'dammam': { lat: 26.4207, lng: 50.0888 },
        'khobar': { lat: 26.2172, lng: 50.1971 },
        'dhahran': { lat: 26.2885, lng: 50.1520 },
        'tabuk': { lat: 28.3838, lng: 36.5550 },
        'abha': { lat: 18.2164, lng: 42.5053 },
        'khamis mushait': { lat: 18.3065, lng: 42.7291 },
        'hail': { lat: 27.5114, lng: 41.7208 },
        'najran': { lat: 17.4924, lng: 44.1277 },
        'jubail': { lat: 27.0174, lng: 49.6583 },
        'yanbu': { lat: 24.0891, lng: 38.0618 },
        'taif': { lat: 21.2703, lng: 40.4154 },
        'buraidah': { lat: 26.3260, lng: 43.9750 },
        'dubai': { lat: 25.2048, lng: 55.2708 },
        'abu dhabi': { lat: 24.4539, lng: 54.3773 },
        'sharjah': { lat: 25.3573, lng: 55.4033 },
        'ajman': { lat: 25.4052, lng: 55.5136 },
        'fujairah': { lat: 25.1288, lng: 56.3265 },
        'ras al khaimah': { lat: 25.7897, lng: 55.9433 },
        'al ain': { lat: 24.2075, lng: 55.7447 },
        'cairo': { lat: 30.0444, lng: 31.2357 },
        'alexandria': { lat: 31.2001, lng: 29.9187 },
        'giza': { lat: 30.0131, lng: 31.2089 },
        'sharm el sheikh': { lat: 27.9158, lng: 34.3300 },
        'hurghada': { lat: 27.2579, lng: 33.8116 },
        'luxor': { lat: 25.6872, lng: 32.6396 },
        'aswan': { lat: 24.0889, lng: 32.8998 },
        'amman': { lat: 31.9454, lng: 35.9284 },
        'aqaba': { lat: 29.5321, lng: 35.0063 },
        'irbid': { lat: 32.5556, lng: 35.8500 },
        'zarqa': { lat: 32.0853, lng: 36.0880 },
        'beirut': { lat: 33.8886, lng: 35.4955 },
        'tripoli': { lat: 34.4368, lng: 35.8498 },
        'sidon': { lat: 33.5574, lng: 35.3695 },
        'kuwait city': { lat: 29.3759, lng: 47.9774 },
        'hawalli': { lat: 29.3328, lng: 48.0289 },
        'salmiya': { lat: 29.3336, lng: 48.0753 },
        'manama': { lat: 26.2285, lng: 50.5860 },
        'muharraq': { lat: 26.2572, lng: 50.6119 },
        'doha': { lat: 25.2854, lng: 51.5310 },
        'al wakrah': { lat: 25.1716, lng: 51.5985 },
        'muscat': { lat: 23.5880, lng: 58.3829 },
        'salalah': { lat: 17.0151, lng: 54.0924 },
        'sohar': { lat: 24.3473, lng: 56.7091 },
        'baghdad': { lat: 33.3152, lng: 44.3661 },
        'basra': { lat: 30.5085, lng: 47.7835 },
        'mosul': { lat: 36.3350, lng: 43.1189 },
        'erbil': { lat: 36.1911, lng: 44.0091 },
        'sulaymaniyah': { lat: 35.5558, lng: 45.4375 },
        'casablanca': { lat: 33.5731, lng: -7.5898 },
        'rabat': { lat: 34.0209, lng: -6.8416 },
        'marrakech': { lat: 31.6295, lng: -7.9811 },
        'fes': { lat: 34.0181, lng: -5.0078 },
        'tangier': { lat: 35.7595, lng: -5.8340 },
        'tunis': { lat: 36.8065, lng: 10.1815 },
        'sfax': { lat: 34.7406, lng: 10.7603 },
        'sousse': { lat: 35.8254, lng: 10.6378 },
        'algiers': { lat: 36.7372, lng: 3.0865 },
        'oran': { lat: 35.6976, lng: -0.6337 },
        'constantine': { lat: 36.3650, lng: 6.6147 },
        'tripoli libya': { lat: 32.8872, lng: 13.1913 },
        'benghazi': { lat: 32.1191, lng: 20.0869 },
        'ramallah': { lat: 31.9073, lng: 35.2044 },
        'gaza': { lat: 31.5000, lng: 34.4667 },
        'hebron': { lat: 31.5292, lng: 35.0938 },
        'damascus': { lat: 33.5138, lng: 36.2765 },
        'aleppo': { lat: 36.2021, lng: 37.1343 },
        'sanaa': { lat: 15.3694, lng: 44.1910 },
        'aden': { lat: 12.7855, lng: 45.0187 },
        'remote': { lat: 25.0, lng: 35.0 },
        'online': { lat: 25.0, lng: 35.0 }
    };

    const locationLower = location.toLowerCase();

    if (cityCoords[locationLower]) {
        return cityCoords[locationLower];
    }

    for (const city in cityCoords) {
        if (locationLower.includes(city)) {
            return cityCoords[city];
        }
    }

    return { lat: 25.0, lng: 35.0 };
};

export const useSellerDashboard = () => {
    const { user } = useAuth();
    const { formatAmount } = useCurrency();

    // 1. Fetch User Profile
    const { data: userProfile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['seller-profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await supabase
                .from('profiles')
                .select('full_name, company_name')
                .eq('id', user.id)
                .maybeSingle();
            return data;
        },
        enabled: !!user,
        staleTime: STALE_TIME.STATIC,
        gcTime: GC_TIME.LONG,
    });

    // 1.5 Check Admin Status
    const { data: isAdmin } = useQuery({
        queryKey: ['is-admin', user?.id],
        queryFn: async () => {
            if (!user) return false;
            const { data } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .maybeSingle();
            return !!data;
        },
        enabled: !!user,
        staleTime: STALE_TIME.STATIC,
        gcTime: GC_TIME.LONG,
    });

    // 2. Saved Job IDs — table no longer exists; keep as disabled no-op to avoid network round-trip
    const savedIds: string[] = [];

    // 3. Available Jobs — explicit field list replaces select('*') to reduce payload size
    const { data: availableJobs = [], isLoading: isJobsLoading } = useQuery({
        queryKey: ['available-jobs', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('demands')
                .select('id, title, description, status, created_at, buyer_id, category, location, budget')
                .eq('status', 'draft')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error("fetch AvailableJobs error", error);
                return [];
            }

            return (data || []).map((job: any) => ({
                ...job,
                is_saved: false,
            })) as Job[];
        },
        enabled: !!user,
        staleTime: STALE_TIME.DYNAMIC,
        gcTime: GC_TIME.STANDARD,
    });

    // 4. Saved Jobs — table removed; return stable empty array, no query issued
    const savedJobs: Job[] = [];

    // 5. My Quotes (Now Dispatch Offers) — select only needed columns instead of *
    const { data: myQuotes = [], isLoading: isQuotesLoading } = useQuery({
        queryKey: ['my-quotes', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data: quotesData, error } = await supabase
                .from('job_dispatch_offers')
                .select('id, seller_id, job_id, job_type, offer_status, sent_at, expires_at, demands!job_dispatch_offers_dispatch_session_id_fkey(title, buyer_id)')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("fetch myQuotes error", error);
                return [];
            }

            return (quotesData || []).map((q: any) => ({
                ...q,
                request_title: q.demands?.title,
                unread_messages: 0,
                buyer_info: null,
            })) as Quote[];
        },
        enabled: !!user,
        staleTime: STALE_TIME.DYNAMIC,
        gcTime: GC_TIME.STANDARD,
    });

    // 6–8. Disabled features — return stable constants, no queries issued
    const trackedData = { opportunities: [] as Opportunity[], list: [] as TrackedItem[] };
    const negotiations: any[] = [];
    const bookingRequests: any[] = [];

    const isLoading = isProfileLoading || isJobsLoading || isQuotesLoading;

    return {
        userProfile,
        isAdmin,
        availableJobs,
        savedJobs,
        myQuotes,
        opportunityData: trackedData.opportunities,
        trackedItemsList: trackedData.list,
        negotiations,
        bookingRequests,
        isLoading,
    };
};
