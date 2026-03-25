import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';

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

const PROFILE_SELECT_FULL = `
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
`;

const PROFILE_SELECT_COMPAT = `
  id,
  email,
  full_name,
  phone,
  company_name,
  user_type,
  buyer_type,
  avatar_url,
  created_at,
  updated_at
`;

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

            const selectCandidates = [PROFILE_SELECT_FULL, PROFILE_SELECT_COMPAT];
            let data: any = null;
            let lastError: any = null;

            for (let index = 0; index < selectCandidates.length; index += 1) {
                const selectFields = selectCandidates[index];
                const context = index === 0 ? 'profile-fetch' : `profile-fetch-fallback-${index}`;

                try {
                    data = await executeSupabaseQuery<any>(
                        () => supabase
                            .from('profiles')
                            .select(selectFields)
                            .eq('id', userId)
                            .single(),
                        {
                            context,
                            fallbackData: null,
                            relationName: 'profiles',
                            throwOnError: true,
                        },
                    );
                    lastError = null;
                    break;
                } catch (error: any) {
                    lastError = error;
                    if (error?.code !== '42703' || index === selectCandidates.length - 1) {
                        console.error('[useProfile] Error fetching profile:', error);
                        return null;
                    }
                }
            }

            if (lastError || !data) {
                return null;
            }

            return {
                trust_score: null,
                reliability_rate: null,
                ...data,
            } as Profile;
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
