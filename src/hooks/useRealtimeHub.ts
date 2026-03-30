import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getNotificationPresentation, notificationQueryKeys, type AppNotification } from '@/lib/notifications';

type NotificationRow = Pick<AppNotification, 'notification_type' | 'title' | 'message'>;

/**
 * Centralized Realtime Hub
 * 
 * Consolidates all user-specific subscriptions into a single WebSocket connection
 * to prevent connection limit exhaustion at scale.
 * 
 * Tables in Realtime publication: maintenance_requests, job_dispatch_offers, notifications
 */
export function useRealtimeHub() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user) return;

        // Single channel for all user-related events
        const channel = supabase.channel(`user-hub:${user.id}`)
            // ── 1. Notifications ──
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
                    queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });

                    const n = payload.new as NotificationRow | null;
                    if (n?.notification_type) {
                        const lang = (
                            localStorage.getItem('preferredLanguage') ||
                            localStorage.getItem('currentLanguage') ||
                            'ar'
                        ) as 'en' | 'ar';
                        const presentation = getNotificationPresentation(n, lang);
                        toast.info(`${presentation.icon} ${presentation.title}`, {
                            description: presentation.message,
                            duration: 5000,
                        });
                    }
                }
            )
            // ── 2. Maintenance requests — buyer side (requests I created) ──
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'maintenance_requests',
                    filter: `buyer_id=eq.${user.id}`
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
                    queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
                    queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['message-request-scopes', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
                    // Invalidate specific request tracking query
                    const requestId = (payload.new as { id?: string } | null)?.id || (payload.old as { id?: string } | null)?.id;
                    if (requestId) {
                        queryClient.invalidateQueries({ queryKey: ['request-tracking', requestId] });
                        queryClient.invalidateQueries({ queryKey: ['request-detail', requestId] });
                    }
                }
            )
            // ── 3. Maintenance requests — seller side (requests assigned to me) ──
            //    Server-side filter ensures only rows where assigned_seller_id = user.id
            //    are sent over the wire. This includes the moment of assignment (UPDATE
            //    sets assigned_seller_id to user.id) since Supabase matches on the new row.
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'maintenance_requests',
                    filter: `assigned_seller_id=eq.${user.id}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['seller-active-job', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-job-detail'] });
                    queryClient.invalidateQueries({ queryKey: ['message-request-scopes', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
                    const requestId = (payload.new as { id?: string } | null)?.id || (payload.old as { id?: string } | null)?.id;
                    if (requestId) {
                        queryClient.invalidateQueries({ queryKey: ['request-detail', requestId] });
                    }
                }
            )
            // ── 4. Dispatch offers — seller receives new opportunities ──
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'job_dispatch_offers',
                    filter: `seller_id=eq.${user.id}`
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['seller-opportunities', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);
}
