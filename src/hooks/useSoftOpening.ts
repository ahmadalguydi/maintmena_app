import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SoftOpeningState {
  /** Whether the platform is currently in soft-opening mode */
  isSoftOpening: boolean;
  /** Whether the current seller gets soft-opening benefits */
  isLoading: boolean;
}

/**
 * Server-controlled soft-opening flag.
 *
 * Reads from `platform_settings` table (key = 'soft_opening_enabled').
 * When enabled, all sellers get professional-tier benefits at 0% fees.
 * Controlled by admin panel — not spoofable via localStorage.
 */
export function useSoftOpening(): SoftOpeningState {
  const { data: isSoftOpening = false, isLoading } = useQuery({
    queryKey: ['platform-settings', 'soft_opening_enabled'],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as import('@supabase/supabase-js').SupabaseClient)
        .from('platform_settings')
        .select('value')
        .eq('key', 'soft_opening_enabled')
        .maybeSingle();

      if (error || !data) return true; // Default to true during launch
      return data.value === 'true' || data.value === true;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return { isSoftOpening, isLoading };
}
