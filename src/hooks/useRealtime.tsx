import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

interface UseRealtimeOptions {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  invalidateQueries?: string[];
  onPayload?: (payload: RealtimePayload) => void;
}

export const useRealtime = ({
  table,
  event,
  filter,
  invalidateQueries = [],
  onPayload
}: UseRealtimeOptions) => {
  const queryClient = useQueryClient();

  // Use refs for callbacks/arrays to prevent re-subscription on every render
  const invalidateQueriesRef = useRef(invalidateQueries);
  invalidateQueriesRef.current = invalidateQueries;

  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on<Record<string, unknown>>(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          invalidateQueriesRef.current.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          });

          if (onPayloadRef.current) {
            onPayloadRef.current(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Only re-subscribe when connection params change, not callbacks/query keys
  }, [table, event, filter, queryClient]);
};
