import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
    id: string;
    full_name: string | null;
    full_name_ar: string | null;
    company_name: string | null;
    avatar_seed: string | null;
    phone: string | null;
    email: string | null;
    verified_seller: boolean | null;
    seller_rating: number | null;
    completed_projects: number | null;
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
          full_name,
          full_name_ar,
          company_name,
          avatar_seed,
          phone,
          email,
          verified_seller,
          seller_rating,
          completed_projects,
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
        const avatarSeed = seed || query.data?.avatar_seed || userId;
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
