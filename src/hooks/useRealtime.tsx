import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealtimeOptions {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  invalidateQueries?: string[];
  onPayload?: (payload: any) => void;
}

export const useRealtime = ({
  table,
  event,
  filter,
  invalidateQueries = [],
  onPayload
}: UseRealtimeOptions) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes' as any,
        {
          event: event,
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {

          // Invalidate specified queries
          invalidateQueries.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          });

          // Custom callback
          if (onPayload) {
            onPayload(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, invalidateQueries, onPayload, queryClient]);
};
