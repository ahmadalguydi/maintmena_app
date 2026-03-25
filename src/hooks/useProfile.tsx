import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    company_name: string | null;
    user_type: string | null;
    buyer_type: string | null;
    avatar_url: string | null;
    trust_score: number | null;
    reliability_rate: number | null;
    created_at: string | null;
    updated_at: string | null;
}

/**
 * Centralized profile hook using React Query.
 * Eliminates stale data flash by:
 * 1. Caching profile data across all components
 * 2. Using staleTime to prevent unnecessary refetches
 * 3. Single source of truth for profile data
 */
export const useProfile = (userId?: string) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['profile', userId],
        queryFn: async (): Promise<Profile | null> => {
            if (!userId) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select(`
          id,
          email,
          full_name,
          phone,
          company_name,
          user_type,
          buyer_type,
          avatar_url,
          trust_score,
          reliability_rate,
          created_at,
          updated_at
        `)
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[useProfile] Error fetching profile:', error);
                return null;
            }

            return data as Profile;
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch flicker
        gcTime: 10 * 60 * 1000, // 10 minutes cache
        refetchOnWindowFocus: false, // Prevent flash on tab switch
    });

    /**
     * Call this after updating profile to refresh cache instantly.
     * Pass new data to update cache immediately (no fetch needed).
     */
    const invalidateProfile = (newData?: Partial<Profile>) => {
        if (newData && userId) {
            // Optimistic update - set data immediately
            queryClient.setQueryData(['profile', userId], (old: Profile | null) => ({
                ...old,
                ...newData,
            }));
        }
        // Also invalidate to refetch in background
        queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    };

    /**
     * Get avatar URL with cache-busting based on updated_at
     */
    const getAvatarUrl = (seed?: string) => {
        if (query.data?.avatar_url) return query.data.avatar_url;
        const avatarSeed = seed || userId;
        const version = query.data?.updated_at || '';
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&v=${version}`;
    };

    return {
        profile: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        invalidateProfile,
        getAvatarUrl,
    };
};
